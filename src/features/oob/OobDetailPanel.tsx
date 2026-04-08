"use client";

import { useAppStore } from "@/stores/useAppStore";
import alliedUnits from "@/data/mock-units.json";
import axisUnits from "@/data/mock-units-axis.json";
import hierarchicalUnits from "@/data/mock-units-hierarchical.json";
import axisHierarchicalUnits from "@/data/mock-units-axis-hierarchical.json";
import equipmentData from "@/data/mock-equipment.json";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";
const RED = "#ff3344";

interface Unit {
  unit_id: string;
  unit_name: string;
  faction: string;
  unit_type: string;
  troop_count: number;
  strength_percent: number;
  supply_level: number;
  combat_effectiveness: number;
  morale: number;
  lat: number;
  lng: number;
}

const hierarchicalIds = new Set([...hierarchicalUnits, ...axisHierarchicalUnits].map((u) => u.unit_id));
const allUnits: Unit[] = [
  ...hierarchicalUnits as Unit[],
  ...axisHierarchicalUnits as Unit[],
  ...alliedUnits.filter((u) => !hierarchicalIds.has(u.unit_id)) as Unit[],
  ...axisUnits.filter((u) => !hierarchicalIds.has(u.unit_id)) as Unit[],
];

interface EquipmentEntry {
  personnel: { authorized: number; current: number };
  equipment: Record<string, { authorized: number; operational: number }>;
  supply_breakdown: Record<string, number>;
  recent_engagements: string[];
  command_chain: { parent: string; subordinates: string[] };
}

const equipment = equipmentData as Record<string, EquipmentEntry>;

function StatRow({ label, value, accent }: { label: string; value: string; accent: string }) {
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-mono" style={{ color: accent }}>{value}</span>
    </div>
  );
}

function BarFill({ pct, color }: { pct: number; color: string }) {
  return (
    <div className="w-full h-1.5 bg-panel-border rounded-full overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }}
      />
    </div>
  );
}

export default function OobDetailPanel() {
  const mode = useAppStore((s) => s.mode);
  const selectedUnitId = useAppStore((s) => s.selectedUnitId);
  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical"
    ? "rgba(0, 212, 255, 0.35)"
    : "rgba(255, 170, 0, 0.35)";

  const selectedUnit = selectedUnitId
    ? allUnits.find((u) => u.unit_id === selectedUnitId)
    : null;

  if (!selectedUnit) {
    return null;
  }

  const factionColor = selectedUnit.faction === "allied" ? CYAN : RED;

  // Walk up the hierarchy to find equipment data
  let equip = equipment[selectedUnit.unit_id];
  if (!equip) {
    // Check parent units for equipment data
    const allHierarchical = [...hierarchicalUnits, ...axisHierarchicalUnits];
    let currentId: string | null = selectedUnit.unit_id;
    while (!equip && currentId) {
      const unit = allHierarchical.find((u) => u.unit_id === currentId);
      if (unit?.parent_unit_id) {
        equip = equipment[unit.parent_unit_id];
        currentId = unit.parent_unit_id;
      } else {
        break;
      }
    }
  }

  return (
    <div className="absolute top-2 right-4 z-10 w-80 mt-40 max-h-[calc(100%-12rem)] flex flex-col">
      <div
        className="bg-panel/35 backdrop-blur-sm rounded-lg p-4 space-y-4 overflow-y-auto"
        style={{ border: `2px solid ${borderColor}` }}
      >
        {/* Header */}
        <div>
          <h2 className="text-xs font-mono tracking-widest uppercase mb-1" style={{ color: factionColor }}>
            {selectedUnit.unit_name}
          </h2>
          <div className="flex gap-2">
            <span className="text-[9px] font-mono px-1.5 rounded" style={{ border: `1px solid ${factionColor}40`, color: factionColor }}>
              {selectedUnit.unit_type.toUpperCase()}
            </span>
            <span className="text-[9px] font-mono px-1.5 rounded" style={{ border: `1px solid ${factionColor}40`, color: factionColor }}>
              {selectedUnit.faction.toUpperCase()}
            </span>
          </div>
        </div>

        {/* Core stats */}
        <div className="space-y-1.5">
          <StatRow label="Troops" value={selectedUnit.troop_count.toLocaleString()} accent={factionColor} />
          <StatRow label="Strength" value={`${selectedUnit.strength_percent}%`} accent={factionColor} />
          <StatRow label="Combat Eff." value={`${selectedUnit.combat_effectiveness}%`} accent={factionColor} />
          <StatRow label="Morale" value={`${selectedUnit.morale}%`} accent={factionColor} />
          <StatRow label="Position" value={`${selectedUnit.lat.toFixed(2)}°N, ${Math.abs(selectedUnit.lng).toFixed(2)}°W`} accent={factionColor} />
        </div>

        {/* Equipment detail — only for units with data */}
        {equip && (
          <>
            {/* Personnel */}
            <div>
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>
                Personnel
              </h3>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-foreground/40">Current / Authorized</span>
                <span style={{ color: factionColor }}>
                  {equip.personnel.current.toLocaleString()} / {equip.personnel.authorized.toLocaleString()}
                </span>
              </div>
              <BarFill pct={(equip.personnel.current / equip.personnel.authorized) * 100} color={factionColor} />
            </div>

            {/* Supply breakdown */}
            <div>
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>
                Supply Levels
              </h3>
              <div className="space-y-1.5">
                {Object.entries(equip.supply_breakdown).map(([type, pct]) => (
                  <div key={type}>
                    <div className="flex justify-between text-[10px] font-mono mb-0.5">
                      <span className="text-foreground/40 uppercase">{type}</span>
                      <span style={{ color: pct > 70 ? factionColor : pct > 40 ? AMBER : RED }}>{pct}%</span>
                    </div>
                    <BarFill pct={pct} color={pct > 70 ? factionColor : pct > 40 ? AMBER : RED} />
                  </div>
                ))}
              </div>
            </div>

            {/* Equipment table */}
            <div>
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>
                Equipment
              </h3>
              <div className="space-y-0.5">
                <div className="flex justify-between text-[8px] font-mono text-foreground/30 uppercase">
                  <span>Item</span>
                  <span>Oper / Auth</span>
                </div>
                {Object.entries(equip.equipment).map(([item, counts]) => {
                  if (counts.authorized === 0) return null;
                  const pct = (counts.operational / counts.authorized) * 100;
                  return (
                    <div key={item} className="flex justify-between text-[10px] font-mono">
                      <span className="text-foreground/50 truncate mr-2">{item}</span>
                      <span style={{ color: pct > 80 ? factionColor : pct > 50 ? AMBER : RED }}>
                        {counts.operational} / {counts.authorized}
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Command chain */}
            <div>
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>
                Command Chain
              </h3>
              <StatRow label="Reports to" value={equip.command_chain.parent} accent={factionColor} />
              <div className="mt-1">
                <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-wide">Subordinates</span>
                <div className="mt-0.5 space-y-0.5">
                  {equip.command_chain.subordinates.map((sub) => (
                    <p key={sub} className="text-[10px] font-mono" style={{ color: factionColor, opacity: 0.7 }}>
                      → {sub}
                    </p>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent engagements */}
            <div>
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>
                Recent Engagements
              </h3>
              {equip.recent_engagements.map((eng) => (
                <p key={eng} className="text-[10px] font-mono text-foreground/50">• {eng}</p>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
