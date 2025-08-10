import React from "react";
import { useNavigate } from "react-router-dom";
import "./LandingPage.css";

const LandingPage = () => {
  const navigate = useNavigate();

  return (
    <>
      {/* HERO */}
      <section className="bm-container" style={{ paddingTop: 24 }}>
        <div className="bm-hero">
          <h1>Money made manageable for students.</h1>
          <p>
            Plan housing, food, transport and lifestyle in one place. Built for
            students by students.
          </p>
          <div className="bm-hero-cta">
            <button className="bm-btn" onClick={() => navigate("/auth")}>
              Create account
            </button>
          </div>
        </div>
      </section>

      {/* ABOUT */}
      <section id="about" className="bm-container">
        <h2>Why BudgetMyUni?</h2>
        <div className="bm-grid bm-cols-3">
          <div className="bm-card">
            <h3>The Issue</h3>
            <p className="bm-muted">
              Students face tight budgets and surprise costs when moving to
              university. Stress from money impacts study results and social
              life.
            </p>
          </div>
          <div className="bm-card">
            <h3>Where it happens</h3>
            <p className="bm-muted">
              New environments like Koper’s coastal campuses bring fresh
              routines: rent, food, transit, admin fees. These are easy to
              overlook without a plan.
            </p>
          </div>
          <div className="bm-card">
            <h3>Who it affects</h3>
            <p className="bm-muted">
              Students first, but also friends and families. Universities
              benefit too: lower stress can improve academic performance and
              retention.
            </p>
          </div>
        </div>
      </section>

      {/* HOW IT WORKS */}
      <section id="how" className="bm-container">
        <h2>How it works</h2>
        <div className="bm-grid bm-cols-3">
          <div className="bm-card">
            <strong>1) Tell us your basics</strong>
            <ul className="bm-list">
              <li className="bm-item">
                <i></i>
                <span>Pick a home: dorm or address</span>
              </li>
              <li className="bm-item">
                <i></i>
                <span>Choose food & habit frequencies</span>
              </li>
              <li className="bm-item">
                <i></i>
                <span>Set commute (walk, bike, bus)</span>
              </li>
            </ul>
          </div>
          <div className="bm-card">
            <strong>2) We estimate your monthly budget</strong>
            <ul className="bm-list">
              <li className="bm-item">
                <i></i>
                <span>Rent, food, lifestyle, transport</span>
              </li>
              <li className="bm-item">
                <i></i>
                <span>Charts and clear breakdowns</span>
              </li>
            </ul>
          </div>
          <div className="bm-card">
            <strong>3) Adjust & improve</strong>
            <ul className="bm-list">
              <li className="bm-item">
                <i></i>
                <span>Try scenarios (move, cook more, bike)</span>
              </li>
              <li className="bm-item">
                <i></i>
                <span>Share & learn in Community Tips</span>
              </li>
            </ul>
          </div>
        </div>
      </section>

      {/* START */}
      <section id="start" className="bm-container">
        <h2>Ready to plan smarter?</h2>
        <div className="bm-card bm-start">
          <p className="bm-muted">
            Set a budget, choose your home base, add food & habit frequencies,
            and see a transparent monthly plan. You can refine it anytime.
          </p>
          <div className="bm-start-actions">
            <button className="bm-btn" onClick={() => navigate("/auth")}>
              Create account
            </button>
            <button
              className="bm-btn ghost"
              onClick={() => navigate("/community")}
            >
              Explore community tips
            </button>
          </div>
        </div>
      </section>
    </>
  );
};

export default LandingPage;
