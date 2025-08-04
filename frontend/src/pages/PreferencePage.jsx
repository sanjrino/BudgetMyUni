import React, { useState, useEffect } from 'react';
import { Container, Form, Button, Row, Col } from 'react-bootstrap';

const PreferencePage = () => {
  const [budget, setBudget] = useState('');
  const [apartmentLocation, setApartmentLocation] = useState('');
  const [apartmentPrice, setApartmentPrice] = useState('');
  const [apartmentExpenses, setApartmentExpenses] = useState('');

  const [foodOptions, setFoodOptions] = useState([]);
  const [foodFrequency, setFoodFrequency] = useState({
    breakfast: [{ foodId: '', timesPerWeek: '' }],
    lunch: [{ foodId: '', timesPerWeek: '' }],
    dinner: [{ foodId: '', timesPerWeek: '' }]
  });

  const [universities, setUniversities] = useState([]);
  const [universityFrequency, setUniversityFrequency] = useState([{ universityId: '', timesPerWeek: '' }]);

  const [habitsList, setHabitsList] = useState([]);
  const [habitsFrequency, setHabitsFrequency] = useState([{ habitId: '', timesPerWeek: '' }]);

  useEffect(() => {
    const fetchAll = async () => {
      const res = await fetch('http://localhost:5000/api/student/me', { credentials: 'include' });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Not logged in');
        return;
      }

      setBudget(data.budget || '');
      setApartmentLocation(data.apartmentLocation || '');
      setApartmentPrice(data.apartmentPrice || '');
      setApartmentExpenses(data.apartmentExpenses || '');

      const parseMeal = (meal) => {
        try {
          const parsed = JSON.parse(data[meal]);
          return Array.isArray(parsed)
            ? parsed.map(f => ({
                foodId: String(f.foodId ?? ''),  // force foodId to string
                timesPerWeek: f.timesPerWeek
              }))
            : [{ foodId: '', timesPerWeek: '' }];
        } catch {
          return [{ foodId: '', timesPerWeek: '' }];
        }
      };

      setFoodFrequency({
        breakfast: data.foodPreferenceBreakfast ? parseMeal('foodPreferenceBreakfast') : [{ foodId: '', timesPerWeek: '' }],
        lunch: data.foodPreferenceLunch ? parseMeal('foodPreferenceLunch') : [{ foodId: '', timesPerWeek: '' }],
        dinner: data.foodPreferenceDinner ? parseMeal('foodPreferenceDinner') : [{ foodId: '', timesPerWeek: '' }]
      });

      if (data.universityFrequency) {
        try {
          const parsed = typeof data.universityFrequency === 'string'
            ? JSON.parse(data.universityFrequency)
            : data.universityFrequency;
          setUniversityFrequency(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          setUniversityFrequency([{ universityId: '', timesPerWeek: '' }]);
        }
      }

      if (data.habitsFrequency) {
        try {
          const parsed = typeof data.habitsFrequency === 'string'
            ? JSON.parse(data.habitsFrequency)
            : data.habitsFrequency;
          setHabitsFrequency(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          setHabitsFrequency([{ habitId: '', timesPerWeek: '' }]);
        }
      }

      const uniRes = await fetch('http://localhost:5000/api/university/all');
      setUniversities(await uniRes.json());

      const habitsRes = await fetch('http://localhost:5000/api/habits/all');
      setHabitsList(await habitsRes.json());

      const foodRes = await fetch('http://localhost:5000/api/food/all');
      const foodData = await foodRes.json();
      setFoodOptions(foodData);

      // 🔍 Log for debugging:
      console.log('Food Options:', foodData);
      console.log('Food Frequency:', {
        breakfast: data.foodPreferenceBreakfast ? parseMeal('foodPreferenceBreakfast') : [],
        lunch: data.foodPreferenceLunch ? parseMeal('foodPreferenceLunch') : [],
        dinner: data.foodPreferenceDinner ? parseMeal('foodPreferenceDinner') : []
      });
    };

    fetchAll();
  }, []);

  const addRow = (meal) => {
    setFoodFrequency({
      ...foodFrequency,
      [meal]: [...foodFrequency[meal], { foodId: '', timesPerWeek: '' }]
    });
  };

  const handleFoodChange = (meal, index, field, value) => {
    const updated = [...foodFrequency[meal]];
    updated[index][field] = value;
    setFoodFrequency({ ...foodFrequency, [meal]: updated });
  };

  const addUniversityRow = () => setUniversityFrequency([...universityFrequency, { universityId: '', timesPerWeek: '' }]);
  const handleUniChange = (index, field, value) => {
    const updated = [...universityFrequency];
    updated[index][field] = value;
    setUniversityFrequency(updated);
  };

  const addHabitRow = () => setHabitsFrequency([...habitsFrequency, { habitId: '', timesPerWeek: '' }]);
  const handleHabitChange = (index, field, value) => {
    const updated = [...habitsFrequency];
    updated[index][field] = value;
    setHabitsFrequency(updated);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const payload = {
      budget,
      apartmentLocation,
      apartmentPrice,
      apartmentExpenses,
      foodPreferenceBreakfast: JSON.stringify(
        foodFrequency.breakfast.filter(f => f.foodId && f.timesPerWeek).map(f => ({
          foodId: parseInt(f.foodId), timesPerWeek: parseInt(f.timesPerWeek)
        }))
      ),
      foodPreferenceLunch: JSON.stringify(
        foodFrequency.lunch.filter(f => f.foodId && f.timesPerWeek).map(f => ({
          foodId: parseInt(f.foodId), timesPerWeek: parseInt(f.timesPerWeek)
        }))
      ),
      foodPreferenceDinner: JSON.stringify(
        foodFrequency.dinner.filter(f => f.foodId && f.timesPerWeek).map(f => ({
          foodId: parseInt(f.foodId), timesPerWeek: parseInt(f.timesPerWeek)
        }))
      ),
      universityFrequency: JSON.stringify(
        universityFrequency.filter(u => u.universityId && u.timesPerWeek).map(u => ({
          universityId: parseInt(u.universityId), timesPerWeek: parseInt(u.timesPerWeek)
        }))
      ),
      habitsFrequency: JSON.stringify(
        habitsFrequency.filter(h => h.habitId && h.timesPerWeek).map(h => ({
          habitId: parseInt(h.habitId), timesPerWeek: parseInt(h.timesPerWeek)
        }))
      )
    };

    const res = await fetch('http://localhost:5000/api/student/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      credentials: 'include',
      body: JSON.stringify(payload)
    });

    const result = await res.json();
    alert(result.message || 'Preferences saved!');
  };

  return (
    <Container className="mt-5">
      <h2>Edit Preferences</h2>
      <Form onSubmit={handleSubmit}>
        {/* Apartment + Budget */}
        <Form.Group className="mb-3">
          <Form.Label>Budget (€)</Form.Label>
          <Form.Control type="number" value={budget} onChange={e => setBudget(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Apartment Location</Form.Label>
          <Form.Control type="text" value={apartmentLocation} onChange={e => setApartmentLocation(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Apartment Price (€)</Form.Label>
          <Form.Control type="number" value={apartmentPrice} onChange={e => setApartmentPrice(e.target.value)} />
        </Form.Group>
        <Form.Group className="mb-3">
          <Form.Label>Apartment Expenses (€)</Form.Label>
          <Form.Control type="number" value={apartmentExpenses} onChange={e => setApartmentExpenses(e.target.value)} />
        </Form.Group>

        {/* Food */}
        <hr /><h4>Food Frequency</h4>
        {['breakfast', 'lunch', 'dinner'].map(meal => (
          <div key={meal}>
            <h5>{meal.charAt(0).toUpperCase() + meal.slice(1)}</h5>
            {foodFrequency[meal].map((row, index) => (
              <Row key={index} className="mb-2">
                <Col md={6}>
                  <Form.Select
                    value={String(row.foodId ?? '')}
                    onChange={e => handleFoodChange(meal, index, 'foodId', e.target.value)}
                  >
                    <option value="">Select Food</option>
                    {foodOptions.map(opt => (
                      <option key={opt.id} value={String(opt.id)}>
                        {opt.name} (€{opt.price})
                      </option>
                    ))}
                  </Form.Select>
                </Col>
                <Col md={4}>
                  <Form.Control type="number" placeholder="Times per week"
                    value={row.timesPerWeek}
                    onChange={e => handleFoodChange(meal, index, 'timesPerWeek', e.target.value)} />
                </Col>
              </Row>
            ))}
            <Button variant="secondary" onClick={() => addRow(meal)} className="mb-3">
              Add Another {meal.charAt(0).toUpperCase() + meal.slice(1)}
            </Button>
          </div>
        ))}

        {/* Universities */}
        <hr /><h4>University & Frequency</h4>
        {universityFrequency.map((row, index) => (
          <Row key={index} className="mb-2">
            <Col md={6}>
              <Form.Select value={row.universityId} onChange={e => handleUniChange(index, 'universityId', e.target.value)}>
                <option value="">Select University</option>
                {universities.map(uni => (
                  <option key={uni.id} value={uni.id}>{uni.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Control type="number" placeholder="Times per week"
                value={row.timesPerWeek}
                onChange={e => handleUniChange(index, 'timesPerWeek', e.target.value)} />
            </Col>
          </Row>
        ))}
        <Button variant="secondary" onClick={addUniversityRow} className="mb-3">Add Another University</Button>

        {/* Habits */}
        <hr /><h4>Habits & Frequency</h4>
        {habitsFrequency.map((row, index) => (
          <Row key={index} className="mb-2">
            <Col md={6}>
              <Form.Select value={row.habitId} onChange={e => handleHabitChange(index, 'habitId', e.target.value)}>
                <option value="">Select Habit</option>
                {habitsList.map(habit => (
                  <option key={habit.id} value={habit.id}>{habit.name}</option>
                ))}
              </Form.Select>
            </Col>
            <Col md={4}>
              <Form.Control type="number" placeholder="Times per week"
                value={row.timesPerWeek}
                onChange={e => handleHabitChange(index, 'timesPerWeek', e.target.value)} />
            </Col>
          </Row>
        ))}
        <Button variant="secondary" onClick={addHabitRow} className="mb-3">Add Another Habit</Button>

        <Button type="submit" className="mt-2">Save Preferences</Button>
      </Form>
    </Container>
  );
};

export default PreferencePage;
