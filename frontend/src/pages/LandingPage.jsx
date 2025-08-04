import React, { useEffect } from 'react';
import { Container, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const LandingPage = () => {
  const navigate = useNavigate();

  
  const isLoggedIn = localStorage.getItem('isLoggedIn') === 'true';

  useEffect(() => {
    
  }, []);

  return (
    <Container className="mt-5 text-center">
      <h1>Welcome to BudgetMyUni!</h1>
      <p>Estimate and manage your university costs easily.</p>
      <Button variant="primary" onClick={() => navigate('/auth')}>
        Login or Register
      </Button>
    </Container>
  );
};

export default LandingPage;
