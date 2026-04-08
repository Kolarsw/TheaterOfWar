"use client";

import { useEffect, useRef, useCallback } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppStore } from "@/stores/useAppStore";
import alliedUnits from "@/data/mock-units.json";
import axisUnits from "@/data/mock-units-axis.json";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

const allUnits = [...alliedUnits, ...axisUnits];

function unitsToGeoJSON(beforeDate?: string): GeoJSON.FeatureCollection {
  const features = allUnits
    .filter((u) => !beforeDate || new Date(u.timestamp).getTime() <= new Date(beforeDate).getTime())
    .map((u) => ({
      type: "Feature" as const,
      geometry: { type: "Point" as const, coordinates: [u.lng, u.lat] },
      properties: {
        unit_id: u.unit_id,
        unit_name: u.unit_name,
        faction: u.faction,
        unit_type: u.unit_type,
        strength_percent: u.strength_percent,
        troop_count: u.troop_count,
      },
    }));
  return { type: "FeatureCollection", features };
}

export default function GlobeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  useEffect(() => {
    if (map.current || !mapContainer.current) return;

    mapboxgl.accessToken = MAPBOX_TOKEN;

    map.current = new mapboxgl.Map({
      container: mapContainer.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [10, 50],
      zoom: 3,
      projection: "globe",
      pitch: 20,
      antialias: true,
    });

    map.current.on("style.load", () => {
      if (!map.current) return;

      map.current.setFog({
        color: "rgb(10, 10, 15)",
        "high-color": "rgb(0, 35, 55)",
        "horizon-blend": 0.35,
        "space-color": "rgb(8, 10, 18)",
        "star-intensity": 0.4,
      });

      map.current.setPaintProperty("land", "background-color", "#2a2a2a");
      map.current.setPaintProperty("water", "fill-color", "rgba(16, 24, 48, 0.75)");

      // Add units as a GeoJSON source — filtered by current date
      const currentDate = useAppStore.getState().currentDate;
      map.current.addSource("units", {
        type: "geojson",
        data: unitsToGeoJSON(currentDate),
      });

      // Glow layer (larger, blurred circle behind)
      map.current.addLayer({
        id: "units-glow",
        type: "circle",
        source: "units",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, [
              "interpolate", ["linear"], ["get", "troop_count"],
              200, 4,
              8000, 7,
              15000, 9,
              21000, 12
            ],
            6, [
              "interpolate", ["linear"], ["get", "troop_count"],
              200, 6,
              8000, 12,
              15000, 16,
              21000, 22
            ],
            10, [
              "interpolate", ["linear"], ["get", "troop_count"],
              200, 8,
              8000, 16,
              15000, 24,
              21000, 34
            ]
          ],
          "circle-color": [
            "case",
            ["==", ["get", "faction"], "allied"], "rgba(0, 212, 255, 0.15)",
            "rgba(255, 51, 68, 0.15)"
          ],
          "circle-blur": 1,
        },
      });

      // Main unit dots — radius scales by troop count and zoom
      map.current.addLayer({
        id: "units-layer",
        type: "circle",
        source: "units",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["zoom"],
            2, [
              "interpolate", ["linear"], ["get", "troop_count"],
              200, 2,
              8000, 4,
              15000, 5,
              21000, 7
            ],
            6, [
              "interpolate", ["linear"], ["get", "troop_count"],
              200, 3,
              8000, 7,
              15000, 10,
              21000, 14
            ],
            10, [
              "interpolate", ["linear"], ["get", "troop_count"],
              200, 4,
              8000, 10,
              15000, 16,
              21000, 22
            ]
          ],
          "circle-color": [
            "case",
            ["==", ["get", "faction"], "allied"], "#00d4ff",
            "#ff3344"
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": [
            "case",
            ["==", ["get", "faction"], "allied"], "rgba(0, 212, 255, 0.6)",
            "rgba(255, 51, 68, 0.6)"
          ],
        },
      });

      // Click handler
      map.current.on("click", "units-layer", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        if (props?.unit_id) {
          useAppStore.getState().setSelectedUnitId(props.unit_id);
        }
      });

      // Hover: pointer cursor + tooltip
      map.current.on("mouseenter", "units-layer", (e) => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "pointer";

        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({
            closeButton: false,
            closeOnClick: false,
            className: "unit-tooltip",
            offset: 12,
          })
            .setLngLat(coords)
            .setHTML(
              `<div style="font-family:monospace;font-size:11px;color:#e0e0e0;padding:2px 4px;">
                <strong>${props?.unit_name}</strong><br/>
                <span style="color:${props?.faction === 'allied' ? '#00d4ff' : '#ff3344'}">${props?.unit_type?.toUpperCase()}</span>
                &nbsp;·&nbsp;${Number(props?.troop_count).toLocaleString()} troops
                &nbsp;·&nbsp;STR ${props?.strength_percent}%
              </div>`
            )
            .addTo(map.current);
        }
      });

      map.current.on("mouseleave", "units-layer", () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });
      // Click map background to deselect
      map.current.on("click", (e) => {
        if (!map.current) return;
        const features = map.current.queryRenderedFeatures(e.point, { layers: ["units-layer"] });
        if (features.length === 0) {
          useAppStore.getState().setSelectedUnitId(null);
        }
      });
    });

    map.current.addControl(
      new mapboxgl.NavigationControl({ visualizePitch: true }),
      "top-right"
    );

    return () => {
      map.current?.remove();
      map.current = null;
    };
  }, []);

  // Subscribe to timeline changes and update the map source
  useEffect(() => {
    let prevDate = useAppStore.getState().currentDate;
    const unsub = useAppStore.subscribe((state) => {
      if (state.currentDate !== prevDate) {
        prevDate = state.currentDate;
        if (!map.current) return;
        const source = map.current.getSource("units") as mapboxgl.GeoJSONSource | undefined;
        if (source) {
          source.setData(unitsToGeoJSON(state.currentDate));
        }
      }
    });
    return unsub;
  }, []);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
}
