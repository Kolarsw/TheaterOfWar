"use client";

import { useAppStore } from "@/stores/useAppStore";
import { getUnitById, getEquipment } from "@/services/dataService";

const CYAN = "#00d4ff";
const AMBER = "#ffaa00";
const RED = "#ff3344";

function StatRow({ label, value, accent }: { label: string; value: string | null | undefined; accent: string }) {
  const isNullValue = value === null || value === undefined || value === "—";
  return (
    <div className="flex justify-between items-center">
      <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-wide">{label}</span>
      <span className="text-xs font-mono" style={{ color: isNullValue ? "rgba(224,224,224,0.2)" : accent }}>
        {isNullValue ? "—" : value}
      </span>
    </div>
  );
}

function BarFill({ pct, color }: { pct: number | null | undefined; color: string }) {
  if (pct === null || pct === undefined) return null;
  return (
    <div className="w-full h-1.5 bg-panel-border rounded-full overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: color, opacity: 0.7 }} />
    </div>
  );
}

export default function OobDetailPanel() {
  const mode = useAppStore((s) => s.mode);
  const selectedUnitId = useAppStore((s) => s.selectedUnitId);
  const accent = mode === "historical" ? CYAN : AMBER;
  const borderColor = mode === "historical" ? "rgba(0, 212, 255, 0.35)" : "rgba(255, 170, 0, 0.35)";

  const selectedUnit = selectedUnitId ? getUnitById(selectedUnitId) : null;
  if (!selectedUnit) return null;

  const factionColor = selectedUnit.faction === "allied" ? CYAN : RED;
  const equip = getEquipment(selectedUnit.unit_id);

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
          <StatRow label="Troops" value={selectedUnit.troop_count?.toLocaleString()} accent={factionColor} />
          <StatRow label="Strength" value={selectedUnit.strength_percent != null ? `${selectedUnit.strength_percent}%` : null} accent={factionColor} />
          <StatRow label="Combat Eff." value={selectedUnit.combat_effectiveness != null ? `${selectedUnit.combat_effectiveness}%` : null} accent={factionColor} />
          <StatRow label="Morale" value={selectedUnit.morale != null ? `${selectedUnit.morale}%` : null} accent={factionColor} />
          <StatRow label="Position" value={`${selectedUnit.lat.toFixed(2)}°N, ${Math.abs(selectedUnit.lng).toFixed(2)}°W`} accent={factionColor} />
        </div>

        {equip && (
          <>
            {/* Personnel */}
            <div>
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>Personnel</h3>
              <div className="flex justify-between text-[10px] font-mono mb-1">
                <span className="text-foreground/40">Current / Authorized</span>
                <span style={{ color: factionColor }}>{equip.personnel.current.toLocaleString()} / {equip.personnel.authorized.toLocaleString()}</span>
              </div>
              <BarFill pct={(equip.personnel.current / equip.personnel.authorized) * 100} color={factionColor} />
            </div>

            {/* Supply breakdown */}
            <div>
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>Supply Levels</h3>
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
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>Equipment</h3>
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
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>Command Chain</h3>
              <StatRow label="Reports to" value={equip.command_chain.parent} accent={factionColor} />
              <div className="mt-1">
                <span className="text-[10px] font-mono text-foreground/40 uppercase tracking-wide">Subordinates</span>
                <div className="mt-0.5 space-y-0.5">
                  {equip.command_chain.subordinates.map((sub) => (
                    <p key={sub} className="text-[10px] font-mono" style={{ color: factionColor, opacity: 0.7 }}>→ {sub}</p>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent engagements */}
            <div>
              <h3 className="text-[9px] font-mono tracking-widest uppercase mb-1.5" style={{ color: accent, opacity: 0.5 }}>Recent Engagements</h3>
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
