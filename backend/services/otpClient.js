const OTP_ENDPOINT =
  process.env.OTP_ENDPOINT || 'http://localhost:8080/otp/routers/default/index/graphql';

async function planTrip({
  fromLat,
  fromLon,
  toLat,
  toLon,
  date,
  time,
  modes,
  numItineraries = 1
}) {
  const query = `
    query Plan(
      $fromLat: Float!,
      $fromLon: Float!,
      $toLat: Float!,
      $toLon: Float!,
      $date: String!,
      $time: String!,
      $modes: [TransportMode]!,
      $num: Int!
    ) {
      plan(
        from: { lat: $fromLat, lon: $fromLon }
        to:   { lat: $toLat,   lon: $toLon }
        date: $date
        time: $time
        transportModes: $modes
        numItineraries: $num
      ) {
        itineraries {
          duration
          walkDistance
          legs {
            mode
            startTime
            endTime
            from { name }
            to { name }
            route { shortName }
          }
        }
      }
    }`;

  const variables = {
    fromLat,
    fromLon,
    toLat,
    toLon,
    date: date || "2025-08-08",
    time: time || "08:00",
    modes: modes || [{ mode: "WALK" }],
    num: numItineraries
  };

  const res = await fetch(OTP_ENDPOINT, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ query, variables })
  });

  if (!res.ok) throw new Error(`OTP ${res.status}`);
  const json = await res.json();
  if (!json?.data?.plan?.itineraries) return [];
  return json.data.plan.itineraries;
}

module.exports = { planTrip };
