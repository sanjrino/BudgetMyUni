import React from "react";
import "bootstrap/dist/css/bootstrap.min.css";
import LandingPage from "./pages/LandingPage";
import AuthPage from "./pages/AuthPage";
import DashboardPage from "./pages/DashboardPage";
import PreferencePage from "./pages/PreferencePage";
import TopNavBar from "./components/TopNavBar";
import ProtectedRoute from "./components/ProtectedRoute";
import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import CommunityPage from "./pages/CommunityPage";

function App() {
  return (
    <Router>
      <TopNavBar />
      <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/auth" element={<AuthPage />} />
        <Route
          path="/dashboard"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />
        <Route
          path="/preferences"
          element={
            <ProtectedRoute>
              <PreferencePage />
            </ProtectedRoute>
          }
        />

        <Route path="/community" element={<CommunityPage />} />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
}

export default App;
