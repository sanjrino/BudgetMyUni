const fetch = require('node-fetch');

const PHOTON_URL = process.env.PHOTON_URL || 'https://photon.komoot.io/api';

async function geocode(q) {
  const url = `${PHOTON_URL}?q=${encodeURIComponent(q)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Photon ${res.status}`);
  const json = await res.json();

  return (json.features || [])
    .map(f => ({
      label: f.properties?.label || f.properties?.name || q,
      lat: f.geometry?.coordinates?.[1],
      lon: f.geometry?.coordinates?.[0],
      city: f.properties?.city,
      country: f.properties?.country
    }))
    .filter(p => Number.isFinite(p.lat) && Number.isFinite(p.lon));
}

module.exports = { geocode };
