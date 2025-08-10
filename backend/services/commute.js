const db = require('../db');
const { planTrip } = require('./otpClient');

const MONTH_FACTOR = Number(process.env.MONTH_FACTOR || 4.33);
const PUBLIC_FARE_EUR = Number(process.env.PUBLIC_FARE_EUR || 2.00);

const FIXED_DATE = '2025-08-08';
const FIXED_TIME = '08:00';

function toNum(v) {
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
}

function readLatLng(obj) {
  if (!obj || typeof obj !== 'object') return { lat: NaN, lng: NaN };
  const lat =
    toNum(obj.lat) ??
    toNum(obj.latitude);
  const lng =
    toNum(obj.lng) ??
    toNum(obj.lon) ??
    toNum(obj.longitude);
  return { lat, lng };
}

async function getStudentRow(userId) {
  const [rows] = await db.promise().query(
    'SELECT * FROM students WHERE userId = ? LIMIT 1',
    [userId]
  );
  return rows[0] || null;
}

function parseJSONMaybe(s) {
  if (!s) return null;
  if (typeof s === 'object') return s;
  try { return JSON.parse(s); } catch { return null; }
}

async function getHomeCoordsFromStudent(row) {
  const places = parseJSONMaybe(row.savedPlaces);
  if (Array.isArray(places)) {
    const home = places.find(p => p && p.id === 'home');
    if (home) {
      const { lat, lng } = readLatLng(home);
      if (Number.isFinite(lat) && Number.isFinite(lng)) {
        return { lat, lng };
      }
    }
  }
  if (row.apartmentLat != null && row.apartmentLng != null) {
    const lat = toNum(row.apartmentLat);
    const lng = toNum(row.apartmentLng);
    if (Number.isFinite(lat) && Number.isFinite(lng)) return { lat, lng };
  }
  return { lat: NaN, lng: NaN };
}

async function getSelectedUniversitiesWithCoords(row) {
  const uniFreq = parseJSONMaybe(row.universityFrequency) || [];
  if (!Array.isArray(uniFreq) || uniFreq.length === 0) return [];

  const [unis] = await db.promise().query('SELECT id, name, address, lat, lng FROM university');
  const byId = new Map(unis.map(u => [String(u.id), u]));

  const selected = [];
  for (const u of uniFreq) {
    const idStr = String(u.universityId);
    const base = byId.get(idStr);
    if (!base) continue;
    const lat = toNum(base.lat);
    const lng = toNum(base.lng);
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;
    selected.push({
      id: base.id,
      name: base.name,
      address: base.address,
      lat, lng,
      timesPerWeek: Number(u.timesPerWeek) || 0
    });
  }
  return selected;
}

async function bestDurationSeconds({ fromLat, fromLon, toLat, toLon, modes }) {
  const itineraries = await planTrip({
    fromLat, fromLon, toLat, toLon,
    date: FIXED_DATE,
    time: FIXED_TIME,
    modes,
    numItineraries: 3
  });
  if (!Array.isArray(itineraries) || itineraries.length === 0) return null;

  let best = null;
  for (const it of itineraries) {
    const d = toNum(it.duration);
    if (!Number.isFinite(d)) continue;
    if (best == null || d < best) best = d;
  }
  return best;
}

function sumDefined(arr) {
  return arr.filter(Number.isFinite).reduce((a, b) => a + b, 0);
}

async function recalcCommuteForUser(userId) {
  const row = await getStudentRow(userId);
  if (!row) {
    console.warn(`recalcCommuteForUser(${userId}): student row not found`);
    return;
  }

  const { lat: homeLat, lng: homeLng } = await getHomeCoordsFromStudent(row);
  if (!(Number.isFinite(homeLat) && Number.isFinite(homeLng))) {
    console.warn(`recalcCommuteForUser(${userId}): missing/invalid home coords`);
    return;
  }

  const universities = await getSelectedUniversitiesWithCoords(row);
  if (universities.length === 0) {
    console.warn(`recalcCommuteForUser(${userId}): no selected universities`);
    return;
  }

  const perUniComputations = [];

  for (const uni of universities) {
    const baseArgs = {
      fromLat: homeLat,
      fromLon: homeLng,
      toLat: uni.lat,
      toLon: uni.lng
    };

    const walkSec = await bestDurationSeconds({
      ...baseArgs,
      modes: [{ mode: 'WALK' }]
    });

    const bikeSec = await bestDurationSeconds({
      ...baseArgs,
      modes: [{ mode: 'BICYCLE' }]
    });

    const transitSec = await bestDurationSeconds({
      ...baseArgs,
      modes: [{ mode: 'TRANSIT' }, { mode: 'WALK' }]
    });

    const roundTripFactor = 2;
    const perWeekFactor = Number(uni.timesPerWeek) || 0;

    perUniComputations.push({
      walk: Number.isFinite(walkSec) ? walkSec * roundTripFactor * perWeekFactor : null,
      bike: Number.isFinite(bikeSec) ? bikeSec * roundTripFactor * perWeekFactor : null,
      transit: Number.isFinite(transitSec) ? transitSec * roundTripFactor * perWeekFactor : null
    });
  }

  const totalWalkSecWeek = sumDefined(perUniComputations.map(x => x.walk));
  const totalBikeSecWeek = sumDefined(perUniComputations.map(x => x.bike));
  const totalTransitSecWeek = sumDefined(perUniComputations.map(x => x.transit));

  const totalWalkMinWeek = Math.round(totalWalkSecWeek / 60);
  const totalBikeMinWeek = Math.round(totalBikeSecWeek / 60);
  const totalTransitMinWeek = Math.round(totalTransitSecWeek / 60);


  let ridesPerWeek = 0;
  for (const uni of universities) {
    ridesPerWeek += 2 * (Number(uni.timesPerWeek) || 0);
  }
  const transitCostWeek = ridesPerWeek * PUBLIC_FARE_EUR;
  const transitCostMonth = Math.round(transitCostWeek * MONTH_FACTOR * 100) / 100;

  await db.promise().query(
    `UPDATE students
     SET commuteTimeFoot = ?,
         expenseCommuteFoot = ?,     -- walk cost 0
         commuteTimeBike = ?,
         expenseCommuteBike = ?,     -- bike cost 0
         commuteTimePublic = ?,
         expenseCommutePublic = ?    -- monthly transit €
     WHERE userId = ?`,
    [
      totalWalkMinWeek, 0,
      totalBikeMinWeek, 0,
      totalTransitMinWeek, transitCostMonth,
      userId
    ]
  );

  return {
    weeklyMinutes: {
      walk: totalWalkMinWeek,
      bike: totalBikeMinWeek,
      transit: totalTransitMinWeek
    },
    ridesPerWeek,
    transitCostMonth
  };
}

module.exports = { recalcCommuteForUser };
