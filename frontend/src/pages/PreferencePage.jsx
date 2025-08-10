import React, { useState, useEffect } from "react";
import {
  Container,
  Form,
  Button,
  Row,
  Col,
  Card,
  Badge,
} from "react-bootstrap";
import "./PreferencePage.css";

async function createCustomFood(name, price, makePublic) {
  const res = await fetch("http://localhost:5000/api/food/custom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, price, makePublic }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create food");
  return json;
}

async function createCustomHabit(name, price, makePublic) {
  const res = await fetch("http://localhost:5000/api/habits/custom", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    credentials: "include",
    body: JSON.stringify({ name, price, makePublic }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.message || "Failed to create habit");
  return json;
}

const mergeById = (rows, idKey) => {
  const map = new Map();
  for (const r of rows) {
    const id = parseInt(r[idKey]);
    const times = parseInt(r.timesPerWeek);
    if (!id || !times) continue;
    map.set(id, (map.get(id) || 0) + times);
  }
  return Array.from(map.entries()).map(([id, total]) => ({
    [idKey]: id,
    timesPerWeek: total,
  }));
};

const inferDormSelection = (home, dorms) => {
  if (!home || !Array.isArray(dorms) || dorms.length === 0) return "";
  const tol = 0.0005;
  const lc = (s) => (s || "").toLowerCase().trim();
  const match = dorms.find(
    (d) =>
      (Number.isFinite(Number(home.lat)) &&
        Number.isFinite(Number(home.lng)) &&
        Math.abs(Number(d.lat) - Number(home.lat)) < tol &&
        Math.abs(Number(d.lng) - Number(home.lng)) < tol) ||
      (lc(d.address) && lc(d.address) === lc(home.streetName)) ||
      (lc(d.name) && lc(d.name) === lc(home.name)),
  );
  return match ? String(match.id) : "";
};

const toMoney = (n) => (Number(n) || 0).toFixed(2);

const PreferencePage = () => {
  const [budget, setBudget] = useState("");
  const [apartmentPrice, setApartmentPrice] = useState("");
  const [apartmentExpenses, setApartmentExpenses] = useState("");
  const [includeCommutePublic, setIncludeCommutePublic] = useState(true);

  const [dorms, setDorms] = useState([]);
  const [selectedDormId, setSelectedDormId] = useState("");

  const [foodOptions, setFoodOptions] = useState([]);
  const [foodFrequency, setFoodFrequency] = useState({
    breakfast: [{ foodId: "", timesPerWeek: "" }],
    lunch: [{ foodId: "", timesPerWeek: "" }],
    dinner: [{ foodId: "", timesPerWeek: "" }],
  });
  const [customFood, setCustomFood] = useState({
    breakfast: {},
    lunch: {},
    dinner: {},
  });

  const [universities, setUniversities] = useState([]);
  const [universityFrequency, setUniversityFrequency] = useState([
    { universityId: "", timesPerWeek: "" },
  ]);

  const [habitsList, setHabitsList] = useState([]);
  const [habitsFrequency, setHabitsFrequency] = useState([
    { habitId: "", timesPerWeek: "" },
  ]);
  const [customHabit, setCustomHabit] = useState({});

  const [homePlace, setHomePlace] = useState(null);
  const [homeStreetName, setHomeStreetName] = useState("");
  const [homeName, setHomeName] = useState("Apartment");

  useEffect(() => {
    const fetchAll = async () => {
      const res = await fetch("http://localhost:5000/api/student/me", {
        credentials: "include",
      });
      const data = await res.json();
      if (!res.ok) {
        alert(data.message || "Not logged in");
        return;
      }

      setBudget(data.budget || "");
      setApartmentPrice(data.apartmentPrice || "");
      setApartmentExpenses(data.apartmentExpenses || "");
      setIncludeCommutePublic(
        typeof data.includeCommutePublic === "number"
          ? !!data.includeCommutePublic
          : true,
      );

      const parseMeal = (key) => {
        const raw = data[key];
        if (!raw) return [{ foodId: "", timesPerWeek: "" }];
        let arr = [];
        if (typeof raw === "string") {
          try {
            arr = JSON.parse(raw);
          } catch {
            return [{ foodId: "", timesPerWeek: "" }];
          }
        } else if (Array.isArray(raw)) arr = raw;
        else return [{ foodId: "", timesPerWeek: "" }];
        if (!Array.isArray(arr) || arr.length === 0)
          return [{ foodId: "", timesPerWeek: "" }];
        return arr.map((f) => ({
          foodId: String(f.foodId ?? ""),
          timesPerWeek: String(f.timesPerWeek ?? ""),
        }));
      };

      setFoodFrequency({
        breakfast: parseMeal("foodPreferenceBreakfast"),
        lunch: parseMeal("foodPreferenceLunch"),
        dinner: parseMeal("foodPreferenceDinner"),
      });

      if (data.universityFrequency) {
        try {
          const parsed =
            typeof data.universityFrequency === "string"
              ? JSON.parse(data.universityFrequency)
              : data.universityFrequency;
          setUniversityFrequency(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          setUniversityFrequency([{ universityId: "", timesPerWeek: "" }]);
        }
      }

      if (data.habitsFrequency) {
        try {
          const parsed =
            typeof data.habitsFrequency === "string"
              ? JSON.parse(data.habitsFrequency)
              : data.habitsFrequency;
          setHabitsFrequency(Array.isArray(parsed) ? parsed : [parsed]);
        } catch {
          setHabitsFrequency([{ habitId: "", timesPerWeek: "" }]);
        }
      }

      const uniRes = await fetch("http://localhost:5000/api/university/all");
      setUniversities(await uniRes.json());

      const habitsRes = await fetch("http://localhost:5000/api/habits/all", {
        credentials: "include",
      });
      setHabitsList(await habitsRes.json());

      const foodRes = await fetch("http://localhost:5000/api/food/all", {
        credentials: "include",
      });
      setFoodOptions(await foodRes.json());

      let places = [];
      if (data.savedPlaces) {
        try {
          places =
            typeof data.savedPlaces === "string"
              ? JSON.parse(data.savedPlaces)
              : data.savedPlaces;
        } catch {
          places = [];
        }
      }
      if (Array.isArray(places)) {
        const home = places.find((p) => p.id === "home");
        if (home) {
          setHomePlace(home);
          setHomeStreetName(home.streetName || "");
          setHomeName(home.name || "Apartment");
        }
      }

      const dormRes = await fetch("http://localhost:5000/api/dorms/all", {
        credentials: "include",
      });
      const dormData = await dormRes.json();
      setDorms(dormData);

      const home = (places || []).find((p) => p.id === "home") || null;
      const dormId = inferDormSelection(home || null, dormData);
      if (dormId) {
        setSelectedDormId(dormId);
        const d = dormData.find((x) => String(x.id) === dormId);
        if (d) {
          setApartmentPrice(String(d.price ?? ""));
          setApartmentExpenses("0");
        }
      }
    };

    fetchAll();
  }, []);

  useEffect(() => {
    if (!homePlace || dorms.length === 0) return;
    const id = inferDormSelection(homePlace, dorms);
    if (id) {
      setSelectedDormId(id);
      const d = dorms.find((x) => String(x.id) === id);
      if (d) {
        setApartmentPrice(String(d.price ?? ""));
        setApartmentExpenses("0");
        setHomeStreetName(d.address || "");
      }
    }
  }, [homePlace, dorms]);

  const priceOfFood = (id) => {
    const row = foodOptions.find((f) => String(f.id) === String(id));
    return row ? Number(row.price) || 0 : 0;
  };

  const weeklyTotalForMeal = (meal) =>
    (foodFrequency[meal] || []).reduce((sum, r, idx) => {
      const times = Number(r.timesPerWeek) || 0;
      if (!times) return sum;
      if (String(r.foodId) === "CUSTOM") {
        const cf = customFood[meal]?.[idx];
        const price = Number(cf?.price) || 0;
        return sum + times * price;
      }
      return sum + times * priceOfFood(r.foodId);
    }, 0);

  const weeklyTotalFood = ["breakfast", "lunch", "dinner"].reduce(
    (s, m) => s + weeklyTotalForMeal(m),
    0,
  );

  const addRow = (meal) => {
    setFoodFrequency({
      ...foodFrequency,
      [meal]: [...foodFrequency[meal], { foodId: "", timesPerWeek: "" }],
    });
  };

  const handleFoodChange = (meal, index, field, value) => {
    const updated = [...foodFrequency[meal]];
    updated[index][field] = value;
    setFoodFrequency({ ...foodFrequency, [meal]: updated });
  };

  const addUniversityRow = () =>
    setUniversityFrequency([
      ...universityFrequency,
      { universityId: "", timesPerWeek: "" },
    ]);

  const handleUniChange = (index, field, value) => {
    const updated = [...universityFrequency];
    updated[index][field] = value;
    setUniversityFrequency(updated);
  };

  const addHabitRow = () =>
    setHabitsFrequency([...habitsFrequency, { habitId: "", timesPerWeek: "" }]);

  const handleHabitChange = (index, field, value) => {
    const updated = [...habitsFrequency];
    updated[index][field] = value;
    setHabitsFrequency(updated);
  };

  const onDormChange = (e) => {
    const id = e.target.value;
    setSelectedDormId(id);
    if (!id) {
      setApartmentPrice("");
      setApartmentExpenses("");
      return;
    }
    const dorm = dorms.find((d) => String(d.id) === String(id));
    if (!dorm) return;
    setHomeStreetName(dorm.address);
    setHomeName(dorm.name);
    setApartmentPrice(String(dorm.price ?? ""));
    setApartmentExpenses("0");
  };

  const onHomeStreetChange = (e) => {
    setHomeStreetName(e.target.value);
    if (selectedDormId) {
      setSelectedDormId("");
      setApartmentPrice("");
      setApartmentExpenses("");
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    const mergedBreakfast = mergeById(foodFrequency.breakfast, "foodId");
    const mergedLunch = mergeById(foodFrequency.lunch, "foodId");
    const mergedDinner = mergeById(foodFrequency.dinner, "foodId");
    const mergedUniversities = mergeById(universityFrequency, "universityId");
    const mergedHabits = mergeById(habitsFrequency, "habitId");

    const chosenDorm = selectedDormId
      ? dorms.find((d) => String(d.id) === String(selectedDormId))
      : null;
    const effectiveLocation = chosenDorm?.address || homeStreetName || "";

    try {
      if (chosenDorm) {
        await fetch("http://localhost:5000/api/student/places/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: "home",
            name: chosenDorm.name,
            streetName: chosenDorm.address,
            lat: chosenDorm.lat,
            lng: chosenDorm.lng,
          }),
        });
      } else if (homeStreetName) {
        await fetch("http://localhost:5000/api/student/places/upsert", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            id: "home",
            name: homeName || "Apartment",
            streetName: homeStreetName,
          }),
        });
      }
    } catch {}

    const payload = {
      budget,
      apartmentLocation: effectiveLocation,
      apartmentPrice,
      apartmentExpenses,
      includeCommutePublic,
      foodPreferenceBreakfast: JSON.stringify(mergedBreakfast),
      foodPreferenceLunch: JSON.stringify(mergedLunch),
      foodPreferenceDinner: JSON.stringify(mergedDinner),
      universityFrequency: JSON.stringify(mergedUniversities),
      habitsFrequency: JSON.stringify(mergedHabits),
    };

    const res = await fetch("http://localhost:5000/api/student/save", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      credentials: "include",
      body: JSON.stringify(payload),
    });

    const result = await res.json();
    alert(result.message || "Preferences saved!");
  };

  return (
    <Container className="pref-container">
      <div className="d-flex justify-content-between align-items-end mb-3">
        <div>
          <h2 className="mb-1">Preferences</h2>
          <div className="text-muted">
            Tune your budget, home and campus routine.
          </div>
        </div>
      </div>

      <Card className="pref-card mb-3">
        <Card.Body>
          <div className="section-head">
            <h5 className="section-title">Budget & Commute</h5>
          </div>
          <Row className="g-3 mt-1">
            <Col md={4}>
              <Form.Group>
                <Form.Label>Monthly budget (€)</Form.Label>
                <Form.Control
                  type="number"
                  value={budget}
                  onChange={(e) => setBudget(e.target.value)}
                />
              </Form.Group>
            </Col>
            <Col md={8} className="d-flex align-items-end">
              <Form.Check
                className="mt-2"
                type="checkbox"
                label="Include public transport cost in Total Estimated Spending"
                checked={includeCommutePublic}
                onChange={(e) => setIncludeCommutePublic(e.target.checked)}
              />
            </Col>
          </Row>
        </Card.Body>
      </Card>

      <Card className="pref-card mb-3">
        <Card.Body>
          <div className="section-head">
            <h5 className="section-title">Home location</h5>
            <a
              className="link-soft"
              href="https://www.mojcimer.si/"
              target="_blank"
              rel="noopener noreferrer"
              title="External site"
            >
              Private apartment prices: mojcimer.si ↗
            </a>
          </div>
          <Row className="g-3 mt-1">
            <Col md={6}>
              <Form.Label>Dorm (or choose custom)</Form.Label>
              <Form.Select value={selectedDormId} onChange={onDormChange}>
                <option value="">Custom location</option>
                {dorms.map((d) => (
                  <option key={d.id} value={String(d.id)}>
                    {d.name} — {d.address} (€{toMoney(d.price)})
                  </option>
                ))}
              </Form.Select>
            </Col>
          </Row>
          <Row className="g-3 mt-1">
            <Col md={6}>
              <Form.Label>Address</Form.Label>
              <Form.Control
                type="text"
                placeholder="e.g., Čevljarska 12, Koper"
                value={homeStreetName}
                onChange={onHomeStreetChange}
                disabled={!!selectedDormId}
              />
            </Col>
            <Col md={4}>
              <Form.Label>Location nickname</Form.Label>
              <Form.Control
                type="text"
                placeholder="Apartment"
                value={homeName}
                onChange={(e) => setHomeName(e.target.value)}
                disabled={!!selectedDormId}
              />
            </Col>
          </Row>
          {!selectedDormId && (
            <Row className="g-3 mt-1">
              <Col md={3}>
                <Form.Label>Rent (€)</Form.Label>
                <Form.Control
                  type="number"
                  value={apartmentPrice}
                  onChange={(e) => setApartmentPrice(e.target.value)}
                />
              </Col>
              <Col md={3}>
                <Form.Label>Expenses (€)</Form.Label>
                <Form.Control
                  type="number"
                  value={apartmentExpenses}
                  onChange={(e) => setApartmentExpenses(e.target.value)}
                />
              </Col>
            </Row>
          )}
        </Card.Body>
      </Card>

      <Card className="pref-card mb-3">
        <Card.Body>
          <div className="section-head">
            <h5 className="section-title">Food frequency</h5>
            <Badge bg="light" text="dark" className="badge-soft">
              Weekly total: € {toMoney(weeklyTotalFood)} • ~monthly: €{" "}
              {toMoney(weeklyTotalFood * 4.33)}
            </Badge>
          </div>
          {["breakfast", "lunch", "dinner"].map((meal) => (
            <div key={meal} className="meal-block">
              <div className="d-flex justify-content-between align-items-center mb-2">
                <h6 className="mb-0">
                  {meal.charAt(0).toUpperCase() + meal.slice(1)}
                </h6>
                <div className="text-muted small">
                  Weekly: € {toMoney(weeklyTotalForMeal(meal))} • ~monthly: €{" "}
                  {toMoney(weeklyTotalForMeal(meal) * 4.33)}
                </div>
              </div>
              {foodFrequency[meal].map((row, index) => {
                const isCustomSelected = String(row.foodId) === "CUSTOM";
                const cf = customFood[meal]?.[index] || {
                  name: "",
                  price: "",
                  makePublic: false,
                };
                return (
                  <Row key={index} className="g-2 mb-2">
                    <Col md={6}>
                      <Form.Select
                        value={String(row.foodId ?? "")}
                        onChange={(e) => {
                          const val = e.target.value;
                          handleFoodChange(meal, index, "foodId", val);
                          if (val === "CUSTOM") {
                            setCustomFood((prev) => ({
                              ...prev,
                              [meal]: {
                                ...(prev[meal] || {}),
                                [index]: {
                                  name: "",
                                  price: "",
                                  makePublic: false,
                                },
                              },
                            }));
                          }
                        }}
                      >
                        <option value="">Select food</option>
                        {foodOptions.map((opt) => (
                          <option key={opt.id} value={String(opt.id)}>
                            {opt.name} (€{toMoney(opt.price)})
                          </option>
                        ))}
                        <option value="CUSTOM">➕ Add new food</option>
                      </Form.Select>
                    </Col>
                    <Col md={3}>
                      <Form.Control
                        type="number"
                        placeholder="Times / week"
                        value={row.timesPerWeek}
                        onChange={(e) =>
                          handleFoodChange(
                            meal,
                            index,
                            "timesPerWeek",
                            e.target.value,
                          )
                        }
                      />
                    </Col>
                    {isCustomSelected && (
                      <Col md={12} className="mt-1">
                        <Row className="g-2">
                          <Col md={5}>
                            <Form.Control
                              type="text"
                              placeholder="Custom food name"
                              value={cf.name}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCustomFood((prev) => ({
                                  ...prev,
                                  [meal]: {
                                    ...(prev[meal] || {}),
                                    [index]: { ...cf, name: v },
                                  },
                                }));
                              }}
                            />
                          </Col>
                          <Col md={3}>
                            <Form.Control
                              type="number"
                              placeholder="Price (€)"
                              value={cf.price}
                              onChange={(e) => {
                                const v = e.target.value;
                                setCustomFood((prev) => ({
                                  ...prev,
                                  [meal]: {
                                    ...(prev[meal] || {}),
                                    [index]: { ...cf, price: v },
                                  },
                                }));
                              }}
                            />
                          </Col>
                          <Col md={3} className="d-flex align-items-center">
                            <Form.Check
                              type="checkbox"
                              label="Share publicly"
                              checked={!!cf.makePublic}
                              onChange={(e) => {
                                const v = e.target.checked;
                                setCustomFood((prev) => ({
                                  ...prev,
                                  [meal]: {
                                    ...(prev[meal] || {}),
                                    [index]: { ...cf, makePublic: v },
                                  },
                                }));
                              }}
                            />
                          </Col>
                          <Col md={12}>
                            <Button
                              variant="outline-primary"
                              disabled={
                                !cf.name.trim() || !(Number(cf.price) > 0)
                              }
                              onClick={async () => {
                                try {
                                  const created = await createCustomFood(
                                    cf.name,
                                    cf.price,
                                    cf.makePublic,
                                  );
                                  const foodRes = await fetch(
                                    "http://localhost:5000/api/food/all",
                                    { credentials: "include" },
                                  );
                                  const foodData = await foodRes.json();
                                  setFoodOptions(foodData);
                                  handleFoodChange(
                                    meal,
                                    index,
                                    "foodId",
                                    String(created.id),
                                  );
                                  setCustomFood((prev) => {
                                    const copy = { ...(prev[meal] || {}) };
                                    delete copy[index];
                                    return { ...prev, [meal]: copy };
                                  });
                                } catch (err) {
                                  alert(
                                    err.message || "Failed to add custom food",
                                  );
                                }
                              }}
                            >
                              Add
                            </Button>
                          </Col>
                        </Row>
                      </Col>
                    )}
                  </Row>
                );
              })}
              <Button
                variant="secondary"
                onClick={() => addRow(meal)}
                className="mb-3"
              >
                Add another {meal}
              </Button>
            </div>
          ))}
        </Card.Body>
      </Card>

      <Card className="pref-card mb-3">
        <Card.Body>
          <div className="section-head">
            <h5 className="section-title">University & attendance</h5>
          </div>
          {universityFrequency.map((row, index) => (
            <Row key={index} className="g-2 mb-2">
              <Col md={6}>
                <Form.Select
                  value={row.universityId}
                  onChange={(e) =>
                    handleUniChange(index, "universityId", e.target.value)
                  }
                >
                  <option value="">Select university</option>
                  {universities.map((uni) => (
                    <option key={uni.id} value={uni.id}>
                      {uni.name}
                    </option>
                  ))}
                </Form.Select>
              </Col>
              <Col md={3}>
                <Form.Control
                  type="number"
                  placeholder="Times / week"
                  value={row.timesPerWeek}
                  onChange={(e) =>
                    handleUniChange(index, "timesPerWeek", e.target.value)
                  }
                />
              </Col>
            </Row>
          ))}
          <Button variant="secondary" onClick={addUniversityRow}>
            Add another university
          </Button>
        </Card.Body>
      </Card>

      <Card className="pref-card mb-4">
        <Card.Body>
          <div className="section-head">
            <h5 className="section-title">Habits & lifestyle</h5>
          </div>
          {habitsFrequency.map((row, index) => {
            const isCustom = String(row.habitId) === "CUSTOM";
            const ch = customHabit[index] || {
              name: "",
              price: "",
              makePublic: false,
            };
            return (
              <Row key={index} className="g-2 mb-2">
                <Col md={6}>
                  <Form.Select
                    value={row.habitId}
                    onChange={(e) => {
                      const val = e.target.value;
                      handleHabitChange(index, "habitId", val);
                      if (val === "CUSTOM") {
                        setCustomHabit((prev) => ({
                          ...prev,
                          [index]: { name: "", price: "", makePublic: false },
                        }));
                      }
                    }}
                  >
                    <option value="">Select habit</option>
                    {habitsList.map((habit) => (
                      <option key={habit.id} value={habit.id}>
                        {habit.name} (€/time {toMoney(habit.price)})
                      </option>
                    ))}
                    <option value="CUSTOM">➕ Add custom…</option>
                  </Form.Select>
                </Col>
                <Col md={3}>
                  <Form.Control
                    type="number"
                    placeholder="Times / week"
                    value={row.timesPerWeek}
                    onChange={(e) =>
                      handleHabitChange(index, "timesPerWeek", e.target.value)
                    }
                  />
                </Col>
                {isCustom && (
                  <Col md={12} className="mt-1">
                    <Row className="g-2">
                      <Col md={5}>
                        <Form.Control
                          type="text"
                          placeholder="Custom habit name"
                          value={ch.name}
                          onChange={(e) =>
                            setCustomHabit((prev) => ({
                              ...prev,
                              [index]: { ...ch, name: e.target.value },
                            }))
                          }
                        />
                      </Col>
                      <Col md={3}>
                        <Form.Control
                          type="number"
                          placeholder="Price per time (€)"
                          value={ch.price}
                          onChange={(e) =>
                            setCustomHabit((prev) => ({
                              ...prev,
                              [index]: { ...ch, price: e.target.value },
                            }))
                          }
                        />
                      </Col>
                      <Col md={3} className="d-flex align-items-center">
                        <Form.Check
                          type="checkbox"
                          label="Share publicly"
                          checked={!!ch.makePublic}
                          onChange={(e) =>
                            setCustomHabit((prev) => ({
                              ...prev,
                              [index]: { ...ch, makePublic: e.target.checked },
                            }))
                          }
                        />
                      </Col>
                      <Col md={12}>
                        <Button
                          variant="outline-primary"
                          disabled={!ch.name.trim() || !(Number(ch.price) > 0)}
                          onClick={async () => {
                            try {
                              const created = await createCustomHabit(
                                ch.name,
                                ch.price,
                                ch.makePublic,
                              );
                              const habitsRes = await fetch(
                                "http://localhost:5000/api/habits/all",
                                { credentials: "include" },
                              );
                              const habitsData = await habitsRes.json();
                              setHabitsList(habitsData);
                              handleHabitChange(
                                index,
                                "habitId",
                                String(created.id),
                              );
                              setCustomHabit((prev) => {
                                const copy = { ...prev };
                                delete copy[index];
                                return copy;
                              });
                            } catch (err) {
                              alert(
                                err.message || "Failed to add custom habit",
                              );
                            }
                          }}
                        >
                          Add
                        </Button>
                      </Col>
                    </Row>
                  </Col>
                )}
              </Row>
            );
          })}
          <Button variant="secondary" onClick={addHabitRow}>
            Add another habit
          </Button>
        </Card.Body>
      </Card>

      <div className="footer-actions">
        <Button size="lg" onClick={handleSubmit}>
          Save Preferences
        </Button>
      </div>
    </Container>
  );
};

export default PreferencePage;
