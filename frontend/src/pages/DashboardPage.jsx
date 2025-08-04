import React, { useEffect, useState } from 'react';
import { Container, Row, Col, Card, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';

const DashboardPage = () => {
  const [profile, setProfile] = useState(null);
  const [universities, setUniversities] = useState([]);
  const [habitsList, setHabitsList] = useState([]);
  const [foodList, setFoodList] = useState([]);
  const navigate = useNavigate();

  const safeParseArray = (value) => {
    if (!value) return [];
    try {
      const parsed = typeof value === 'string' ? JSON.parse(value) : value;
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  };

  useEffect(() => {
    const fetchData = async () => {
      try {
        const response = await fetch('http://localhost:5000/api/student/me', {
          credentials: 'include'
        });
        const data = await response.json();

        if (response.ok) {
          setProfile(data);
        } else {
          alert(data.message || 'Could not load profile');
        }

        // Load lookup lists
        const uniRes = await fetch('http://localhost:5000/api/university/all');
        setUniversities(await uniRes.json());

        const habitsRes = await fetch('http://localhost:5000/api/habits/all');
        setHabitsList(await habitsRes.json());

        const foodRes = await fetch('http://localhost:5000/api/food/all');
        setFoodList(await foodRes.json());

      } catch (error) {
        console.error('Error fetching:', error);
      }
    };

    fetchData();
  }, []);

  if (!profile) return <Container>Loading...</Container>;

  const uniFreq = safeParseArray(profile.universityFrequency);
  const habitsFreq = safeParseArray(profile.habitsFrequency);

  const breakfastFreq = safeParseArray(profile.foodPreferenceBreakfast);
  const lunchFreq = safeParseArray(profile.foodPreferenceLunch);
  const dinnerFreq = safeParseArray(profile.foodPreferenceDinner);

  return (
    <Container className="mt-5">
      <div className="d-flex justify-content-between align-items-center">
        <h1>Welcome, {profile.nickname}!</h1>
        <Button onClick={() => navigate('/preferences')}>Edit Preferences</Button>
      </div>

      {/* BUDGET + APARTMENT */}
      <Row className="mt-4">
        <Col md={4}>
          <Card body>
            <h5>Monthly Budget</h5>
            <p>€ {profile.budget}</p>
          </Card>
        </Col>
        <Col md={4}>
          <Card body>
            <h5>Total Estimated Spending</h5>
            <p>€ {profile.totalSpending}</p>
          </Card>
        </Col>
        <Col md={4}>
          <Card body>
            <h5>Apartment</h5>
            <p>Location: {profile.apartmentLocation}</p>
            <p>Rent: € {profile.apartmentPrice}</p>
            <p>Expenses: € {profile.apartmentExpenses}</p>
          </Card>
        </Col>
      </Row>

      {/* COMMUTE */}
      <Row className="mt-4">
        <Col md={4}><Card body><h5>Commute - Foot</h5><p>Time: {profile.commuteTimeFoot} mins</p><p>Expense: € {profile.expenseCommuteFoot}</p></Card></Col>
        <Col md={4}><Card body><h5>Commute - Bike</h5><p>Time: {profile.commuteTimeBike} mins</p><p>Expense: € {profile.expenseCommuteBike}</p></Card></Col>
        <Col md={4}><Card body><h5>Commute - Public</h5><p>Time: {profile.commuteTimePublic} mins</p><p>Expense: € {profile.expenseCommutePublic}</p></Card></Col>
      </Row>

      {/* FOOD */}
      <Row className="mt-4">
        <Col md={4}>
          <Card body>
            <h5>Food - Breakfast</h5>
            {breakfastFreq.length > 0 ? (
              <ul>
                {breakfastFreq.map((item, idx) => {
                  const food = foodList.find(f => f.id === item.foodId);
                  return (
                    <li key={idx}>
                      {food ? food.name : `Unknown ID ${item.foodId}`}: {item.timesPerWeek}x/week
                    </li>
                  );
                })}
              </ul>
            ) : <p>No Breakfast Preferences</p>}
          </Card>
        </Col>
        <Col md={4}>
          <Card body>
            <h5>Food - Lunch</h5>
            {lunchFreq.length > 0 ? (
              <ul>
                {lunchFreq.map((item, idx) => {
                  const food = foodList.find(f => f.id === item.foodId);
                  return (
                    <li key={idx}>
                      {food ? food.name : `Unknown ID ${item.foodId}`}: {item.timesPerWeek}x/week
                    </li>
                  );
                })}
              </ul>
            ) : <p>No Lunch Preferences</p>}
          </Card>
        </Col>
        <Col md={4}>
          <Card body>
            <h5>Food - Dinner</h5>
            {dinnerFreq.length > 0 ? (
              <ul>
                {dinnerFreq.map((item, idx) => {
                  const food = foodList.find(f => f.id === item.foodId);
                  return (
                    <li key={idx}>
                      {food ? food.name : `Unknown ID ${item.foodId}`}: {item.timesPerWeek}x/week
                    </li>
                  );
                })}
              </ul>
            ) : <p>No Dinner Preferences</p>}
          </Card>
        </Col>
      </Row>

      {/* HABITS */}
      <Row className="mt-4">
        <Col md={6}>
          <Card body>
            <h5>Habits</h5>
            {habitsFreq.length > 0 ? (
              <ul>
                {habitsFreq.map((item, idx) => {
                  const habit = habitsList.find(h => h.id === item.habitId);
                  return (
                    <li key={idx}>
                      {habit ? habit.name : `Unknown Habit ID ${item.habitId}`}:
                      {item.timesPerWeek}x/week
                    </li>
                  );
                })}
              </ul>
            ) : <p>No habits set.</p>}
          </Card>
        </Col>
      </Row>

      {/* UNIVERSITIES */}
      <Row className="mt-4">
        <Col md={12}>
          <Card body>
            <h5>University & Frequency</h5>
            {uniFreq.length > 0 ? (
              <ul>
                {uniFreq.map((item, idx) => {
                  const uni = universities.find(u => u.id === item.universityId);
                  return (
                    <li key={idx}>
                      {uni ? uni.name : `Unknown ID ${item.universityId}`}:
                      {item.timesPerWeek}x/week
                    </li>
                  );
                })}
              </ul>
            ) : <p>No university preferences set.</p>}
          </Card>
        </Col>
      </Row>

      {/* LIFESTYLE */}
      <Row className="mt-4">
        <Col md={6}>
          <Card body>
            <h5>Lifestyle Expenses</h5>
            <p>€ {profile.expensesLifestyle}</p>
          </Card>
        </Col>
      </Row>
    </Container>
  );
};

export default DashboardPage;
