'use client';

import React from 'react';
import { MapContainer, TileLayer, Polygon } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';

interface CoverageMapProps {
  selectedOption: any;
  myanmarBounds: [number, number][];
  stateBounds: { [key: string]: [number, number][] };
}

export default function CoverageMap({ selectedOption, myanmarBounds, stateBounds }: CoverageMapProps) {
  const stateId = selectedOption?.type === 'state' ? selectedOption.id : selectedOption?.stateId;
  const bounds = stateId ? stateBounds[stateId] : null;

  return (
    <MapContainer
      center={[21.9, 95.9]}
      zoom={6}
      style={{ height: '100%', width: '100%' }}
    >
      <TileLayer
        url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
        attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
      />
      
      {/* Show Myanmar bounds for national coverage */}
      {selectedOption?.type === 'national' && (
        <Polygon
          positions={myanmarBounds}
          color="#10b981"
          weight={2}
          fillOpacity={0.2}
        />
      )}

      {/* Show selected location bounds for subnational coverage */}
      {selectedOption && selectedOption.type !== 'national' && bounds && (
        <Polygon
          key={stateId}
          positions={bounds}
          color="#3b82f6"
          weight={2}
          fillOpacity={0.3}
        />
      )}
    </MapContainer>
  );
} 