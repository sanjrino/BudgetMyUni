const db = require('../db');

const MONTH_FACTOR = Number(process.env.MONTH_FACTOR || 4.33);

function round2(n) {
  const x = Number(n) || 0;
  return Math.round((x + Number.EPSILON) * 100) / 100;
}

function safeParseArray(value) {
  if (!value) return [];
  try {
    const v = typeof value === 'string' ? JSON.parse(value) : value;
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

function q(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.query(sql, params, (err, rows) => (err ? reject(err) : resolve(rows)));
  });
}


async function recalcTotalsForUser(userId) {
  const rows = await q(
    `SELECT *
       FROM students
      WHERE userId = ?`,
    [userId]
  );
  if (!rows.length) return;

  const s = rows[0];

  const breakfast = safeParseArray(s.foodPreferenceBreakfast);
  const lunch     = safeParseArray(s.foodPreferenceLunch);
  const dinner    = safeParseArray(s.foodPreferenceDinner);
  const habits    = safeParseArray(s.habitsFrequency);

  const foodRows   = await q('SELECT id, price FROM food');
  const habitRows  = await q('SELECT id, price FROM habits');

  const foodPrice  = new Map(foodRows.map(r => [String(r.id), Number(r.price) || 0]));
  const habitPrice = new Map(habitRows.map(r => [String(r.id), Number(r.price) || 0]));

  const weeklyFoodCost =
    [...breakfast, ...lunch, ...dinner].reduce((sum, item) => {
      const id    = String(item.foodId ?? item.id ?? '');
      const times = Number(item.timesPerWeek) || 0;
      const price = foodPrice.get(id) ?? 0;
      return sum + times * price;
    }, 0);

  const weeklyHabitsCost =
    habits.reduce((sum, h) => {
      const id    = String(h.habitId ?? h.id ?? '');
      const times = Number(h.timesPerWeek) || 0;
      const price = habitPrice.get(id) ?? 0;
      return sum + times * price;
    }, 0);

  const foodMonthly   = round2(weeklyFoodCost * MONTH_FACTOR);
  const habitsMonthly = round2(weeklyHabitsCost * MONTH_FACTOR);

  const rent       = Number(s.apartmentPrice)    || 0;
  const utilities  = Number(s.apartmentExpenses) || 0;
  const includePT  = ('includeCommutePublic' in s)
    ? Boolean(s.includeCommutePublic)
    : true; 
  const ptMonthly  = includePT ? (Number(s.expenseCommutePublic) || 0) : 0;

  const expensesLifestyle = round2(foodMonthly + habitsMonthly);
  const totalExpenses     = round2(rent + utilities + ptMonthly);
  const totalSpending     = round2(totalExpenses + expensesLifestyle);

  await q(
    `UPDATE students
        SET expensesLifestyle = ?,
            totalExpenses     = ?,
            totalSpending     = ?
      WHERE userId = ?`,
    [expensesLifestyle, totalExpenses, totalSpending, userId]
  );

  console.log(
    `recalcTotalsForUser(${userId}) => lifestyle=${expensesLifestyle}, housing+commute=${totalExpenses}, total=${totalSpending}`
  );

  return { expensesLifestyle, totalExpenses, totalSpending };
}

module.exports = { recalcTotalsForUser };
