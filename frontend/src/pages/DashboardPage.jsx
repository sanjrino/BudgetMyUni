import React, { useEffect, useState } from "react";
import UniMap from "../components/UniMap";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Legend,
  PieChart,
  Pie,
  Cell,
  CartesianGrid,
} from "recharts";

import "./DashboardPage.css";

const format2 = (n) => (Number(n) || 0).toFixed(2);
const round2 = (n) => Math.round((Number(n) || 0) * 100) / 100;
const euro = (n) => `€ ${Number(n).toFixed(2)}`;

const barColors = (name, val) => {
  if (name === "Budget") return "rgba(37,99,235,0.9)";
  if (name === "Spending") return "rgba(245,158,11,0.9)";
  return Number(val) >= 0 ? "rgba(16,185,129,0.9)" : "rgba(239,68,68,0.9)";
};

const yTickEuro = (v) => `€ ${v}`;

const DashboardPage = () => {
  const [profile, setProfile] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [habitsList, setHabitsList] = useState([]);
  const [foodList, setFoodList] = useState([]);

  const safeParseArray = (value) => {
    if (!value) return [];
    try {
      const parsed = typeof value === "string" ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch("http://localhost:5000/api/student/me", {
          credentials: "include",
        });
        const data = await res.json();
        if (res.ok) setProfile(data);
        else alert(data.message || "Could not load profile");

        const uniRes = await fetch("http://localhost:5000/api/university/all");
        setUniversities(await uniRes.json());

        const habitsRes = await fetch("http://localhost:5000/api/habits/all");
        setHabitsList(await habitsRes.json());

        const foodRes = await fetch("http://localhost:5000/api/food/all");
        setFoodList(await foodRes.json());
      } catch (e) {
        console.error("Error fetching:", e);
      }
    };
    fetchData();
  }, []);

  if (!profile) {
    return (
      <div className="bm-container">
        <div className="bm-skeleton">Loading your dashboard…</div>
      </div>
    );
  }

  const getApartmentFromProfile = (p) => {
    if (p?.savedPlaces) {
      let places = [];
      try {
        places =
          typeof p.savedPlaces === "string"
            ? JSON.parse(p.savedPlaces)
            : p.savedPlaces;
      } catch {
        places = [];
      }
      if (Array.isArray(places) && places.length) {
        const chosen = places.find((x) => x.id === "home") || places[0];
        const lat = Number(chosen?.lat);
        const lng = Number(chosen?.lng);
        if (Number.isFinite(lat) && Number.isFinite(lng)) {
          return { lat, lng, name: chosen.name, streetName: chosen.streetName };
        }
      }
    }
    if (profile?.apartmentLat && profile?.apartmentLng) {
      return {
        lat: Number(profile.apartmentLat),
        lng: Number(profile.apartmentLng),
      };
    }
    return null;
  };
  const apartmentPin = getApartmentFromProfile(profile);

  const uniFreq = safeParseArray(profile.universityFrequency);
  const habitsFreq = safeParseArray(profile.habitsFrequency);
  const breakfastFreq = safeParseArray(profile.foodPreferenceBreakfast);
  const lunchFreq = safeParseArray(profile.foodPreferenceLunch);
  const dinnerFreq = safeParseArray(profile.foodPreferenceDinner);

  const uniFreqMap = new Map(
    (uniFreq || []).map((u) => [
      String(u.universityId),
      Number(u.timesPerWeek),
    ]),
  );
  let selectedUniversities = (universities || [])
    .filter((u) => uniFreqMap.has(String(u.id)))
    .map((u) => ({
      ...u,
      lat: Number(u.lat),
      lng: Number(u.lng),
      timesPerWeek: uniFreqMap.get(String(u.id)),
    }));
  if (!selectedUniversities.length && Array.isArray(universities)) {
    selectedUniversities = universities.map((u) => ({
      ...u,
      lat: Number(u.lat),
      lng: Number(u.lng),
    }));
  }

  const budget = round2(profile.budget);
  const spending = round2(profile.totalSpending);
  const difference = round2(budget - spending);
  const barData = [
    { name: "Budget", value: budget },
    { name: "Spending", value: spending },
    { name: "Difference", value: difference },
  ];

  const num = (v) => (v === null || v === undefined ? 0 : Number(v) || 0);
  const rent = num(profile.apartmentPrice);
  const utilities = num(profile.apartmentExpenses);
  const lifestyle = num(profile.expensesLifestyle);
  const transitMonthly = num(profile.expenseCommutePublic);
  const commute = Math.min(transitMonthly, 25);
  const pieData = [
    { name: "Rent", value: rent },
    { name: "Utilities", value: utilities },
    { name: "Lifestyle", value: lifestyle },
    { name: "Commute", value: commute },
  ].filter((d) => d.value > 0);
  const COLORS = ["#4e79a7", "#f28e2b", "#e15759", "#76b7b2"];

  return (
    <>
      <main className="bm-container bm-dash">
        {/* Greeting + KPIs */}
        <section className="bm-grid bm-cols-4">
          <div className="bm-hero-card bm-col-span-4">
            <div>
              <h1>Welcome, {profile.nickname} 👋</h1>
              <p className="bm-muted">Here’s your current month at a glance.</p>
            </div>
          </div>

          <div className="bm-kpi">
            <div className="bm-kpi-label">Monthly Budget</div>
            <div className={`bm-kpi-value`}>€ {format2(profile.budget)}</div>
          </div>
          <div className="bm-kpi">
            <div className="bm-kpi-label">Estimated Spending</div>
            <div className="bm-kpi-value">
              € {format2(profile.totalSpending)}
            </div>
          </div>
          <div className={`bm-kpi ${difference >= 0 ? "ok" : "warn"}`}>
            <div className="bm-kpi-label">Difference</div>
            <div className="bm-kpi-value">€ {format2(difference)}</div>
          </div>
          <div className="bm-kpi">
            <div className="bm-kpi-label">Home</div>
            <div className="bm-kpi-value small">
              {profile.apartmentLocation || "—"}
            </div>
          </div>
        </section>

        {/* Charts */}
        <section className="bm-grid bm-cols-2">
          {/* BAR */}
          <div className="bm-card">
            <div className="bm-card-title">Budget vs Spending</div>
            <div className="chart-wrap">
              <ResponsiveContainer>
                <BarChart
                  data={barData}
                  margin={{ top: 8, right: 16, bottom: 8, left: 0 }}
                  barCategoryGap={20}
                >
                  <CartesianGrid strokeDasharray="3 3" opacity={0.25} />
                  <XAxis dataKey="name" />
                  <YAxis tickFormatter={yTickEuro} />
                  <Tooltip
                    formatter={(value, _name, entry) => [
                      euro(value),
                      entry.payload.name,
                    ]}
                    cursor={{ opacity: 0.08 }}
                  />
                  <Legend />
                  <Bar dataKey="value" name="€" radius={[8, 8, 0, 0]}>
                    {barData.map((d, i) => (
                      <Cell key={i} fill={barColors(d.name, d.value)} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* PIE */}
          <div className="bm-card">
            <div className="bm-card-title">Expense Breakdown</div>
            {pieData.length ? (
              <div className="chart-wrap">
                <ResponsiveContainer>
                  <PieChart>
                    <Tooltip
                      formatter={(value, name) => [euro(value), name]}
                      cursor={{ opacity: 0.08 }}
                    />
                    <Legend />
                    <Pie
                      data={pieData}
                      dataKey="value"
                      nameKey="name"
                      outerRadius={90}
                    >
                      {pieData.map((e, i) => (
                        <Cell
                          key={i}
                          fill={COLORS[i % COLORS.length]}
                          fillOpacity={0.9}
                        />
                      ))}
                    </Pie>
                  </PieChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="bm-muted">No expenses to display yet.</p>
            )}
          </div>
        </section>

        {/* Commute summary */}
        <section className="bm-grid bm-cols-3">
          <div className="bm-card">
            <div className="bm-card-title">Commute – Foot</div>
            <div className="bm-stat">
              Time: <strong>{profile.commuteTimeFoot || 0}</strong> mins
            </div>
          </div>
          <div className="bm-card">
            <div className="bm-card-title">Commute – Bike</div>
            <div className="bm-stat">
              Time: <strong>{profile.commuteTimeBike || 0}</strong> mins
            </div>
          </div>
          <div className="bm-card">
            <div className="bm-card-title">Commute – Public</div>
            <div className="bm-stat">
              Time: <strong>{profile.commuteTimePublic || 0}</strong> mins
            </div>
            {(() => {
              const val = Number(profile.expenseCommutePublic) || 0;
              return (
                <div className="bm-stat">
                  Expense: <strong>€ {format2(val)}</strong>
                  {val > 25 ? (
                    <span className="bm-cap-note">
                      (
                      <a
                        href="https://arriva.si/en/passenger-transport/ijpp/"
                        target="_blank"
                        rel="noopener noreferrer"
                      >
                        25&nbsp;€ if monthly ticket
                      </a>
                      )
                    </span>
                  ) : null}
                </div>
              );
            })()}
          </div>
        </section>

        {/* Food lists */}
        <section className="bm-grid bm-cols-3">
          <div className="bm-card">
            <div className="bm-card-title">Food – Breakfast</div>
            {breakfastFreq.length ? (
              <ul className="bm-list">
                {breakfastFreq.map((it, idx) => {
                  const food = foodList.find((f) => f.id === it.foodId);
                  return (
                    <li key={idx} className="bm-item">
                      <i></i>
                      <span>
                        {food ? food.name : `Unknown ID ${it.foodId}`} —{" "}
                        {it.timesPerWeek}×/week
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="bm-muted">No breakfast preferences.</p>
            )}
          </div>
          <div className="bm-card">
            <div className="bm-card-title">Food – Lunch</div>
            {lunchFreq.length ? (
              <ul className="bm-list">
                {lunchFreq.map((it, idx) => {
                  const food = foodList.find((f) => f.id === it.foodId);
                  return (
                    <li key={idx} className="bm-item">
                      <i></i>
                      <span>
                        {food ? food.name : `Unknown ID ${it.foodId}`} —{" "}
                        {it.timesPerWeek}×/week
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="bm-muted">No lunch preferences.</p>
            )}
          </div>
          <div className="bm-card">
            <div className="bm-card-title">Food – Dinner</div>
            {dinnerFreq.length ? (
              <ul className="bm-list">
                {dinnerFreq.map((it, idx) => {
                  const food = foodList.find((f) => f.id === it.foodId);
                  return (
                    <li key={idx} className="bm-item">
                      <i></i>
                      <span>
                        {food ? food.name : `Unknown ID ${it.foodId}`} —{" "}
                        {it.timesPerWeek}×/week
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="bm-muted">No dinner preferences.</p>
            )}
          </div>
        </section>

        {/* Habits + Universities */}
        <section className="bm-grid bm-cols-2">
          <div className="bm-card">
            <div className="bm-card-title">Habits</div>
            {habitsFreq.length ? (
              <ul className="bm-list">
                {habitsFreq.map((it, idx) => {
                  const habit = habitsList.find((h) => h.id === it.habitId);
                  return (
                    <li key={idx} className="bm-item">
                      <i></i>
                      <span>
                        {habit ? habit.name : `Unknown Habit ${it.habitId}`} —{" "}
                        {it.timesPerWeek}×/week
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="bm-muted">No habits set.</p>
            )}
          </div>

          <div className="bm-card">
            <div className="bm-card-title">Universities & Frequency</div>
            {uniFreq.length ? (
              <ul className="bm-list">
                {uniFreq.map((it, idx) => {
                  const uni = universities.find(
                    (u) => u.id === it.universityId,
                  );
                  return (
                    <li key={idx} className="bm-item">
                      <i></i>
                      <span>
                        {uni ? uni.name : `Unknown ID ${it.universityId}`} —{" "}
                        {it.timesPerWeek}×/week
                      </span>
                    </li>
                  );
                })}
              </ul>
            ) : (
              <p className="bm-muted">No university preferences.</p>
            )}
          </div>
        </section>

        {/* Map */}
        <section className="bm-grid bm-cols-1">
          <div className="bm-card">
            <div className="bm-card-title">Your Map</div>
            <div className="map-wrap">
              <UniMap
                universities={selectedUniversities}
                apartment={apartmentPin}
                routeCoords={[]}
              />
            </div>
          </div>
        </section>
      </main>
    </>
  );
};

export default DashboardPage;
