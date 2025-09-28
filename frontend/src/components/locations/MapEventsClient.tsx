"use client";

import { useMapEvents } from 'react-leaflet';

interface MapEventsClientProps {
  onMapClick: (lat: number, lng: number) => void;
}

export default function MapEventsClient({ onMapClick }: MapEventsClientProps) {
  useMapEvents({
    click(e) {
      onMapClick(e.latlng.lat, e.latlng.lng);
    },
  });

  return null;
}

