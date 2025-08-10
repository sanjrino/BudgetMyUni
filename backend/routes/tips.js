const express = require('express');
const router = express.Router();
const db = require('../db');

function requireAuth(req, res, next) {
  if (!req.session || !req.session.userId) {
    return res.status(401).json({ message: 'Not logged in' });
  }
  next();
}

function requireOwner(req, res, next) {
  const userId = req.session.userId;
  const tipId = parseInt(req.params.id, 10);
  if (!tipId) return res.status(400).json({ message: 'Bad id' });

  db.query('SELECT userId FROM tips WHERE id=?', [tipId], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    if (rows[0].userId !== userId) return res.status(403).json({ message: 'Forbidden' });
    next();
  });
}

router.put('/:id', requireAuth, requireOwner, (req, res) => {
  const tipId = parseInt(req.params.id, 10);
  const { title, body } = req.body || {};
  if (!title || !body) return res.status(400).json({ message: 'Title and body required' });

  const sql = `UPDATE tips SET title=?, body=?, updatedAt=NOW() WHERE id=?`;
  db.query(sql, [title.trim(), body.trim(), tipId], (err) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.json({ ok: true });
  });
});

router.delete('/:id', requireAuth, requireOwner, (req, res) => {
  const tipId = parseInt(req.params.id, 10);

  db.beginTransaction((errT, tx) => {
    if (errT) return res.status(500).json({ message: 'TX error' });

    const rollback = (msg) => tx.rollback(() => res.status(500).json({ message: msg || 'DB error' }));

    tx.query('DELETE FROM tip_replies WHERE tipId=?', [tipId], (e1) => {
      if (e1) return rollback('Delete replies failed');

      tx.query('DELETE FROM tip_votes WHERE tipId=?', [tipId], (e2) => {
        if (e2) return rollback('Delete votes failed');

        tx.query('DELETE FROM tips WHERE id=?', [tipId], (e3) => {
          if (e3) return rollback('Delete tip failed');

          tx.commit((eC) => {
            if (eC) return res.status(500).json({ message: 'Commit failed' });
            res.json({ ok: true });
          });
        });
      });
    });
  });
});


router.post('/', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const { title, body } = req.body || {};
  if (!title || !body) return res.status(400).json({ message: 'Title and body required' });

  db.query(
    'INSERT INTO tips (userId, title, body) VALUES (?,?,?)',
    [userId, title.trim(), body.trim()],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json({ id: result.insertId, userId, title, body, upvotes: 0, downvotes: 0 });
    }
  );
});


router.get('/', (req, res) => {
  const me = req.session?.userId || 0;
  const sort = (req.query.sort || 'top').toLowerCase();
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '20', 10), 1), 50);
  const offset = (page - 1) * limit;

  const orderBy =
    sort === 'new'
      ? 't.createdAt DESC'
      : '(t.upvotes - t.downvotes) DESC, t.createdAt DESC';

  const baseSql = `
    SELECT
      t.id, t.userId, t.title, t.body, t.upvotes, t.downvotes,
      t.createdAt, t.updatedAt,
      u.nickname AS author,
      COALESCE(v.vote, 0) AS myVote
    FROM tips t
    JOIN users u ON u.id = t.userId
    LEFT JOIN tip_votes v ON v.tipId = t.id AND v.userId = ?
    ORDER BY ${orderBy}
    LIMIT ? OFFSET ?
  `;

  db.query(baseSql, [me, limit, offset], (err, tips) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (!tips.length) return res.json([]);

    const tipIds = tips.map(t => t.id);
    const qMarks = tipIds.map(() => '?').join(',');
    const repSql = `
      SELECT r.id, r.tipId, r.userId, r.body, r.createdAt, u.nickname AS author
      FROM tip_replies r
      JOIN users u ON u.id = r.userId
      WHERE r.tipId IN (${qMarks})
      ORDER BY r.createdAt ASC
    `;
    db.query(repSql, tipIds, (err2, replies) => {
      if (err2) return res.status(500).json({ message: 'DB error' });
      const byTip = new Map();
      for (const id of tipIds) byTip.set(id, []);
      for (const r of replies) byTip.get(r.tipId).push(r);
      const out = tips.map(t => ({ ...t, replies: byTip.get(t.id) || [] }));
      res.json(out);
    });
  });
});


router.get('/:id', (req, res) => {
  const me = req.session?.userId || 0;
  const { id } = req.params;

  const sql = `
    SELECT
      t.id, t.userId, t.title, t.body, t.upvotes, t.downvotes, t.createdAt, t.updatedAt,
      u.nickname AS author,
      COALESCE(v.vote, 0) AS myVote
    FROM tips t
    JOIN users u ON u.id = t.userId
    LEFT JOIN tip_votes v ON v.tipId = t.id AND v.userId = ?
    WHERE t.id = ?
  `;
  db.query(sql, [me, id], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    if (!rows.length) return res.status(404).json({ message: 'Not found' });
    res.json(rows[0]);
  });
});


router.post('/:id/vote', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const tipId  = Number(req.params.id);
  const delta  = Number(req.body.delta);

  if (!tipId || ![1, -1].includes(delta)) {
    return res.status(400).json({ message: 'Bad vote' });
  }

  db.beginTransaction((errT, tx) => {
    if (errT) return res.status(500).json({ message: 'Tx begin' });

    const rollback = (msg) =>
      tx.rollback(() => res.status(500).json({ message: msg || 'DB error' }));

    const sel = 'SELECT vote FROM tip_votes WHERE tipId=? AND userId=? FOR UPDATE';
    tx.query(sel, [tipId, userId], (errSel, rows) => {
      if (errSel) return rollback('Select failed');

      const had = rows.length ? Number(rows[0].vote) : 0;

      if (had === delta) {
        return tx.commit((errC) => {
          if (errC) return res.status(500).json({ message: 'Commit failed' });
          return res.json({ ok: true });
        });
      }

      let upDelta = 0, downDelta = 0;
      if (had === 0)        { if (delta === 1) upDelta = 1; else downDelta = 1; }
      else if (had === 1)   { if (delta === -1) { upDelta = -1; downDelta = 1; } }
      else if (had === -1)  { if (delta ===  1) { downDelta = -1; upDelta = 1; } }

      const upd = 'UPDATE tips SET upvotes = upvotes + ?, downvotes = downvotes + ? WHERE id=?';
      tx.query(upd, [upDelta, downDelta, tipId], (errUpd) => {
        if (errUpd) return rollback('Counters failed');

        const ins = `
          INSERT INTO tip_votes (tipId, userId, vote)
          VALUES (?,?,?)
          ON DUPLICATE KEY UPDATE vote = VALUES(vote)
        `;
        tx.query(ins, [tipId, userId, delta], (errIns) => {
          if (errIns) return rollback('Vote save failed');

          tx.commit((errC) => {
            if (errC) return res.status(500).json({ message: 'Commit failed' });
            return res.json({ ok: true });
          });
        });
      });
    });
  });
});


router.post('/:id/replies', requireAuth, (req, res) => {
  const userId = req.session.userId;
  const tipId = parseInt(req.params.id, 10);
  const body = (req.body?.body || '').trim();
  if (!tipId || !body) return res.status(400).json({ message: 'Body required' });

  db.query(
    'INSERT INTO tip_replies (tipId, userId, body) VALUES (?,?,?)',
    [tipId, userId, body],
    (err, result) => {
      if (err) return res.status(500).json({ message: 'DB error' });
      res.json({
        id: result.insertId,
        tipId,
        userId,
        body,
        author: req.session.nickname || 'You',
        createdAt: new Date()
      });
    }
  );
});


router.get('/:id/replies', (req, res) => {
  const { id } = req.params;
  const page = Math.max(parseInt(req.query.page || '1', 10), 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit || '50', 10), 1), 100);
  const offset = (page - 1) * limit;

  const sql = `
    SELECT r.id, r.tipId, r.userId, r.body, r.createdAt, u.nickname AS author
    FROM tip_replies r
    JOIN users u ON u.id = r.userId
    WHERE r.tipId = ?
    ORDER BY r.createdAt ASC
    LIMIT ? OFFSET ?
  `;
  db.query(sql, [id, limit, offset], (err, rows) => {
    if (err) return res.status(500).json({ message: 'DB error' });
    res.json(rows);
  });
});

module.exports = router;
