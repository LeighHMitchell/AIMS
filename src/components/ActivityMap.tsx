import React from "react";
import { MapContainer, TileLayer } from "react-leaflet";
import "leaflet/dist/leaflet.css";

// export const ActivityMap: React.FC<ActivityMapProps> = ({ locations, setLocations }) => (
//   <MapContainer center={[13.41, 103.86]} zoom={6} style={{ height: "100%", width: "100%" }}>
//     <TileLayer
//       attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
//       url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
//     />
//     {locations.map((loc, idx) => (
//       <Marker key={idx} position={[loc.lat, loc.lng]} />
//     ))}
//     <LocationMapEvents setLocations={setLocations} />
//   </MapContainer>
// )

// Minimal placeholder to test build
export const ActivityMap = () => (
  <MapContainer center={[13.41, 103.86]} zoom={6} style={{ height: "400px", width: "100%" }}>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
      url="https://{s}.basemaps.cartocdn.com/light_all/{z}/{x}/{y}{r}.png"
    />
  </MapContainer>
); 