import React, { useState } from "react";
import {
  Container,
  Row,
  Col,
  Form,
  Button,
  Card,
  InputGroup,
} from "react-bootstrap";
import { useNavigate } from "react-router-dom";
import "./AuthPage.css";

const AuthPage = () => {
  // Login
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [showLoginPw, setShowLoginPw] = useState(false);
  const [loadingLogin, setLoadingLogin] = useState(false);

  // Register
  const [registerEmail, setRegisterEmail] = useState("");
  const [registerNickname, setRegisterNickname] = useState("");
  const [registerPassword, setRegisterPassword] = useState("");
  const [showRegPw, setShowRegPw] = useState(false);
  const [loadingRegister, setLoadingRegister] = useState(false);

  const navigate = useNavigate();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoadingLogin(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({ email: loginEmail, password: loginPassword }),
      });
      const data = await response.json();
      if (response.ok) {
        alert(`Login successful! Welcome, ${data.user.nickname}`);
        navigate("/dashboard");
      } else {
        alert(data.message || "Login failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error logging in.");
    } finally {
      setLoadingLogin(false);
    }
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoadingRegister(true);
    try {
      const response = await fetch("http://localhost:5000/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        credentials: "include",
        body: JSON.stringify({
          email: registerEmail,
          nickname: registerNickname,
          password: registerPassword,
        }),
      });
      const data = await response.json();
      if (response.ok) {
        alert("Registered and logged in! Redirecting...");
        navigate("/dashboard");
      } else {
        alert(data.message || "Registration failed.");
      }
    } catch (err) {
      console.error(err);
      alert("Error registering.");
    } finally {
      setLoadingRegister(false);
    }
  };

  return (
    <Container className="auth-container">
      <div className="auth-header">
        <div>
          <h2 className="mb-1">Welcome back 👋</h2>
          <div className="text-muted">
            Sign in or create a new account to start budgeting smarter.
          </div>
        </div>
      </div>

      <Row className="g-4">
        {/* Login */}
        <Col lg={6}>
          <Card className="auth-card">
            <Card.Body>
              <h5 className="section-title mb-3">Login</h5>
              <Form onSubmit={handleLogin}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="you@example.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Password</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showLoginPw ? "text" : "password"}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      required
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowLoginPw((v) => !v)}
                      type="button"
                    >
                      {showLoginPw ? "Hide" : "Show"}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <div className="d-flex justify-content-between align-items-center mb-3">
                  <Form.Check type="checkbox" label="Remember me" />
                  <a
                    className="link-soft"
                    href="#"
                    onClick={(e) => e.preventDefault()}
                  >
                    Forgot password?
                  </a>
                </div>

                <Button className="w-100" type="submit" disabled={loadingLogin}>
                  {loadingLogin ? "Logging in…" : "Login"}
                </Button>
              </Form>
            </Card.Body>
          </Card>
        </Col>

        {/* Register */}
        <Col lg={6}>
          <Card className="auth-card">
            <Card.Body>
              <h5 className="section-title mb-3">Create account</h5>
              <Form onSubmit={handleRegister}>
                <Form.Group className="mb-3">
                  <Form.Label>Email</Form.Label>
                  <Form.Control
                    type="email"
                    placeholder="you@example.com"
                    value={registerEmail}
                    onChange={(e) => setRegisterEmail(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-3">
                  <Form.Label>Nickname</Form.Label>
                  <Form.Control
                    type="text"
                    placeholder="e.g., Alex"
                    value={registerNickname}
                    onChange={(e) => setRegisterNickname(e.target.value)}
                    required
                  />
                </Form.Group>

                <Form.Group className="mb-4">
                  <Form.Label>Password</Form.Label>
                  <InputGroup>
                    <Form.Control
                      type={showRegPw ? "text" : "password"}
                      placeholder="At least 8 characters"
                      value={registerPassword}
                      onChange={(e) => setRegisterPassword(e.target.value)}
                      required
                    />
                    <Button
                      variant="outline-secondary"
                      onClick={() => setShowRegPw((v) => !v)}
                      type="button"
                    >
                      {showRegPw ? "Hide" : "Show"}
                    </Button>
                  </InputGroup>
                </Form.Group>

                <Button
                  className="w-100"
                  variant="success"
                  type="submit"
                  disabled={loadingRegister}
                >
                  {loadingRegister ? "Creating…" : "Register"}
                </Button>
              </Form>

              <div className="tiny muted mt-3">
                By registering, you agree to our{" "}
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Terms
                </a>{" "}
                and{" "}
                <a href="#" onClick={(e) => e.preventDefault()}>
                  Privacy Policy
                </a>
                .
              </div>
            </Card.Body>
          </Card>
        </Col>
      </Row>

      <div className="auth-footer">
        <Button variant="outline-secondary" onClick={() => navigate("/")}>
          ← Back to home
        </Button>
      </div>
    </Container>
  );
};

export default AuthPage;
