import React, { useEffect, useState, useCallback } from "react";
import {
  Container,
  Row,
  Col,
  Card,
  Button,
  Form,
  Modal,
  Dropdown,
} from "react-bootstrap";
import "./CommunityPage.css";

const API = "http://localhost:5000/api/tips";

async function readJsonOrThrow(res) {
  const text = await res.text();
  const isJson = (res.headers.get("content-type") || "").includes(
    "application/json",
  );
  if (isJson) {
    const data = text ? JSON.parse(text) : {};
    if (!res.ok)
      throw new Error(data.message || `${res.status} ${res.statusText}`);
    return data;
  }
  throw new Error(text || `${res.status} ${res.statusText}`);
}

export default function CommunityPage() {
  const [tips, setTips] = useState([]);
  const [sortBy, setSortBy] = useState("top");
  const [loading, setLoading] = useState(false);

  const [newTitle, setNewTitle] = useState("");
  const [newBody, setNewBody] = useState("");

  const [replyForId, setReplyForId] = useState(null);
  const [replyBody, setReplyBody] = useState("");

  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [meId, setMeId] = useState(null);

  const [editTip, setEditTip] = useState(null);
  const [showDeleteId, setShowDeleteId] = useState(null);

  const [showLoginPrompt, setShowLoginPrompt] = useState(false);
  const needLogin = () => setShowLoginPrompt(true);

  const fetchTips = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API}?sort=${sortBy}`);
      const json = await readJsonOrThrow(res);
      setTips(Array.isArray(json) ? json : []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [sortBy]);

  useEffect(() => {
    fetchTips();
  }, [fetchTips]);

  useEffect(() => {
    (async () => {
      try {
        const r = await fetch("http://localhost:5000/api/auth/me", {
          credentials: "include",
        });
        const j = await r.json();
        setIsLoggedIn(!!j.loggedIn);
        setMeId(j.user?.id ?? null);
      } catch {
        setIsLoggedIn(false);
        setMeId(null);
      }
    })();
  }, []);

  const handlePostTip = async () => {
    if (!isLoggedIn) return needLogin();
    if (!newTitle.trim() || !newBody.trim()) {
      alert("Please enter a title and tip.");
      return;
    }
    try {
      const res = await fetch(API, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: newTitle.trim(), body: newBody.trim() }),
      });
      await readJsonOrThrow(res);
      setNewTitle("");
      setNewBody("");
      fetchTips();
    } catch (e) {
      alert(e.message);
    }
  };

  const vote = async (tipId, delta) => {
    if (!isLoggedIn) return needLogin();
    try {
      const res = await fetch(`${API}/${tipId}/vote`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ delta }),
      });
      await readJsonOrThrow(res);
      fetchTips();
    } catch (e) {
      alert(e.message);
    }
  };

  const sendReply = async (tipId) => {
    if (!isLoggedIn) return needLogin();
    if (!replyBody.trim()) return alert("Please type a reply.");
    try {
      const res = await fetch(`${API}/${tipId}/replies`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ body: replyBody.trim() }),
      });
      await readJsonOrThrow(res);
      setReplyBody("");
      setReplyForId(null);
      fetchTips();
    } catch (e) {
      alert(e.message);
    }
  };

  const saveEdit = async () => {
    if (!editTip) return;
    try {
      const res = await fetch(`${API}/${editTip.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ title: editTip.title, body: editTip.body }),
      });
      await readJsonOrThrow(res);
      setEditTip(null);
      fetchTips();
    } catch (e) {
      alert(e.message);
    }
  };

  const confirmDelete = async () => {
    if (!showDeleteId) return;
    try {
      const res = await fetch(`${API}/${showDeleteId}`, {
        method: "DELETE",
        credentials: "include",
      });
      await readJsonOrThrow(res);
      setShowDeleteId(null);
      fetchTips();
    } catch (e) {
      alert(e.message);
    }
  };

  return (
    <Container className="mt-4">
      <Row className="align-items-center mb-3">
        <Col>
          <h2>Community Tips</h2>
        </Col>
        <Col className="text-end">
          <Dropdown>
            <Dropdown.Toggle variant="outline-secondary" size="sm">
              Sort: {sortBy === "top" ? "Most Upvoted" : "Newest"}
            </Dropdown.Toggle>
            <Dropdown.Menu>
              <Dropdown.Item
                active={sortBy === "top"}
                onClick={() => setSortBy("top")}
              >
                Most Upvoted
              </Dropdown.Item>
              <Dropdown.Item
                active={sortBy === "new"}
                onClick={() => setSortBy("new")}
              >
                Newest
              </Dropdown.Item>
            </Dropdown.Menu>
          </Dropdown>
        </Col>
      </Row>

      {/* Composer */}
      <Card className="mb-4">
        <Card.Body>
          <Form.Group className="mb-2">
            <Form.Label>Share a budgeting tip</Form.Label>
            <Form.Control
              type="text"
              placeholder="Short title (e.g., Split groceries with roommates)"
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
            />
          </Form.Group>
          <Form.Group className="mb-3">
            <Form.Control
              as="textarea"
              rows={3}
              placeholder="Explain your tip..."
              value={newBody}
              onChange={(e) => setNewBody(e.target.value)}
            />
          </Form.Group>
          <Button onClick={handlePostTip}>Post tip</Button>
          {!isLoggedIn && (
            <div className="text-muted mt-2">
              You’ll need to log in to post.
            </div>
          )}
        </Card.Body>
      </Card>

      {/* Tips */}
      {loading ? (
        <p>Loading…</p>
      ) : tips.length ? (
        tips.map((t) => (
          <Card key={t.id} className="mb-3">
            <Card.Body className="pb-2">
              {/* header: title/author left, actions right */}
              <div className="d-flex justify-content-between align-items-start">
                <div>
                  <h5 className="mb-1">{t.title}</h5>
                  <div className="text-muted small mb-2">
                    by {t.author || "Anonymous"} •{" "}
                    {new Date(t.createdAt).toLocaleString()}
                  </div>
                </div>

                {meId && t.userId === meId && (
                  <div className="d-flex gap-2">
                    <Button
                      size="sm"
                      variant="outline-secondary"
                      onClick={() =>
                        setEditTip({ id: t.id, title: t.title, body: t.body })
                      }
                    >
                      Edit
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => setShowDeleteId(t.id)}
                    >
                      Delete
                    </Button>
                  </div>
                )}
              </div>

              {/* body */}
              <div className="mt-2">{t.body}</div>

              {/* replies */}
              {Array.isArray(t.replies) && t.replies.length > 0 && (
                <div className="p-2 bg-light rounded mt-3">
                  {t.replies.map((r) => (
                    <div key={r.id} className="mb-2">
                      <div className="small text-muted">
                        {r.author || "User"} •{" "}
                        {new Date(r.createdAt).toLocaleString()}
                      </div>
                      <div>{r.body}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* footer: reply left, vote right */}
              <div className="d-flex justify-content-between align-items-end mt-3 pt-2 border-top">
                <div className="me-3" style={{ flex: 1 }}>
                  {replyForId === t.id ? (
                    <>
                      <Form.Control
                        as="textarea"
                        rows={2}
                        placeholder="Write a reply"
                        value={replyBody}
                        onChange={(e) => setReplyBody(e.target.value)}
                      />
                      <div className="mt-2 d-flex gap-2">
                        <Button size="sm" onClick={() => sendReply(t.id)}>
                          Reply
                        </Button>
                        <Button
                          size="sm"
                          variant="outline-secondary"
                          onClick={() => {
                            setReplyForId(null);
                            setReplyBody("");
                          }}
                        >
                          Cancel
                        </Button>
                      </div>
                    </>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline-primary"
                      onClick={() =>
                        isLoggedIn ? setReplyForId(t.id) : needLogin()
                      }
                    >
                      Reply
                    </Button>
                  )}
                </div>

                <div className="text-end">
                  <div className="mb-1">
                    <strong>{(t.upvotes || 0) - (t.downvotes || 0)}</strong>{" "}
                    score
                  </div>
                  <div className="d-flex justify-content-end gap-2">
                    <Button
                      size="sm"
                      variant="outline-success"
                      onClick={() => vote(t.id, +1)}
                    >
                      👍
                    </Button>
                    <Button
                      size="sm"
                      variant="outline-danger"
                      onClick={() => vote(t.id, -1)}
                    >
                      👎
                    </Button>
                  </div>
                  {!isLoggedIn && (
                    <div className="text-muted small mt-1">Login to vote</div>
                  )}
                </div>
              </div>
            </Card.Body>
          </Card>
        ))
      ) : (
        <p>No tips yet. Be the first to share!</p>
      )}

      {/* edit modal */}
      <Modal show={!!editTip} onHide={() => setEditTip(null)} centered>
        <Modal.Header closeButton>
          <Modal.Title>Edit tip</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Form.Group className="mb-2">
            <Form.Label>Title</Form.Label>
            <Form.Control
              value={editTip?.title || ""}
              onChange={(e) =>
                setEditTip((et) => ({ ...et, title: e.target.value }))
              }
            />
          </Form.Group>
          <Form.Group>
            <Form.Label>Body</Form.Label>
            <Form.Control
              as="textarea"
              rows={3}
              value={editTip?.body || ""}
              onChange={(e) =>
                setEditTip((et) => ({ ...et, body: e.target.value }))
              }
            />
          </Form.Group>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setEditTip(null)}>
            Cancel
          </Button>
          <Button onClick={saveEdit}>Save</Button>
        </Modal.Footer>
      </Modal>

      {/* delete modal */}
      <Modal
        show={!!showDeleteId}
        onHide={() => setShowDeleteId(null)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Delete tip</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          Are you sure you want to delete this tip? This cannot be undone.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowDeleteId(null)}>
            Cancel
          </Button>
          <Button variant="danger" onClick={confirmDelete}>
            Delete
          </Button>
        </Modal.Footer>
      </Modal>

      {/* soft login modal */}
      <Modal
        show={showLoginPrompt}
        onHide={() => setShowLoginPrompt(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>Login required</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          You need to log in to do that. You can keep browsing freely.
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowLoginPrompt(false)}>
            Close
          </Button>
        </Modal.Footer>
      </Modal>
    </Container>
  );
}
