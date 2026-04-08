"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

export default function GlobeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [10, 50], // Europe centered
      zoom: 3,
      projection: "globe",
      pitch: 20,
      antialias: true,
    });

    map.current.on("style.load", () => {
      if (!map.current) return;

      // Desaturate the base map for that intelligence-tool feel
      map.current.setFog({
        color: "rgb(10, 10, 15)",
        "high-color": "rgb(20, 20, 40)",
        "horizon-blend": 0.08,
        "space-color": "rgb(5, 5, 12)",
        "star-intensity": 0.4,
      });
    });

    // Navigation controls (zoom, tilt, rotate)
    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
}
