import {
  MapContainer,
  TileLayer,
  Marker,
  Popup,
  Polyline,
} from "react-leaflet";
import L from "leaflet";
import "leaflet/dist/leaflet.css";

delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const redIcon = new L.Icon({
  iconUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  iconRetinaUrl:
    "https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-red.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
});

const toNum = (v) => (v === null || v === undefined ? NaN : Number(v));
const isValidLatLng = (lat, lng) =>
  Number.isFinite(lat) &&
  Number.isFinite(lng) &&
  Math.abs(lat) <= 90 &&
  Math.abs(lng) <= 180;

export default function UniMap({
  universities = [],
  apartment,
  routeCoords = [],
}) {
  const aptLat = apartment ? toNum(apartment.lat) : NaN;
  const aptLng = apartment ? toNum(apartment.lng) : NaN;
  const hasApt = isValidLatLng(aptLat, aptLng);

  const uniPoints = (universities || [])
    .map((u) => ({ ...u, lat: toNum(u.lat), lng: toNum(u.lng) }))
    .filter((u) => isValidLatLng(u.lat, u.lng));

  const routePts = (routeCoords || [])
    .map((p) => (Array.isArray(p) ? [toNum(p[0]), toNum(p[1])] : [NaN, NaN]))
    .filter(([lat, lng]) => isValidLatLng(lat, lng));

  const center = hasApt
    ? [aptLat, aptLng]
    : uniPoints[0]
      ? [uniPoints[0].lat, uniPoints[0].lng]
      : [45.548, 13.73];

  return (
    <MapContainer
      center={center}
      zoom={12}
      style={{ height: 400, width: "100%" }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution="&copy; OpenStreetMap contributors"
      />

      {hasApt && (
        <Marker position={[aptLat, aptLng]} icon={redIcon}>
          <Popup>Your apartment</Popup>
        </Marker>
      )}

      {uniPoints.map((u) => (
        <Marker key={u.id} position={[u.lat, u.lng]}>
          <Popup>
            <strong>{u.name}</strong>
            {typeof u.timesPerWeek === "number" && u.timesPerWeek > 0 ? (
              <div>{u.timesPerWeek}× / week</div>
            ) : null}
            {u.address ? <div>{u.address}</div> : null}
          </Popup>
        </Marker>
      ))}

      {routePts.length > 0 && <Polyline positions={routePts} />}
    </MapContainer>
  );
}
