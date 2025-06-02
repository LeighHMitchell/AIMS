"use client"
import React from "react"
import { MapContainer, TileLayer, Marker, useMapEvents } from "react-leaflet"
import "leaflet/dist/leaflet.css"
import { LeafletMouseEvent } from "leaflet"

export type Location = { lat: number; lng: number }

interface ActivityMapProps {
  locations: Location[]
  setLocations: React.Dispatch<React.SetStateAction<Location[]>>
}

function LocationMapEvents({ setLocations }: { setLocations: React.Dispatch<React.SetStateAction<Location[]>> }) {
  useMapEvents({
    click(e: LeafletMouseEvent) {
      setLocations(locs => [...locs, { lat: e.latlng.lat, lng: e.latlng.lng }])
    },
  })
  return null
}

export const ActivityMap: React.FC<ActivityMapProps> = ({ locations, setLocations }) => (
  <MapContainer center={[13.41, 103.86]} zoom={6} style={{ height: "100%", width: "100%" }}>
    <TileLayer
      attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
    />
    {locations.map((loc, idx) => (
      <Marker key={idx} position={[loc.lat, loc.lng]} />
    ))}
    <LocationMapEvents setLocations={setLocations} />
  </MapContainer>
) 