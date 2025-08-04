import React, { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';

const ProtectedRoute = ({ children }) => {
  const navigate = useNavigate();

  useEffect(() => {
    const checkAuth = async () => {
      try {
        const res = await fetch('http://localhost:5000/api/student/me', {
          credentials: 'include'
        });
        if (!res.ok) {
          navigate('/auth'); // redirect to login if not logged in
        }
      } catch (err) {
        console.error(err);
        navigate('/auth');
      }
    };
    checkAuth();
  }, [navigate]);

  return children;
};

export default ProtectedRoute;
