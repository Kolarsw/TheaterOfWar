"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppStore } from "@/stores/useAppStore";
import alliedUnits from "@/data/mock-units.json";
import axisUnits from "@/data/mock-units-axis.json";
import hierarchicalUnits from "@/data/mock-units-hierarchical.json";
import axisHierarchicalUnits from "@/data/mock-units-axis-hierarchical.json";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

// Merge all units, preferring hierarchical data
const hierarchicalIds = new Set([...hierarchicalUnits, ...axisHierarchicalUnits].map((u) => u.unit_id));
const allUnits = [
  ...hierarchicalUnits,
  ...axisHierarchicalUnits,
  ...alliedUnits.filter((u) => !hierarchicalIds.has(u.unit_id)),
  ...axisUnits.filter((u) => !hierarchicalIds.has(u.unit_id)),
];

// Scale: 1 point per ~500 troops, spread around the unit's position
function generateTroopPoints(beforeDate?: string): GeoJSON.FeatureCollection {
  const features: GeoJSON.Feature[] = [];
  const filtered = allUnits.filter(
    (u) => !beforeDate || new Date(u.timestamp).getTime() <= new Date(beforeDate).getTime()
  );

  filtered.forEach((u) => {
    const pointCount = Math.max(1, Math.round(u.troop_count / 500));
    // Spread radius in degrees — larger units spread wider
    const spread = Math.min(0.02, 0.002 + (u.troop_count / 500000));

    for (let i = 0; i < pointCount; i++) {
      // Distribute in a rough circle around the unit center
      const angle = (i / pointCount) * Math.PI * 2 + (Math.random() * 0.3);
      const dist = spread * Math.sqrt(Math.random());
      const lng = u.lng + Math.cos(angle) * dist;
      const lat = u.lat + Math.sin(angle) * dist;

      features.push({
        type: "Feature",
        geometry: { type: "Point", coordinates: [lng, lat] },
        properties: {
          unit_id: u.unit_id,
          unit_name: u.unit_name,
          faction: u.faction,
          unit_type: u.unit_type,
          troop_count: u.troop_count,
          strength_percent: u.strength_percent,
          point_troops: Math.round(u.troop_count / pointCount),
        },
      });
    }
  });

  return { type: "FeatureCollection", features };
}

// Create triangle image for the map
function createTriangleImage(map: mapboxgl.Map, id: string, color: string, size: number) {
  const canvas = document.createElement("canvas");
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(size / 2, 1);
  ctx.lineTo(size - 1, size - 1);
  ctx.lineTo(1, size - 1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = 1;
  ctx.globalAlpha = 0.6;
  ctx.stroke();

  const imageData = ctx.getImageData(0, 0, size, size);
  map.addImage(id, { width: size, height: size, data: new Uint8Array(imageData.data.buffer) });
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

      // Create triangle icons
      createTriangleImage(map.current, "triangle-allied", "#00d4ff", 12);
      createTriangleImage(map.current, "triangle-axis", "#ff3344", 12);

      // Clustered source — points merge at low zoom, break apart at high zoom
      const currentDate = useAppStore.getState().currentDate;
      map.current.addSource("units", {
        type: "geojson",
        data: generateTroopPoints(currentDate),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
        clusterProperties: {
          total_troops: ["+", ["get", "point_troops"]],
          allied_count: ["+", ["case", ["==", ["get", "faction"], "allied"], 1, 0]],
          axis_count: ["+", ["case", ["==", ["get", "faction"], "axis"], 1, 0]],
        },
      });

      // --- CLUSTERED circles (zoomed out) ---
      map.current.addLayer({
        id: "clusters-glow",
        type: "circle",
        source: "units",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "total_troops"],
            100, 8,
            5000, 14,
            15000, 22,
            30000, 32
          ],
          "circle-color": [
            "case",
            [">", ["get", "allied_count"], ["get", "axis_count"]], "rgba(0, 212, 255, 0.12)",
            "rgba(255, 51, 68, 0.12)"
          ],
          "circle-blur": 1,
        },
      });

      map.current.addLayer({
        id: "clusters",
        type: "circle",
        source: "units",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "total_troops"],
            100, 5,
            5000, 10,
            15000, 16,
            30000, 24
          ],
          "circle-color": [
            "case",
            [">", ["get", "allied_count"], ["get", "axis_count"]], "#00d4ff",
            "#ff3344"
          ],
          "circle-stroke-width": 1,
          "circle-stroke-color": [
            "case",
            [">", ["get", "allied_count"], ["get", "axis_count"]], "rgba(0, 212, 255, 0.5)",
            "rgba(255, 51, 68, 0.5)"
          ],
          "circle-opacity": [
            "interpolate", ["linear"], ["get", "total_troops"],
            0, 1,
            1999, 1,
            2000, 0.55,
            20000, 0.4
          ],
        },
      });

      // Cluster troop count label
      map.current.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "units",
        filter: ["has", "point_count"],
        layout: {
          "text-field": [
            "concat",
            ["case",
              [">=", ["get", "total_troops"], 1000],
              ["concat", ["to-string", ["round", ["/", ["get", "total_troops"], 1000]]], "k"],
              ["to-string", ["get", "total_troops"]]
            ]
          ],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 10,
          "text-allow-overlap": true,
        },
        paint: {
          "text-color": "#ffffff",
          "text-opacity": 0.8,
        },
      });

      // --- UNCLUSTERED points (zoomed in) — triangles ---
      map.current.addLayer({
        id: "unclustered-triangles",
        type: "symbol",
        source: "units",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": [
            "case",
            ["==", ["get", "faction"], "allied"], "triangle-allied",
            "triangle-axis"
          ],
          "icon-size": [
            "interpolate", ["linear"], ["zoom"],
            8, 0.6,
            12, 1.0,
            15, 1.4
          ],
          "icon-allow-overlap": true,
        },
      });

      // --- Interactions ---

      // Click cluster to zoom in
      map.current.on("click", "clusters", (e) => {
        if (!map.current || !e.features?.[0]) return;
        const clusterId = e.features[0].properties?.cluster_id;
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const source = map.current.getSource("units") as mapboxgl.GeoJSONSource;
        const mapRef = map.current;
        (source as any).getClusterExpansionZoom(clusterId, (err: any, expansionZoom: number) => {
          if (err) return;
          mapRef.easeTo({ center: coords, zoom: expansionZoom + 1 });
        });
      });

      // Click unclustered triangle to select unit
      map.current.on("click", "unclustered-triangles", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        if (props?.unit_id) {
          useAppStore.getState().setSelectedUnitId(props.unit_id);
        }
      });

      // Hover on clusters
      map.current.on("mouseenter", "clusters", (e) => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "pointer";
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
          const troops = Number(props?.total_troops || 0);
          const points = Number(props?.point_count || 0);

          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({
            closeButton: false, closeOnClick: false,
            className: "unit-tooltip", offset: 12,
          })
            .setLngLat(coords)
            .setHTML(
              `<div style="font-family:monospace;font-size:11px;color:#e0e0e0;padding:2px 4px;">
                <strong>${troops.toLocaleString()} troops</strong><br/>
                ${points} sub-groups · Click to zoom
              </div>`
            )
            .addTo(map.current);
        }
      });

      // Hover on triangles
      map.current.on("mouseenter", "unclustered-triangles", (e) => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "pointer";
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];

          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({
            closeButton: false, closeOnClick: false,
            className: "unit-tooltip", offset: 12,
          })
            .setLngLat(coords)
            .setHTML(
              `<div style="font-family:monospace;font-size:11px;color:#e0e0e0;padding:2px 4px;">
                <strong>${props?.unit_name}</strong><br/>
                <span style="color:${props?.faction === 'allied' ? '#00d4ff' : '#ff3344'}">${props?.unit_type?.toUpperCase()}</span>
                &nbsp;·&nbsp;~${Number(props?.point_troops).toLocaleString()} troops
                &nbsp;·&nbsp;STR ${props?.strength_percent}%
              </div>`
            )
            .addTo(map.current);
        }
      });

      map.current.on("mouseleave", "clusters", () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      map.current.on("mouseleave", "unclustered-triangles", () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      // Click background to deselect
      map.current.on("click", (e) => {
        if (!map.current) return;
        const features = map.current.queryRenderedFeatures(e.point, {
          layers: ["clusters", "unclustered-triangles"],
        });
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

  // Subscribe to timeline changes
  useEffect(() => {
    let prevDate = useAppStore.getState().currentDate;
    const unsub = useAppStore.subscribe((state) => {
      if (state.currentDate !== prevDate) {
        prevDate = state.currentDate;
        if (!map.current) return;
        const source = map.current.getSource("units") as mapboxgl.GeoJSONSource | undefined;
        if (source) {
          source.setData(generateTroopPoints(state.currentDate));
        }
      }
    });
    return unsub;
  }, []);

  // Subscribe to layer toggle changes
  useEffect(() => {
    let prevLayers = useAppStore.getState().visibleLayers;
    const unsub = useAppStore.subscribe((state) => {
      if (state.visibleLayers !== prevLayers) {
        prevLayers = state.visibleLayers;
        if (!map.current) return;
        const visibility = state.visibleLayers.units ? "visible" : "none";
        const layerIds = ["clusters", "clusters-glow", "cluster-count", "unclustered-triangles"];
        layerIds.forEach((id) => {
          if (map.current!.getLayer(id)) {
            map.current!.setLayoutProperty(id, "visibility", visibility);
          }
        });
      }
    });
    return unsub;
  }, []);

  // Subscribe to flyTo requests
  useEffect(() => {
    const unsub = useAppStore.subscribe((state) => {
      if (state.flyToTarget && map.current) {
        map.current.flyTo({
          center: [state.flyToTarget.lng, state.flyToTarget.lat],
          zoom: state.flyToTarget.zoom,
          duration: 1500,
        });
        // Clear the target so it doesn't re-trigger
        useAppStore.setState({ flyToTarget: null });
      }
    });
    return unsub;
  }, []);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
}
