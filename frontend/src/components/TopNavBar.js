import React from "react";
import { Navbar, Nav, Container, Button } from "react-bootstrap";
import { NavLink, useNavigate } from "react-router-dom";
import "./TopNavBar.css";

const TopNavBar = () => {
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      await fetch("http://localhost:5000/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } catch {}
    localStorage.removeItem("isLoggedIn");
    navigate("/");
  };

  return (
    <Navbar expand="lg" className="topbar sticky-top">
      <Container>
        <Navbar.Brand as={NavLink} to="/" className="topbar-brand">
          <span className="topbar-logo"></span> BudgetMyUni
        </Navbar.Brand>

        <Navbar.Toggle aria-controls="main-nav" className="topbar-toggle" />
        <Navbar.Collapse id="main-nav">
          <Nav className="me-auto topbar-nav">
            <NavLink
              to="/dashboard"
              className={({ isActive }) =>
                `topbar-link${isActive ? " active" : ""}`
              }
              end
            >
              Dashboard
            </NavLink>
            <NavLink
              to="/preferences"
              className={({ isActive }) =>
                `topbar-link${isActive ? " active" : ""}`
              }
            >
              Preferences
            </NavLink>
            <NavLink
              to="/community"
              className={({ isActive }) =>
                `topbar-link${isActive ? " active" : ""}`
              }
            >
              Community Tips
            </NavLink>
          </Nav>

          <div className="topbar-actions">
            <Button
              variant="light"
              className="topbar-auth"
              onClick={() => navigate("/auth")}
            >
              Change account
            </Button>
            <Button
              variant="light"
              className="topbar-logout"
              onClick={handleLogout}
            >
              Logout
            </Button>
          </div>
        </Navbar.Collapse>
      </Container>
    </Navbar>
  );
};

export default TopNavBar;
