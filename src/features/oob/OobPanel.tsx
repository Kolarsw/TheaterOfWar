"use client";

import { useState, useMemo } from "react";
import { useAppStore } from "@/stores/useAppStore";
import hierarchicalUnits from "@/data/mock-units-hierarchical.json";
import alliedUnits from "@/data/mock-units.json";
import axisUnits from "@/data/mock-units-axis.json";
import axisHierarchicalUnits from "@/data/mock-units-axis-hierarchical.json";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";
const RED = "#ff3344";

interface UnitNode {
  unit_id: string;
  unit_name: string;
  faction: string;
  unit_type: string;
  echelon?: string;
  parent_unit_id: string | null;
  troop_count: number;
  strength_percent: number;
  lat: number;
  lng: number;
  children: UnitNode[];
}

function buildTree(units: UnitNode[]): UnitNode[] {
  const map = new Map<string, UnitNode>();
  const roots: UnitNode[] = [];

  units.forEach((u) => {
    map.set(u.unit_id, { ...u, children: [] });
  });

  units.forEach((u) => {
    const node = map.get(u.unit_id)!;
    if (u.parent_unit_id && map.has(u.parent_unit_id)) {
      map.get(u.parent_unit_id)!.children.push(node);
    } else {
      roots.push(node);
    }
  });

  return roots;
}

function TreeNode({ node, depth, accent, borderColor }: {
  node: UnitNode;
  depth: number;
  accent: string;
  borderColor: string;
}) {
  const [expanded, setExpanded] = useState(depth < 2);
  const selectedUnitId = useAppStore((s) => s.selectedUnitId);
  const setSelectedUnitId = useAppStore((s) => s.setSelectedUnitId);
  const flyTo = useAppStore((s) => s.flyTo);
  const isSelected = selectedUnitId === node.unit_id;
  const hasChildren = node.children.length > 0;
  const factionColor = node.faction === "allied" ? CYAN : RED;

  return (
    <div>
      <button
        onClick={() => {
          setSelectedUnitId(node.unit_id);
          if (hasChildren) setExpanded(!expanded);
        }}
        onDoubleClick={() => {
          setSelectedUnitId(node.unit_id);
          // Zoom level based on echelon
          const zoomLevel = node.echelon === "company" ? 14
            : node.echelon === "battalion" ? 12
            : node.echelon === "regiment" ? 10
            : 8;
          flyTo(node.lng, node.lat, zoomLevel);
        }}
        className="w-full flex items-center gap-1.5 py-1 px-1 rounded text-left transition-colors hover:bg-white/5"
        style={{
          paddingLeft: `${depth * 12 + 4}px`,
          backgroundColor: isSelected ? `${factionColor}15` : undefined,
        }}
      >
        {/* Expand/collapse indicator */}
        <span className="text-[9px] font-mono w-3 text-foreground/30 flex-shrink-0">
          {hasChildren ? (expanded ? "▼" : "▶") : "·"}
        </span>

        {/* Echelon badge */}
        <span
          className="text-[8px] font-mono uppercase tracking-wider px-1 rounded flex-shrink-0"
          style={{ color: factionColor, border: `1px solid ${factionColor}40` }}
        >
          {node.echelon?.slice(0, 3) || "div"}
        </span>

        {/* Unit name */}
        <span
          className="text-[10px] font-mono truncate"
          style={{ color: isSelected ? factionColor : "rgba(224,224,224,0.6)" }}
        >
          {node.unit_name}
        </span>

        {/* Troop count */}
        <span className="text-[9px] font-mono text-foreground/25 ml-auto flex-shrink-0">
          {node.troop_count.toLocaleString()}
        </span>
      </button>

      {/* Children */}
      {expanded && hasChildren && (
        <div>
          {node.children.map((child) => (
            <TreeNode
              key={child.unit_id}
              node={child}
              depth={depth + 1}
              accent={accent}
              borderColor={borderColor}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export default function OobPanel() {
  const mode = useAppStore((s) => s.mode);
  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";
  const [collapsed, setCollapsed] = useState(false);

  // Combine all units with echelon info
  const allUnitsWithEchelon = useMemo(() => {
    const hierarchical = [...hierarchicalUnits, ...axisHierarchicalUnits].map((u) => ({
      ...u,
      echelon: u.echelon || "division",
      children: [] as UnitNode[],
    }));

    // Add non-hierarchical units as top-level divisions
    const hierarchicalIds = new Set([...hierarchicalUnits, ...axisHierarchicalUnits].map((u) => u.unit_id));
    const otherAllied = alliedUnits
      .filter((u) => !hierarchicalIds.has(u.unit_id))
      .map((u) => ({
        ...u,
        echelon: "division",
        parent_unit_id: null,
        children: [] as UnitNode[],
      }));
    const otherAxis = axisUnits
      .filter((u) => !hierarchicalIds.has(u.unit_id))
      .map((u) => ({
        ...u,
        echelon: "division",
        parent_unit_id: null,
        children: [] as UnitNode[],
      }));

    return [...hierarchical, ...otherAllied, ...otherAxis];
  }, []);

  const alliedTree = useMemo(
    () => buildTree(allUnitsWithEchelon.filter((u) => u.faction === "allied")),
    [allUnitsWithEchelon]
  );
  const axisTree = useMemo(
    () => buildTree(allUnitsWithEchelon.filter((u) => u.faction === "axis")),
    [allUnitsWithEchelon]
  );

  if (collapsed) {
    return (
      <div className="absolute top-4 left-4 z-10 mt-14">
        <button
          onClick={() => setCollapsed(false)}
          className="bg-panel/35 backdrop-blur-sm rounded-lg px-3 py-2 text-[10px] font-mono tracking-widest uppercase transition-colors hover:bg-white/5"
          style={{ border: `2px solid ${borderColor}`, color: accent }}
        >
          OOB ▶
        </button>
      </div>
    );
  }

  return (
    <div className="absolute top-4 left-4 z-10 mt-14 w-72 max-h-[calc(100%-18rem)] flex flex-col">
      <div
        className="bg-panel/35 backdrop-blur-sm rounded-lg overflow-hidden flex flex-col"
        style={{ border: `2px solid ${borderColor}` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-3 py-2 border-b border-panel-border">
          <span
            className="text-xs font-mono tracking-widest uppercase"
            style={{ color: accent, opacity: 0.6 }}
          >
            Order of Battle
          </span>
          <button
            onClick={() => setCollapsed(true)}
            className="text-[10px] font-mono text-foreground/30 hover:text-foreground/60"
          >
            ◀
          </button>
        </div>

        {/* Tree content */}
        <div className="overflow-y-auto flex-1 py-1">
          {/* Allied section */}
          <div className="px-2 py-1">
            <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: CYAN, opacity: 0.5 }}>
              Allied Forces
            </span>
          </div>
          {alliedTree.map((node) => (
            <TreeNode key={node.unit_id} node={node} depth={0} accent={accent} borderColor={borderColor} />
          ))}

          {/* Divider */}
          <div className="border-t border-panel-border my-2" />

          {/* Axis section */}
          <div className="px-2 py-1">
            <span className="text-[9px] font-mono tracking-widest uppercase" style={{ color: RED, opacity: 0.5 }}>
              Axis Forces
            </span>
          </div>
          {axisTree.map((node) => (
            <TreeNode key={node.unit_id} node={node} depth={0} accent={accent} borderColor={borderColor} />
          ))}
        </div>
      </div>
    </div>
  );
}
