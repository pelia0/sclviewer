import { useEffect, useMemo, useState } from "react";
import {
  Activity,
  ArrowLeft,
  Clock,
  FileText,
  Flame,
  HeartPulse,
  List,
  Map as MapIcon,
  RotateCcw,
  ShieldAlert,
  Skull,
  Sparkles,
  Swords,
  Zap,
} from "lucide-react";
import {
  CLASS_COLORS,
  DUNGEON_BY_ID,
  formatDurationMs,
  formatNumberCompact,
  getWowheadIconUrl,
  LEGION_AFFIXES,
} from "../data/legionConstants";
import {
  analyzeWindow,
  buildFightContext,
  getDungeonTimerSummary,
  type FightContext,
  type FightFilterState,
} from "../lib/combatAnalyzer";
import { loadFightArchive, type LoadProgress } from "../lib/fightLoader";
import type { WclfArchive } from "../lib/wclfReader";
import type { CatalogFight, SpellDict } from "../types/wcl";
import { TimelineChart } from "./TimelineChart";
import { useWowheadTooltips } from "./WowLinks";
import { BreakdownTab } from "./tabs/BreakdownTab";
import { BuffsTab } from "./tabs/BuffsTab";
import { CastsTab } from "./tabs/CastsTab";
import { DeathsTab } from "./tabs/DeathsTab";
import { EventsTab } from "./tabs/EventsTab";
import { InterruptsTab } from "./tabs/InterruptsTab";
import { ReplayTab } from "./tabs/ReplayTab";
import { ResourcesTab } from "./tabs/ResourcesTab";
import { SummaryTab } from "./tabs/SummaryTab";

export type FightTabId =
  | "summary"
  | "damage"
  | "damageTaken"
  | "healing"
  | "buffs"
  | "debuffs"
  | "casts"
  | "deaths"
  | "interrupts"
  | "resources"
  | "events"
  | "replay";

interface FightViewProps {
  fight: CatalogFight;
  spellDict?: SpellDict;
  onBack: () => void;
}

const TABS: Array<{ id: FightTabId; label: string; icon: typeof Flame }> = [
  { id: "summary", label: "Summary", icon: FileText },
  { id: "damage", label: "Damage Done", icon: Swords },
  { id: "damageTaken", label: "Damage Taken", icon: ShieldAlert },
  { id: "healing", label: "Healing", icon: HeartPulse },
  { id: "buffs", label: "Buffs", icon: Sparkles },
  { id: "debuffs", label: "Debuffs", icon: Flame },
  { id: "casts", label: "Casts", icon: Clock },
  { id: "deaths", label: "Deaths", icon: Skull },
  { id: "interrupts", label: "Interrupts", icon: Zap },
  { id: "resources", label: "Resources", icon: Activity },
  { id: "events", label: "Events", icon: List },
  { id: "replay", label: "Replay", icon: MapIcon },
];

export function FightView({ fight, spellDict, onBack }: FightViewProps) {
  const [archive, setArchive] = useState<WclfArchive | null>(null);
  const [ctx, setCtx] = useState<FightContext | null>(null);
  const [progress, setProgress] = useState<LoadProgress>({
    phase: "cache",
    loadedBytes: 0,
    totalBytes: fight.compressed_bytes || 1,
  });
  const [error, setError] = useState<string>("");

  const [activeTab, setActiveTab] = useState<FightTabId>("summary");
  const [filter, setFilter] = useState<FightFilterState>({
    tStartMs: 0,
    tEndMs: fight.duration_ms,
    sourceId: null,
    targetId: null,
    abilityId: null,
  });
  const [selectedEncounterId, setSelectedEncounterId] = useState<string>("all");

  useEffect(() => {
    let cancelled = false;
    setArchive(null);
    setCtx(null);
    setError("");
    setActiveTab("summary");
    setSelectedEncounterId("all");

    (async () => {
      try {
        const arch = await loadFightArchive(fight, (p) => {
          if (!cancelled) setProgress(p);
        });
        const [summary, metadata, events] = await Promise.all([
          arch.readSummary(),
          arch.readMetadata(),
          arch.readEvents(),
        ]);
        if (cancelled) return;
        const built = buildFightContext(
          summary,
          events,
          metadata?.manifest?.start_time || 0,
          spellDict
        );
        setArchive(arch);
        setCtx(built);
        setFilter({
          tStartMs: 0,
          tEndMs: built.durationMs,
          sourceId: null,
          targetId: null,
          abilityId: null,
        });
      } catch (err) {
        if (cancelled) return;
        setError(String((err as Error)?.message || err));
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [fight, spellDict]);

  const analysis = useMemo(() => {
    if (!ctx) return null;
    return analyzeWindow(ctx, filter, spellDict);
  }, [ctx, filter, spellDict]);

  const targetChoices = useMemo(() => {
    if (!ctx) return [];
    const npcs = Object.values(ctx.actorsById)
      .filter((a) => !ctx.playerIds.has(a.id) && a.type !== "Pet")
      .slice(0, 120);
    return npcs;
  }, [ctx]);

  useWowheadTooltips([fight.fight_uid, ctx]);

  const dungeon = DUNGEON_BY_ID[fight.encounter_id];
  const timer = getDungeonTimerSummary(fight.encounter_id, fight.duration_ms);

  if (error) {
    return (
      <div className="wcl-fight-shell">
        <button className="wcl-btn" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to Rankings
        </button>
        <div className="wcl-error-banner">
          <strong>Unable to load fight archive:</strong> {error}
        </div>
      </div>
    );
  }

  if (!ctx || !archive || !analysis) {
    const pct =
      progress.totalBytes > 0
        ? Math.min(100, Math.round((progress.loadedBytes / progress.totalBytes) * 100))
        : 0;
    const phaseLabel =
      progress.phase === "cache"
        ? "Checking local cache..."
        : progress.phase === "downloading"
          ? `Downloading .wclf archive (${(progress.loadedBytes / 1024).toFixed(0)} / ${(progress.totalBytes / 1024).toFixed(0)} KB)...`
          : "Decompressing XZ/MessagePack combat events...";

    return (
      <div className="wcl-fight-shell">
        <button className="wcl-btn" onClick={onBack}>
          <ArrowLeft size={14} />
          Back to Rankings
        </button>
        <div className="wcl-loading-box">
          <h3 style={{ margin: "0 0 6px", color: "var(--wcl-gold)" }}>
            Loading {dungeon?.name || fight.encounter_slug} +{fight.keystone_level}
          </h3>
          <div style={{ color: "var(--wcl-muted)", fontSize: 12.5 }}>{phaseLabel}</div>
          <div className="wcl-progress-track">
            <div className="wcl-progress-fill" style={{ width: `${progress.phase === "decoding" ? 100 : pct}%` }} />
          </div>
          <div style={{ color: "var(--wcl-dim)", fontSize: 11.5 }}>
            Report {fight.report_code} #{fight.fight_id} · Cached locally after first load
          </div>
        </div>
      </div>
    );
  }

  const handleSelectEncounter = (encId: string) => {
    setSelectedEncounterId(encId);
    if (encId === "all") {
      setFilter((prev) => ({ ...prev, tStartMs: 0, tEndMs: ctx.durationMs }));
      return;
    }
    const found = ctx.encounters.find((e) => e.id === encId);
    if (found) {
      setFilter((prev) => ({ ...prev, tStartMs: found.startMs, tEndMs: found.endMs }));
    }
  };

  return (
    <div className="wcl-fight-shell">
      {/* Top WCL Fight Header */}
      <div className="wcl-report-header">
        <div className="wcl-report-title">
          <button className="wcl-btn" onClick={onBack} style={{ marginRight: 4 }}>
            <ArrowLeft size={14} />
            Rankings
          </button>

          {dungeon && (
            <img src={getWowheadIconUrl(dungeon.icon, "medium")} alt="" className="wcl-icon-lg" style={{ borderRadius: 4, border: "1px solid var(--wcl-gold)" }} />
          )}

          <span>{dungeon?.name || fight.encounter_slug}</span>

          <span className="wcl-key-badge wcl-key-high">+{fight.keystone_level}</span>
          {timer.stars > 0 && <span className="wcl-stars">{"★".repeat(timer.stars)}</span>}

          <span style={{ color: "var(--wcl-muted)", fontSize: 13, fontWeight: 500 }}>
            {formatDurationMs(fight.duration_ms)}
          </span>

          <div style={{ display: "inline-flex", gap: 4 }}>
            {fight.affixes.map((afId) => {
              const af = LEGION_AFFIXES[afId];
              if (!af) return null;
              return (
                <a
                  key={afId}
                  href={`https://www.wowhead.com/affix=${afId}`}
                  data-wowhead={`affix=${afId}`}
                  target="_blank"
                  rel="noreferrer"
                  title={`${af.name}: ${af.description}`}
                >
                  <img src={getWowheadIconUrl(af.icon, "small")} alt={af.name} className="wcl-icon" />
                </a>
              );
            })}
          </div>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 12, fontSize: 12, color: "var(--wcl-muted)" }}>
          <span>
            Party DPS: <strong style={{ color: "var(--wcl-blue)" }}>{formatNumberCompact(analysis.damageDone.perSec)}</strong>
          </span>
          <span>
            Report: <code style={{ color: "#e2e8f0" }}>{fight.report_code}#{fight.fight_id}</code>
          </span>
        </div>
      </div>

      {/* Interactive Timeline */}
      <TimelineChart
        timeline={ctx.timeline}
        tStartMs={filter.tStartMs}
        tEndMs={filter.tEndMs}
        onSelectWindow={(a, b) => {
          setSelectedEncounterId("custom");
          setFilter((prev) => ({ ...prev, tStartMs: a, tEndMs: b }));
        }}
      />

      {/* Global WCL Filter Bar */}
      <div className="wcl-filter-bar">
        {ctx.encounters.length > 0 && (
          <div className="wcl-field">
            <label>Pull / Boss</label>
            <select
              className="wcl-select"
              value={selectedEncounterId}
              onChange={(e) => handleSelectEncounter(e.target.value)}
            >
              <option value="all">Full Dungeon Run ({formatDurationMs(ctx.durationMs)})</option>
              {ctx.encounters.map((enc) => (
                <option key={enc.id} value={enc.id}>
                  {enc.name} ({formatDurationMs(enc.endMs - enc.startMs)})
                </option>
              ))}
              {selectedEncounterId === "custom" && <option value="custom">Custom Time Selection</option>}
            </select>
          </div>
        )}

        <div className="wcl-field">
          <label>Source</label>
          <select
            className="wcl-select"
            value={filter.sourceId ?? ""}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, sourceId: e.target.value ? Number(e.target.value) : null }))
            }
          >
            <option value="">All Friendlies ({ctx.playerProfiles.length})</option>
            {ctx.playerProfiles.map((p) => (
              <option key={p.actorId} value={p.actorId} style={{ color: CLASS_COLORS[p.className] }}>
                {p.name} ({p.className} · {p.specName})
              </option>
            ))}
          </select>
        </div>

        <div className="wcl-field">
          <label>Target</label>
          <select
            className="wcl-select"
            value={filter.targetId ?? ""}
            onChange={(e) =>
              setFilter((prev) => ({ ...prev, targetId: e.target.value ? Number(e.target.value) : null }))
            }
          >
            <option value="">All Targets</option>
            <optgroup label="Players">
              {ctx.playerProfiles.map((p) => (
                <option key={`p-${p.actorId}`} value={p.actorId}>
                  {p.name}
                </option>
              ))}
            </optgroup>
            <optgroup label="Bosses & Enemies">
              {targetChoices.map((n) => (
                <option key={`n-${n.id}`} value={n.id}>
                  {n.name} [{n.type}]
                </option>
              ))}
            </optgroup>
          </select>
        </div>

        {(filter.sourceId !== null || filter.targetId !== null || filter.tStartMs > 0 || filter.tEndMs < ctx.durationMs) && (
          <button
            className="wcl-btn"
            onClick={() => {
              setSelectedEncounterId("all");
              setFilter({
                tStartMs: 0,
                tEndMs: ctx.durationMs,
                sourceId: null,
                targetId: null,
                abilityId: null,
              });
            }}
          >
            <RotateCcw size={13} />
            Reset All Filters
          </button>
        )}
      </div>

      {/* WCL Sub-Tabs Navigation */}
      <div className="wcl-tabs-bar">
        {TABS.map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              className={`wcl-tab-btn ${activeTab === tab.id ? "active" : ""}`}
              onClick={() => setActiveTab(tab.id)}
            >
              <Icon size={14} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Active Tab Content */}
      <div className="wcl-tab-body">
        {activeTab === "summary" && (
          <SummaryTab
            ctx={ctx}
            analysis={analysis}
            selectedPlayerId={filter.sourceId}
            onSelectPlayer={(aid) => setFilter((prev) => ({ ...prev, sourceId: aid }))}
          />
        )}

        {activeTab === "damage" && (
          <BreakdownTab
            ctx={ctx}
            breakdown={analysis.damageDone}
            selectedSourceId={filter.sourceId}
            selectedTargetId={filter.targetId}
            onSelectSource={(aid) => setFilter((prev) => ({ ...prev, sourceId: aid }))}
            onSelectTarget={(tid) => setFilter((prev) => ({ ...prev, targetId: tid }))}
          />
        )}

        {activeTab === "damageTaken" && (
          <BreakdownTab
            ctx={ctx}
            breakdown={analysis.damageTaken}
            selectedSourceId={filter.sourceId}
            selectedTargetId={filter.targetId}
            onSelectSource={(aid) => setFilter((prev) => ({ ...prev, sourceId: aid }))}
            onSelectTarget={(tid) => setFilter((prev) => ({ ...prev, targetId: tid }))}
          />
        )}

        {activeTab === "healing" && (
          <BreakdownTab
            ctx={ctx}
            breakdown={analysis.healingDone}
            selectedSourceId={filter.sourceId}
            selectedTargetId={filter.targetId}
            onSelectSource={(aid) => setFilter((prev) => ({ ...prev, sourceId: aid }))}
            onSelectTarget={(tid) => setFilter((prev) => ({ ...prev, targetId: tid }))}
          />
        )}

        {activeTab === "buffs" && (
          <BuffsTab
            mode="buffs"
            ctx={ctx}
            auras={analysis.buffs}
            tStartMs={filter.tStartMs}
            tEndMs={filter.tEndMs}
            onSelectTarget={(tid) => setFilter((prev) => ({ ...prev, targetId: tid }))}
          />
        )}

        {activeTab === "debuffs" && (
          <BuffsTab
            mode="debuffs"
            ctx={ctx}
            auras={analysis.debuffs}
            tStartMs={filter.tStartMs}
            tEndMs={filter.tEndMs}
            onSelectTarget={(tid) => setFilter((prev) => ({ ...prev, targetId: tid }))}
          />
        )}

        {activeTab === "casts" && (
          <CastsTab ctx={ctx} casts={analysis.casts} spellDict={spellDict} />
        )}

        {activeTab === "deaths" && (
          <DeathsTab
            ctx={ctx}
            friendlyDeaths={analysis.deaths.friendly}
            enemyDeaths={analysis.deaths.enemy}
            spellDict={spellDict}
          />
        )}

        {activeTab === "interrupts" && (
          <InterruptsTab ctx={ctx} interrupts={analysis.interrupts} spellDict={spellDict} />
        )}

        {activeTab === "resources" && (
          <ResourcesTab
            ctx={ctx}
            hpByActor={analysis.hpByActor}
            resourcesByActor={analysis.resourcesByActor}
            tStartMs={filter.tStartMs}
            tEndMs={filter.tEndMs}
            selectedPlayerId={filter.sourceId}
          />
        )}

        {activeTab === "events" && (
          <EventsTab ctx={ctx} filter={filter} spellDict={spellDict} />
        )}

        {activeTab === "replay" && (
          <ReplayTab archive={archive} ctx={ctx} selectedPlayerId={filter.sourceId} />
        )}
      </div>
    </div>
  );
}
