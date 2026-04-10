"use client";

import { useEffect, useRef } from "react";
import mapboxgl from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { useAppStore } from "@/stores/useAppStore";
import { getTroopPoints, getRootDivisionId, hasEquipmentData, getSupplyLineGeoJSON, getSupplyLineArrowheads, getEventGeoJSON, getTerritoryControl } from "@/services/dataService";
import gadmFrance from "@/data/gadm-france-departments.json";

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN || "";

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

function createArrowImage(map: mapboxgl.Map, id: string, color: string, size: number) {
  const canvas = document.createElement("canvas");
  const w = size;
  const h = size;
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = color;
  // Simple triangle arrowhead pointing right, same height as line width
  ctx.beginPath();
  ctx.moveTo(w, h / 2);       // tip
  ctx.lineTo(0, 0);            // top-left
  ctx.lineTo(w * 0.2, h / 2); // notch
  ctx.lineTo(0, h);            // bottom-left
  ctx.closePath();
  ctx.fill();
  const imageData = ctx.getImageData(0, 0, w, h);
  map.addImage(id, { width: w, height: h, data: new Uint8Array(imageData.data.buffer) });
}

export default function GlobeMap() {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<mapboxgl.Map | null>(null);
  const popupRef = useRef<mapboxgl.Popup | null>(null);

  function getTerritoryGeoJSON(beforeDate?: string): GeoJSON.FeatureCollection {
    const control = getTerritoryControl(beforeDate);
    const controlMap = new Map<string, { faction: string; supply_density: number }>();
    control.forEach((c) => {
      controlMap.set(c.region_id, { faction: c.controlling_faction, supply_density: c.supply_density });
    });

    return {
      type: "FeatureCollection",
      features: (gadmFrance as GeoJSON.FeatureCollection).features
        .filter((f) => controlMap.has(f.properties?.region_id))
        .map((f) => {
          const data = controlMap.get(f.properties?.region_id)!;
          return {
            ...f,
            properties: {
              ...f.properties,
              faction: data.faction,
              supply_density: data.supply_density,
            },
          };
        }),
    };
  }

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
        "high-color": "rgb(0, 60, 95)",
        "horizon-blend": 0.6,
        "space-color": "rgb(8, 10, 18)",
        "star-intensity": 0.55,
      });

      map.current.setPaintProperty("land", "background-color", "#2a2a2a");
      map.current.setPaintProperty("water", "fill-color", "rgba(16, 24, 48, 0.75)");

      createTriangleImage(map.current, "triangle-allied", "#00d4ff", 12);
      createTriangleImage(map.current, "triangle-axis", "#ff3344", 12);

      // Create arrowhead image for supply arc destinations
      createArrowImage(map.current, "arrow-cyan", "#00d4ff", 18);
      createArrowImage(map.current, "arrow-red", "#ff3344", 18);
      createArrowImage(map.current, "arrow-green", "#44ffaa", 18);
      createArrowImage(map.current, "arrow-amber", "#ffaa00", 18);

      const currentDate = useAppStore.getState().currentDate;
      map.current.addSource("units", {
        type: "geojson",
        data: getTroopPoints(currentDate),
        cluster: true,
        clusterMaxZoom: 14,
        clusterRadius: 40,
        clusterProperties: {
          total_troops: ["+", ["get", "point_troops"]],
          allied_count: ["+", ["case", ["==", ["get", "faction"], "allied"], 1, 0]],
          axis_count: ["+", ["case", ["==", ["get", "faction"], "axis"], 1, 0]],
        },
      });

      // Cluster glow
      map.current.addLayer({
        id: "clusters-glow",
        type: "circle",
        source: "units",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "total_troops"], 100, 8, 5000, 14, 15000, 22, 30000, 32],
          "circle-color": ["case", [">", ["get", "allied_count"], ["get", "axis_count"]], "rgba(0, 212, 255, 0.12)", "rgba(255, 51, 68, 0.12)"],
          "circle-blur": 1,
        },
      });

      // Cluster circles
      map.current.addLayer({
        id: "clusters",
        type: "circle",
        source: "units",
        filter: ["has", "point_count"],
        paint: {
          "circle-radius": ["interpolate", ["linear"], ["get", "total_troops"], 100, 5, 5000, 10, 15000, 16, 30000, 24],
          "circle-color": ["case", [">", ["get", "allied_count"], ["get", "axis_count"]], "#00d4ff", "#ff3344"],
          "circle-stroke-width": 1,
          "circle-stroke-color": ["case", [">", ["get", "allied_count"], ["get", "axis_count"]], "rgba(0, 212, 255, 0.5)", "rgba(255, 51, 68, 0.5)"],
          "circle-opacity": ["interpolate", ["linear"], ["get", "total_troops"], 0, 1, 1999, 1, 2000, 0.55, 20000, 0.4],
        },
      });

      // Cluster labels
      map.current.addLayer({
        id: "cluster-count",
        type: "symbol",
        source: "units",
        filter: ["has", "point_count"],
        layout: {
          "text-field": ["concat", ["case", [">=", ["get", "total_troops"], 1000], ["concat", ["to-string", ["round", ["/", ["get", "total_troops"], 1000]]], "k"], ["to-string", ["get", "total_troops"]]]],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 10,
          "text-allow-overlap": true,
        },
        paint: { "text-color": "#ffffff", "text-opacity": 0.8 },
      });

      // Unclustered triangles
      map.current.addLayer({
        id: "unclustered-triangles",
        type: "symbol",
        source: "units",
        filter: ["!", ["has", "point_count"]],
        layout: {
          "icon-image": ["case", ["==", ["get", "faction"], "allied"], "triangle-allied", "triangle-axis"],
          "icon-size": ["interpolate", ["linear"], ["zoom"], 8, 0.6, 12, 1.0, 15, 1.4],
          "icon-allow-overlap": true,
        },
      });

      // --- Supply Line Arcs ---
      map.current.addSource("supply-lines", {
        type: "geojson",
        data: getSupplyLineGeoJSON(currentDate),
      });

      // Arc glow (wider, blurred)
      map.current.addLayer({
        id: "supply-arcs-glow",
        type: "line",
        source: "supply-lines",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "status"], "severed"], "#ff3344",
            ["==", ["get", "status"], "disrupted"], "#ffaa00",
            ["==", ["get", "supply_type"], "troops"], "rgba(68, 255, 170, 0.25)",
            ["==", ["get", "faction"], "allied"], "rgba(0, 212, 255, 0.2)",
            "rgba(255, 51, 68, 0.2)"
          ],
          "line-width": 12,
          "line-blur": 4,
          "line-opacity": 0.4,
        },
      });

      // Shadow layer for air routes (offset below to simulate altitude)
      map.current.addLayer({
        id: "supply-arcs-shadow",
        type: "line",
        source: "supply-lines",
        filter: ["==", ["get", "transport_mode"], "air"],
        paint: {
          "line-color": "rgba(0, 0, 0, 0.3)",
          "line-width": 6,
          "line-blur": 6,
          "line-translate": [3, 3],
          "line-opacity": 0.5,
        },
      });

      // Main arc lines — transport mode determines dash pattern
      // Air = solid, Sea = dashed, Land = dotted
      // Troop arcs = green (#44ffaa), supply arcs = faction color
      map.current.addLayer({
        id: "supply-arcs",
        type: "line",
        source: "supply-lines",
        layout: {
          "line-cap": "round",
          "line-join": "round",
        },
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "status"], "severed"], "#ff3344",
            ["==", ["get", "status"], "disrupted"], "#ffaa00",
            ["==", ["get", "supply_type"], "troops"], "#44ffaa",
            ["==", ["get", "faction"], "allied"], "#00d4ff",
            "#ff3344"
          ],
          "line-width": 6,
          "line-opacity": [
            "case",
            ["==", ["get", "status"], "severed"], 0.2,
            ["==", ["get", "status"], "disrupted"], 0.5,
            0.6
          ],
          "line-dasharray": [
            "case",
            ["==", ["get", "status"], "severed"], ["literal", [2, 4]],
            ["==", ["get", "transport_mode"], "sea"], ["literal", [6, 3]],
            ["==", ["get", "transport_mode"], "land"], ["literal", [0.5, 2]],
            ["literal", [1, 0]]
          ],
        },
      });

      // Supply arc hover
      map.current.on("mouseenter", "supply-arcs", (e) => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "pointer";
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const coords = e.lngLat;
          const statusColor = props?.status === "severed" ? "#ff3344" : props?.status === "disrupted" ? "#ffaa00" : props?.faction === "allied" ? "#00d4ff" : "#ff3344";

          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({
            closeButton: false, closeOnClick: false,
            className: "unit-tooltip", offset: 12,
          })
            .setLngLat(coords)
            .setHTML(
              `<div style="font-family:monospace;font-size:11px;color:#e0e0e0;padding:2px 4px;">
                <strong>${props?.source_name} → ${props?.target_name}</strong><br/>
                <span style="color:${statusColor}">${props?.supply_type?.toUpperCase()} · ${Number(props?.tonnage_per_day).toLocaleString()} tons/day</span><br/>
                <span style="color:${statusColor}">Status: ${props?.status?.toUpperCase()}</span>
              </div>`
            )
            .addTo(map.current);
        }
      });

      map.current.on("mouseleave", "supply-arcs", () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      // Arrowhead source and layer at supply line destinations
      map.current.addSource("supply-arrows", {
        type: "geojson",
        data: getSupplyLineArrowheads(currentDate),
      });

      map.current.addLayer({
        id: "supply-arrow-heads",
        type: "symbol",
        source: "supply-arrows",
        layout: {
          "icon-image": [
            "case",
            ["==", ["get", "status"], "severed"], "arrow-red",
            ["==", ["get", "status"], "disrupted"], "arrow-amber",
            ["==", ["get", "supply_type"], "troops"], "arrow-green",
            ["==", ["get", "faction"], "allied"], "arrow-cyan",
            "arrow-red"
          ],
          "icon-size": 0.8,
          "icon-rotate": ["get", "bearing"],
          "icon-rotation-alignment": "map",
          "icon-allow-overlap": true,
        },
      });

      // --- Events/Battles Scatterplot Layer ---
      map.current.addSource("events", {
        type: "geojson",
        data: getEventGeoJSON(currentDate),
      });

      // Event glow
      map.current.addLayer({
        id: "events-glow",
        type: "circle",
        source: "events",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "significance"],
            0, 10,
            5000, 16,
            30000, 24,
            80000, 34
          ],
          "circle-color": [
            "case",
            ["==", ["get", "outcome"], "allied_victory"], "rgba(0, 212, 255, 0.12)",
            ["==", ["get", "outcome"], "axis_victory"], "rgba(255, 51, 68, 0.12)",
            "rgba(255, 170, 0, 0.12)"
          ],
          "circle-blur": 1,
        },
      });

      // Event markers
      map.current.addLayer({
        id: "events-markers",
        type: "circle",
        source: "events",
        paint: {
          "circle-radius": [
            "interpolate", ["linear"], ["get", "significance"],
            0, 5,
            5000, 8,
            30000, 12,
            80000, 18
          ],
          "circle-color": [
            "case",
            ["==", ["get", "outcome"], "allied_victory"], "#00d4ff",
            ["==", ["get", "outcome"], "axis_victory"], "#ff3344",
            "#ffaa00"
          ],
          "circle-stroke-width": 1.5,
          "circle-stroke-color": "rgba(0, 0, 0, 0.7)",
          "circle-opacity": 0.8,
        },
      });

      // Event labels
      map.current.addLayer({
        id: "events-labels",
        type: "symbol",
        source: "events",
        layout: {
          "text-field": ["get", "event_name"],
          "text-font": ["DIN Pro Medium", "Arial Unicode MS Bold"],
          "text-size": 10,
          "text-offset": [0, 1.5],
          "text-anchor": "top",
          "text-allow-overlap": false,
        },
        paint: {
          "text-color": "rgba(224, 224, 224, 0.65)",
          "text-halo-color": "rgba(10, 10, 15, 0.8)",
          "text-halo-width": 1,
        },
      });

      // Event hover
      map.current.on("mouseenter", "events-markers", (e) => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "pointer";
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
          const outcomeColor = props?.outcome === "allied_victory" ? "#00d4ff"
            : props?.outcome === "axis_victory" ? "#ff3344" : "#ffaa00";
          const typeLabel = (props?.event_type || "").replace(/_/g, " ").toUpperCase();
          const alliedCas = props?.casualties_allied != null ? Number(props.casualties_allied).toLocaleString() : "—";
          const axisCas = props?.casualties_axis != null ? Number(props.casualties_axis).toLocaleString() : "—";

          popupRef.current?.remove();
          popupRef.current = new mapboxgl.Popup({
            closeButton: false, closeOnClick: false,
            className: "unit-tooltip", offset: 12,
          })
            .setLngLat(coords)
            .setHTML(
              `<div style="font-family:monospace;font-size:11px;color:#e0e0e0;padding:2px 4px;">
                <strong>${props?.event_name}</strong><br/>
                <span style="color:rgba(255,255,255,0.4)">${typeLabel}</span><br/>
                <span style="color:${outcomeColor}">${(props?.outcome || "").replace(/_/g, " ").toUpperCase()}</span><br/>
                <span style="color:rgba(255,255,255,0.4)">Casualties:</span> <span style="color:#00d4ff">Allied ${alliedCas}</span> · <span style="color:#ff3344">Axis ${axisCas}</span>
              </div>`
            )
            .addTo(map.current);
        }
      });

      map.current.on("mouseleave", "events-markers", () => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "";
        popupRef.current?.remove();
      });

      // Click event marker to select
      map.current.on("click", "events-markers", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        if (props?.event_id) {
          useAppStore.getState().setSelectedEventId(props.event_id);
        }
      });

      // --- H3 Hex Control Layer ---
      const hexGeoJSON = getTerritoryGeoJSON(currentDate);
      map.current.addSource("hex-control", {
        type: "geojson",
        data: hexGeoJSON,
      });

      // Hex fill
      map.current.addLayer({
        id: "hex-control-fill",
        type: "fill",
        source: "hex-control",
        paint: {
          "fill-color": [
            "case",
            ["==", ["get", "faction"], "allied"], "#00d4ff",
            ["==", ["get", "faction"], "axis"], "#ff3344",
            ["==", ["get", "faction"], "contested"], "#ffaa00",
            "rgba(255,255,255,0.05)"
          ],
          "fill-opacity": [
            "case",
            ["==", ["get", "faction"], "contested"], 0.15,
            0.12
          ],
        },
      }, "clusters-glow"); // Insert below unit layers

      // Hex borders
      map.current.addLayer({
        id: "hex-control-border",
        type: "line",
        source: "hex-control",
        paint: {
          "line-color": [
            "case",
            ["==", ["get", "faction"], "allied"], "rgba(0, 212, 255, 0.3)",
            ["==", ["get", "faction"], "axis"], "rgba(255, 51, 68, 0.3)",
            ["==", ["get", "faction"], "contested"], "rgba(255, 170, 0, 0.3)",
            "rgba(255,255,255,0.05)"
          ],
          "line-width": 1,
        },
      }, "clusters-glow");

      // Start with visibility matching the toggle
      const hexVis = useAppStore.getState().visibleLayers.hexControl ? "visible" : "none";
      ["hex-control-fill", "hex-control-border"].forEach((id) => {
        map.current!.setLayoutProperty(id, "visibility", hexVis);
      });

      // --- Interactions ---

      // Click cluster — selectable only if all points share the same root division
      map.current.on("click", "clusters", (e) => {
        if (!map.current || !e.features?.[0]) return;
        const props = e.features[0].properties;
        const pointCount = Number(props?.point_count || 0);
        if (pointCount > 100) return;

        const clusterId = props?.cluster_id;
        const source = map.current.getSource("units") as mapboxgl.GeoJSONSource;
        (source as any).getClusterLeaves(clusterId, Math.min(pointCount, 100), 0, (err: any, leaves: any[]) => {
          if (err || !leaves?.length) return;
          const rootIds = new Set(leaves.map((l: any) => l.properties?.root_division_id));
          if (rootIds.size === 1) {
            const rootId = [...rootIds][0];
            useAppStore.getState().setSelectedUnitId(rootId);
          }
        });
      });

      // Double-click cluster to zoom
      map.current.on("dblclick", "clusters", (e) => {
        if (!map.current || !e.features?.[0]) return;
        e.preventDefault();
        const clusterId = e.features[0].properties?.cluster_id;
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        const source = map.current.getSource("units") as mapboxgl.GeoJSONSource;
        const mapRef = map.current;
        (source as any).getClusterExpansionZoom(clusterId, (err: any, expansionZoom: number) => {
          if (err) return;
          mapRef.easeTo({ center: coords, zoom: expansionZoom + 1 });
        });
      });

      // Click triangle to select
      map.current.on("click", "unclustered-triangles", (e) => {
        if (!e.features || e.features.length === 0) return;
        const props = e.features[0].properties;
        if (props?.unit_id) {
          useAppStore.getState().setSelectedUnitId(props.unit_id);
        }
      });

      // Double-click triangle to zoom
      map.current.on("dblclick", "unclustered-triangles", (e) => {
        if (!map.current || !e.features?.[0]) return;
        e.preventDefault();
        const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
        map.current.flyTo({ center: coords, zoom: map.current.getZoom() + 3, duration: 1500 });
      });

      // Hover on clusters — show unit list with selectability hint
      map.current.on("mouseenter", "clusters", (e) => {
        if (!map.current) return;
        map.current.getCanvas().style.cursor = "pointer";
        if (e.features && e.features.length > 0) {
          const props = e.features[0].properties;
          const coords = (e.features[0].geometry as GeoJSON.Point).coordinates.slice() as [number, number];
          const troops = Number(props?.total_troops || 0);
          const clusterId = props?.cluster_id;
          const source = map.current.getSource("units") as mapboxgl.GeoJSONSource;
          const mapRef = map.current;

          const leafCount = Math.min(Number(props?.point_count || 0), 200);
          (source as any).getClusterLeaves(clusterId, leafCount, 0, (err: any, leaves: any[]) => {
            if (err || !leaves?.length || !mapRef) return;
            const unitNames = [...new Set(leaves.map((l: any) => l.properties?.unit_name))];
            const rootIds = new Set(leaves.map((l: any) => l.properties?.root_division_id));
            const isSingleFamily = rootIds.size === 1;

            const unitList = unitNames.slice(0, 6).map((name: string) => {
              const leaf = leaves.find((l: any) => l.properties?.unit_name === name);
              const faction = leaf?.properties?.faction;
              const unitId = leaf?.properties?.unit_id;
              const hasEquip = hasEquipmentData(unitId);
              const color = faction === "allied" ? "#00d4ff" : "#ff3344";
              return `<span style="color:${color}">· ${name}${hasEquip ? " ★" : ""}</span>`;
            }).join("<br/>");

            const more = unitNames.length > 6 ? `<br/><span style="color:rgba(255,255,255,0.3)">+${unitNames.length - 6} more</span>` : "";
            const clickHint = isSingleFamily
              ? `<span style="color:rgba(255,255,255,0.3)">Click to see unit details<br/>Dbl-click to zoom</span>`
              : `<span style="color:rgba(255,255,255,0.3)">Dbl-click to zoom</span>`;
            const equipHint = unitList.includes("★") ? `<br/><span style="color:rgba(255,255,255,0.3)">★ = equipment data</span>` : "";

            popupRef.current?.remove();
            popupRef.current = new mapboxgl.Popup({
              closeButton: false, closeOnClick: false,
              className: "unit-tooltip", offset: 12,
            })
              .setLngLat(coords)
              .setHTML(
                `<div style="font-family:monospace;font-size:11px;color:#e0e0e0;padding:2px 4px;">
                  <strong>${troops.toLocaleString()} troops</strong><br/>
                  ${unitList}${more}<br/>
                  ${clickHint}${equipHint}
                </div>`
              )
              .addTo(mapRef);
          });
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
                &nbsp;·&nbsp;STR ${props?.strength_percent}%<br/>
                <span style="color:rgba(255,255,255,0.3)">Click to see unit details<br/>Dbl-click to zoom</span>
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

    // Track zoom level
    map.current.on("zoom", () => {
      if (map.current) {
        useAppStore.getState().setMapZoom(map.current.getZoom());
      }
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
          source.setData(getTroopPoints(state.currentDate));
        }
        const supplySource = map.current.getSource("supply-lines") as mapboxgl.GeoJSONSource | undefined;
        if (supplySource) {
          supplySource.setData(getSupplyLineGeoJSON(state.currentDate));
        }
        const arrowSource = map.current.getSource("supply-arrows") as mapboxgl.GeoJSONSource | undefined;
        if (arrowSource) {
          arrowSource.setData(getSupplyLineArrowheads(state.currentDate));
        }
        const eventsSource = map.current.getSource("events") as mapboxgl.GeoJSONSource | undefined;
        if (eventsSource) {
          eventsSource.setData(getEventGeoJSON(state.currentDate));
        }
        const hexSource = map.current.getSource("hex-control") as mapboxgl.GeoJSONSource | undefined;
        if (hexSource) {
          hexSource.setData(getTerritoryGeoJSON(state.currentDate));
        }
      }
    });
    return unsub;
  }, []);

  // Subscribe to layer toggles
  useEffect(() => {
    let prevLayers = useAppStore.getState().visibleLayers;
    const unsub = useAppStore.subscribe((state) => {
      if (state.visibleLayers !== prevLayers) {
        prevLayers = state.visibleLayers;
        if (!map.current) return;
        const visibility = state.visibleLayers.units ? "visible" : "none";
        ["clusters", "clusters-glow", "cluster-count", "unclustered-triangles"].forEach((id) => {
          if (map.current!.getLayer(id)) {
            map.current!.setLayoutProperty(id, "visibility", visibility);
          }
        });
        const arcVisibility = state.visibleLayers.supplyArcs ? "visible" : "none";
        ["supply-arcs", "supply-arcs-glow", "supply-arcs-shadow", "supply-arrow-heads"].forEach((id) => {
          if (map.current!.getLayer(id)) {
            map.current!.setLayoutProperty(id, "visibility", arcVisibility);
          }
        });
        const eventsVisibility = state.visibleLayers.events ? "visible" : "none";
        ["events-glow", "events-markers", "events-labels"].forEach((id) => {
          if (map.current!.getLayer(id)) {
            map.current!.setLayoutProperty(id, "visibility", eventsVisibility);
          }
        });
        const hexVisibility = state.visibleLayers.hexControl ? "visible" : "none";
        ["hex-control-fill", "hex-control-border"].forEach((id) => {
          if (map.current!.getLayer(id)) {
            map.current!.setLayoutProperty(id, "visibility", hexVisibility);
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
        useAppStore.setState({ flyToTarget: null });
      }
    });
    return unsub;
  }, []);

  return (
    <div ref={mapContainer} className="absolute inset-0 w-full h-full" />
  );
}
