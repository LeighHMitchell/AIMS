declare namespace google.maps {
  interface MapMouseEvent {
    latLng: LatLng | null
  }

  class LatLng {
    lat(): number
    lng(): number
  }

  class Map {
    constructor(mapDiv: Element, opts?: MapOptions)
    addListener(eventName: string, handler: (e: any) => void): void
  }

  class Marker {
    constructor(opts?: MarkerOptions)
    setMap(map: Map | null): void
    addListener(eventName: string, handler: () => void): void
  }

  interface MapOptions {
    center?: LatLng | { lat: number; lng: number }
    zoom?: number
    mapId?: string
  }

  interface MarkerOptions {
    position: LatLng | { lat: number; lng: number }
    map?: Map
    draggable?: boolean
  }

  interface MapsLibrary {
    Map: typeof Map
  }
}

declare namespace google {
  const maps: {
    importLibrary(library: string): Promise<any>
  }
} 