import {
  CLASS_COLORS,
  DUNGEON_BY_ID,
  GEAR_SLOT_NAMES,
  LEGION_BOSS_NAMES,
  RESOURCE_TYPES,
  SPEC_BY_ID,
} from "../data/legionConstants";
import type {
  RawCombatEvent,
  SpellDict,
  WclfAbility,
  WclfActor,
  WclfCombatantBuild,
  WclfGearItem,
  WclfSummary,
} from "../types/wcl";

export interface FightFilterState {
  tStartMs: number;
  tEndMs: number;
  sourceId: number | null; // null = all friendlies (or all targets in damageTaken)
  targetId: number | null;
  abilityId: number | null;
}

export interface EncounterSegment {
  id: string;
  encounterId: number;
  name: string;
  startMs: number;
  endMs: number;
  kill: boolean;
}

export interface TimelineBucket {
  tMs: number;
  dps: number;
  hps: number;
  dtps: number;
}

export interface TimelineOverview {
  durationMs: number;
  bucketMs: number;
  buckets: TimelineBucket[];
  deaths: Array<{ tMs: number; actorId: number; actorName: string; classColor: string }>;
  encounters: EncounterSegment[];
}

export interface ResolvedGearSlot {
  slotIndex: number;
  slotName: string;
  id: number;
  itemLevel: number;
  quality: number;
  icon: string;
  bonusIDs: number[];
  gems: Array<{ id: number; itemLevel: number; icon: string }>;
  permanentEnchant?: number;
  onUseEnchant?: number;
  setID?: number;
  isLegendary: boolean;
  wowheadUrl: string;
  wowheadData: string;
}

export interface PlayerStats {
  strength: number;
  agility: number;
  stamina: number;
  intellect: number;
  armor: number;
  critRating: number;
  critPct: number;
  hasteRating: number;
  hastePct: number;
  masteryRating: number;
  masteryPct: number;
  versDamageRating: number;
  versDamagePct: number;
  versHealPct: number;
  versReductionPct: number;
  leechRating: number;
  leechPct: number;
  avoidanceRating: number;
  avoidancePct: number;
  speedRating: number;
  speedPct: number;
  dodgePct: number;
  parryPct: number;
  blockPct: number;
}

export interface PlayerProfile {
  actorId: number;
  name: string;
  server?: string;
  className: string;
  specName: string;
  specId: number;
  role: "tank" | "healer" | "dps";
  color: string;
  ilvl: number;
  dps: number;
  hps: number;
  stats: PlayerStats | null;
  talents: Array<{ id: number; name: string; icon: string; row: number }>;
  artifact: Array<{ spellId: number; name: string; icon: string; rank: number }>;
  gear: ResolvedGearSlot[];
}

export interface BreakdownActorRow {
  actorId: number;
  name: string;
  className: string;
  color: string;
  total: number;
  rawTotal: number;
  overkillOrOverheal: number;
  absorbed: number;
  perSec: number;
  hits: number;
  crits: number;
  critPct: number;
  sharePct: number;
  activePct: number;
}

export interface BreakdownAbilityRow {
  abilityId: number;
  name: string;
  icon: string;
  school: number;
  total: number;
  rawTotal: number;
  overkillOrOverheal: number;
  absorbed: number;
  perSec: number;
  hits: number;
  crits: number;
  critPct: number;
  avgHit: number;
  maxHit: number;
  sharePct: number;
}

export interface BreakdownTargetRow {
  targetId: number;
  name: string;
  type: string;
  color: string;
  total: number;
  perSec: number;
  hits: number;
  crits: number;
  sharePct: number;
}

export interface BreakdownResult {
  mode: "damage" | "healing" | "damageTaken";
  total: number;
  rawTotal: number;
  perSec: number;
  durationMs: number;
  byActor: BreakdownActorRow[];
  byAbility: BreakdownAbilityRow[];
  byTarget: BreakdownTargetRow[];
  series: Array<{ tMs: number; total: number; byActor: Record<number, number> }>;
}

export interface AuraRow {
  abilityId: number;
  name: string;
  icon: string;
  school: number;
  targetId: number;
  targetName: string;
  applications: number;
  refreshes: number;
  maxStacks: number;
  uptimeMs: number;
  uptimePct: number;
  intervals: Array<[number, number]>;
}

export interface CastAbilityRow {
  abilityId: number;
  name: string;
  icon: string;
  school: number;
  count: number;
  cpm: number;
  sharePct: number;
}

export interface CastTimelineEntry {
  tMs: number;
  actorId: number;
  abilityId: number;
  targetId: number;
  activeBuffs: number[];
  resourceType: number;
  resourceAmount: number;
}

export interface DeathRecapEvent {
  tMs: number;
  deltaToDeathMs: number;
  type: "damage" | "heal" | "absorbed";
  sourceId: number;
  sourceName: string;
  abilityId: number;
  amount: number;
  overkillOrOverheal: number;
  absorbed: number;
  hpPct: number | null;
}

export interface DeathRecord {
  id: string;
  tMs: number;
  targetId: number;
  targetName: string;
  targetClass: string;
  isFriendly: boolean;
  killingAbilityId: number;
  killingSourceId: number;
  killingSourceName: string;
  totalDamage15s: number;
  totalHealing15s: number;
  recentEvents: DeathRecapEvent[];
}

export interface InterruptRecord {
  tMs: number;
  sourceId: number;
  sourceName: string;
  sourceClass: string;
  targetId: number;
  targetName: string;
  abilityId: number;
  interruptedAbilityId: number;
}

export interface ResourceSeries {
  resourceType: number;
  name: string;
  color: string;
  points: Array<{ tMs: number; pct: number; amount: number; max: number }>;
}

export interface WindowAnalysisResult {
  durationMs: number;
  damageDone: BreakdownResult;
  damageTaken: BreakdownResult;
  healingDone: BreakdownResult;
  buffs: AuraRow[];
  debuffs: AuraRow[];
  casts: {
    totalCasts: number;
    byAbility: CastAbilityRow[];
    timeline: CastTimelineEntry[];
  };
  deaths: {
    friendly: DeathRecord[];
    enemy: DeathRecord[];
  };
  interrupts: InterruptRecord[];
  resourcesByActor: Record<number, ResourceSeries[]>;
  hpByActor: Record<number, Array<{ tMs: number; pct: number; hp: number; maxHp: number }>>;
}

export interface FightContext {
  summary: WclfSummary;
  rawEvents: RawCombatEvent[];
  fightStartTime: number;
  durationMs: number;
  actorsById: Record<number, WclfActor>;
  playerIds: Set<number>;
  petOwnerMap: Record<number, number>;
  abilitiesById: Record<number, WclfAbility>;
  encounters: EncounterSegment[];
  playerProfiles: PlayerProfile[];
  timeline: TimelineOverview;
}

export function getSourceId(ev: RawCombatEvent): number {
  return Number(ev.sourceID ?? ev.source?.id ?? 0) || 0;
}

export function getTargetId(ev: RawCombatEvent): number {
  return Number(ev.targetID ?? ev.target?.id ?? 0) || 0;
}

export function getAbilityId(ev: RawCombatEvent): number {
  return Number(ev.abilityGameID ?? ev.ability?.guid ?? 0) || 0;
}

export function normalizeTimestamp(rawTs: number, fightStartTime: number, durationMs: number): number {
  const ts = Number(rawTs || 0);
  // Some summary-derived or already normalized timestamps may be < fightStartTime
  const rel = fightStartTime > 0 && ts >= fightStartTime - 5000 ? ts - fightStartTime : ts;
  return Math.max(0, Math.min(durationMs, rel));
}

export function resolveAbility(
  abilityId: number,
  abilitiesById: Record<number, WclfAbility>,
  spellDict?: SpellDict
): { name: string; icon: string; school: number } {
  if (abilityId === 1) {
    return { name: "Melee", icon: "inv_sword_04", school: 1 };
  }
  const dictEntry = spellDict?.[String(abilityId)];
  const localEntry = abilitiesById[abilityId];
  const dictName = dictEntry?.n || "";
  const localName = localEntry?.name || "";
  const isAscii = (s: string) => Boolean(s) && /^[\x20-\x7E]+$/.test(s) && !s.startsWith("Spell #") && s !== "Unknown Ability";

  const name = isAscii(dictName)
    ? dictName
    : isAscii(localName)
      ? localName
      : dictName || localName || (abilityId > 0 ? `Spell #${abilityId}` : "Melee / Environment");
  const icon = (localEntry?.icon || localEntry?.abilityIcon || dictEntry?.i || "inv_misc_questionmark")
    .replace(/\.jpg$/i, "")
    .toLowerCase();
  const school = Number(localEntry?.type || dictEntry?.s || 1);
  return { name, icon, school };
}

export function getActorColor(actor?: WclfActor): string {
  if (!actor) return "#94a3b8";
  return CLASS_COLORS[actor.type] || CLASS_COLORS[actor.subType || ""] || (actor.type === "Boss" ? "#f87171" : "#cbd5e1");
}

function buildPlayerStats(ev: RawCombatEvent): PlayerStats {
  const critRating = Number(ev.critSpell || ev.critMelee || ev.critRanged || 0);
  const hasteRating = Number(ev.hasteSpell || ev.hasteMelee || ev.hasteRanged || 0);
  const masteryRating = Number(ev.mastery || 0);
  const versDamageRating = Number(ev.versatilityDamageDone || 0);
  const versHealRating = Number(ev.versatilityHealingDone || 0);
  const versRedRating = Number(ev.versatilityDamageReduction || 0);
  const leechRating = Number(ev.leech || 0);
  const avoidanceRating = Number(ev.avoidance || 0);
  const speedRating = Number(ev.speed || 0);

  return {
    strength: Number(ev.strength || 0),
    agility: Number(ev.agility || 0),
    stamina: Number(ev.stamina || 0),
    intellect: Number(ev.intellect || 0),
    armor: Number(ev.armor || 0),
    critRating,
    critPct: Number((critRating / 400).toFixed(2)),
    hasteRating,
    hastePct: Number((hasteRating / 375).toFixed(2)),
    masteryRating,
    masteryPct: Number((masteryRating / 400).toFixed(2)),
    versDamageRating,
    versDamagePct: Number((versDamageRating / 475).toFixed(2)),
    versHealPct: Number((versHealRating / 475).toFixed(2)),
    versReductionPct: Number((versRedRating / 950).toFixed(2)),
    leechRating,
    leechPct: Number((leechRating / 230).toFixed(2)),
    avoidanceRating,
    avoidancePct: Number((avoidanceRating / 140).toFixed(2)),
    speedRating,
    speedPct: Number((speedRating / 170).toFixed(2)),
    dodgePct: Number(ev.dodge || 0),
    parryPct: Number(ev.parry || 0),
    blockPct: Number(ev.block || 0),
  };
}

function resolveGearSlots(gearRaw: WclfGearItem[]): ResolvedGearSlot[] {
  const slots: ResolvedGearSlot[] = [];
  gearRaw.forEach((item, idx) => {
    const id = Number(item?.id || 0);
    if (id <= 0) return;
    const bonusIDs = Array.isArray(item.bonusIDs) ? item.bonusIDs.map(Number) : [];
    const gems = Array.isArray(item.gems)
      ? item.gems.map((g) => ({
          id: Number(g.id),
          itemLevel: Number(g.itemLevel || 0),
          icon: (g.icon || "inv_misc_gem_01").replace(/\.jpg$/i, "").toLowerCase(),
        }))
      : [];
    const params: string[] = [];
    if (bonusIDs.length > 0) params.push(`bonus=${bonusIDs.join(":")}`);
    if (item.permanentEnchant) params.push(`ench=${item.permanentEnchant}`);
    if (gems.length > 0) params.push(`gems=${gems.map((g) => g.id).join(":")}`);
    const query = params.join("&");

    slots.push({
      slotIndex: idx,
      slotName: GEAR_SLOT_NAMES[idx] || `Slot ${idx + 1}`,
      id,
      itemLevel: Number(item.itemLevel || 0),
      quality: Number(item.quality || 4),
      icon: (item.icon || "inv_misc_questionmark").replace(/\.jpg$/i, "").toLowerCase(),
      bonusIDs,
      gems,
      permanentEnchant: item.permanentEnchant,
      onUseEnchant: item.onUseEnchant,
      setID: item.setID,
      isLegendary: Number(item.quality || 0) === 5,
      wowheadUrl: `https://www.wowhead.com/item=${id}${query ? `?${query}` : ""}`,
      wowheadData: `item=${id}${query ? `&${query}` : ""}`,
    });
  });
  return slots;
}

export function buildFightContext(
  summary: WclfSummary,
  rawEvents: RawCombatEvent[],
  fightStartTimeHint: number,
  spellDict?: SpellDict
): FightContext {
  const durationMs = Math.max(1, Number(summary.duration_ms || 1));
  const fightStartTime =
    fightStartTimeHint > 0
      ? fightStartTimeHint
      : rawEvents.length > 0
        ? Number(rawEvents[0].timestamp || 0)
        : 0;

  const actorsById: Record<number, WclfActor> = {};
  for (const a of summary.actors || []) {
    if (a && typeof a.id === "number") {
      actorsById[a.id] = a;
    }
  }

  const abilitiesById: Record<number, WclfAbility> = {};
  for (const [k, v] of Object.entries(summary.abilities || {})) {
    const id = Number(v.gameID ?? v.guid ?? k);
    if (!Number.isNaN(id) && id > 0) {
      abilitiesById[id] = v;
    }
  }

  const petOwnerMap: Record<number, number> = {};
  for (const a of summary.actors || []) {
    if (a.petOwner && a.petOwner > 0) {
      petOwnerMap[a.id] = a.petOwner;
    }
  }

  const fightId = Number(summary.fight_id || 0);
  const fidToken = fightId > 0 ? `.${fightId}.` : "";
  const buildActorIds = new Set(Object.keys(summary.combatant_builds || {}).map(Number));
  const activeSummaryIds = new Set<number>([
    ...(summary.damage_done || []).map((d) => d.actor_id),
    ...(summary.healing_done || []).map((h) => h.actor_id),
  ]);

  const playerIds = new Set<number>();
  for (const a of summary.actors || []) {
    const isPlayerClass = Boolean(CLASS_COLORS[a.type] || CLASS_COLORS[a.subType || ""]);
    if (!isPlayerClass) continue;
    const inFightAttr = fidToken && a.fights ? a.fights.includes(fidToken) : false;
    if (buildActorIds.has(a.id) || inFightAttr || activeSummaryIds.has(a.id)) {
      playerIds.add(a.id);
    }
  }

  // First pass over rawEvents: build pet map, inline actors/abilities, encounter segments, and combatantinfo map
  const encounters: EncounterSegment[] = [];
  const openEncounters = new Map<number, { encounterId: number; name: string; startMs: number }>();
  const combatantInfoByActor = new Map<number, RawCombatEvent>();

  for (const ev of rawEvents) {
    const srcId = getSourceId(ev);
    const tgtId = getTargetId(ev);
    if (ev.source && srcId && !actorsById[srcId]) {
      actorsById[srcId] = {
        id: srcId,
        name: ev.source.name || `Actor #${srcId}`,
        type: ev.source.type || "NPC",
        icon: ev.source.icon,
        guid: ev.source.guid,
      };
    }
    if (ev.target && tgtId && !actorsById[tgtId]) {
      actorsById[tgtId] = {
        id: tgtId,
        name: ev.target.name || `Actor #${tgtId}`,
        type: ev.target.type || "NPC",
        icon: ev.target.icon,
        guid: ev.target.guid,
      };
    }
    const abObj = ev.ability;
    if (abObj) {
      const aid = Number(abObj.guid || ev.abilityGameID || 0);
      if (aid > 0 && !abilitiesById[aid]) {
        abilitiesById[aid] = {
          gameID: aid,
          name: abObj.name || `Spell #${aid}`,
          type: abObj.type || 1,
          icon: abObj.abilityIcon || "",
        };
      }
    }
    if (ev.extraAbility) {
      const exId = Number(ev.extraAbility.guid || ev.extraAbilityGameID || 0);
      if (exId > 0 && !abilitiesById[exId]) {
        abilitiesById[exId] = {
          gameID: exId,
          name: ev.extraAbility.name || `Spell #${exId}`,
          type: ev.extraAbility.type || 1,
          icon: ev.extraAbility.abilityIcon || "",
        };
      }
    }

    if (ev.type === "summon" && srcId && tgtId) {
      petOwnerMap[tgtId] = petOwnerMap[srcId] ?? srcId;
    } else if (ev.type === "combatantinfo" && srcId) {
      if (!combatantInfoByActor.has(srcId)) {
        combatantInfoByActor.set(srcId, ev);
      }
      if (!playerIds.has(srcId) && actorsById[srcId] && CLASS_COLORS[actorsById[srcId].type]) {
        playerIds.add(srcId);
      }
    } else if (ev.type === "dungeonencounterstart") {
      const encId = Number(ev.encounterID || 0);
      const tMs = normalizeTimestamp(ev.timestamp, fightStartTime, durationMs);
      openEncounters.set(encId, {
        encounterId: encId,
        name: LEGION_BOSS_NAMES[encId] || ev.name || `Boss #${encId}`,
        startMs: tMs,
      });
    } else if (ev.type === "dungeonencounterend") {
      const encId = Number(ev.encounterID || 0);
      const tMs = normalizeTimestamp(ev.timestamp, fightStartTime, durationMs);
      const opened = openEncounters.get(encId);
      if (opened) {
        encounters.push({
          id: `boss_${encId}_${opened.startMs}`,
          encounterId: encId,
          name: opened.name,
          startMs: opened.startMs,
          endMs: Math.max(opened.startMs + 1000, tMs),
          kill: Boolean(ev.kill),
        });
        openEncounters.delete(encId);
      }
    }
  }

  for (const [, opened] of openEncounters) {
    encounters.push({
      id: `boss_${opened.encounterId}_${opened.startMs}`,
      encounterId: opened.encounterId,
      name: opened.name,
      startMs: opened.startMs,
      endMs: durationMs,
      kill: false,
    });
  }
  encounters.sort((a, b) => a.startMs - b.startMs);

  // Build player profiles
  const dpsMap = new Map((summary.damage_done || []).map((d) => [d.actor_id, d.dps]));
  const hpsMap = new Map((summary.healing_done || []).map((h) => [h.actor_id, h.hps]));
  const builds = summary.combatant_builds || {};

  const playerProfiles: PlayerProfile[] = Array.from(playerIds).map((aid) => {
    const actor = actorsById[aid] || { id: aid, name: `Player #${aid}`, type: "Warrior" };
    const ci = combatantInfoByActor.get(aid);
    const build: WclfCombatantBuild | undefined = builds[String(aid)];

    const specId = Number(ci?.specID || build?.spec_id || 0);
    const specMeta = SPEC_BY_ID[specId];
    const iconParts = (actor.icon || "").split("-");
    const className = specMeta?.className || actor.type || iconParts[0] || "Warrior";
    const specName = specMeta?.specName || iconParts[1] || "";
    const role = specMeta?.role || "dps";

    const gearRaw = (ci?.gear && ci.gear.length > 0 ? ci.gear : build?.gear) || [];
    const gear = resolveGearSlots(gearRaw);
    const ilvlSlots = gear.filter((g) => g.slotIndex !== 3 && g.slotIndex !== 17 && g.itemLevel > 0);
    const avgIlvl =
      ilvlSlots.length > 0
        ? Number((ilvlSlots.reduce((acc, g) => acc + g.itemLevel, 0) / ilvlSlots.length).toFixed(1))
        : 0;

    const rawTalents = (ci?.talents && ci.talents.length > 0 ? ci.talents : build?.talents) || [];
    const talents = rawTalents
      .map((t, idx) => {
        const tid = Number(t.id || t.guid || 0);
        if (!tid) return null;
        const ab = resolveAbility(tid, abilitiesById, spellDict);
        const icon = (t.icon || ab.icon || "inv_misc_questionmark").replace(/\.jpg$/i, "").toLowerCase();
        return { id: tid, name: ab.name, icon, row: idx + 1 };
      })
      .filter((t): t is NonNullable<typeof t> => t !== null);

    const rawArtifact = (ci?.artifact && ci.artifact.length > 0 ? ci.artifact : build?.artifact) || [];
    const artifact = rawArtifact
      .map((tr) => {
        const sid = Number(tr.spellID || tr.traitID || 0);
        if (!sid) return null;
        const ab = resolveAbility(sid, abilitiesById, spellDict);
        const icon = (tr.icon || ab.icon || "inv_misc_questionmark").replace(/\.jpg$/i, "").toLowerCase();
        return { spellId: sid, name: ab.name, icon, rank: Number(tr.rank || 1) };
      })
      .filter((tr): tr is NonNullable<typeof tr> => tr !== null);

    return {
      actorId: aid,
      name: actor.name,
      server: actor.server,
      className,
      specName,
      specId,
      role,
      color: CLASS_COLORS[className] || "#60a5fa",
      ilvl: avgIlvl,
      dps: Number((dpsMap.get(aid) || 0).toFixed(1)),
      hps: Number((hpsMap.get(aid) || 0).toFixed(1)),
      stats: ci ? buildPlayerStats(ci) : null,
      talents,
      artifact,
      gear,
    };
  });

  const roleOrder: Record<string, number> = { tank: 0, healer: 1, dps: 2 };
  playerProfiles.sort((a, b) => (roleOrder[a.role] ?? 3) - (roleOrder[b.role] ?? 3) || b.dps - a.dps);

  // Build timeline overview buckets (target ~240 buckets across the dungeon)
  const bucketMs = Math.max(1000, Math.ceil(durationMs / 240 / 1000) * 1000);
  const bucketCount = Math.max(1, Math.ceil(durationMs / bucketMs));
  const dmgBuckets = new Float64Array(bucketCount);
  const healBuckets = new Float64Array(bucketCount);
  const dtpsBuckets = new Float64Array(bucketCount);
  const friendlyDeaths: TimelineOverview["deaths"] = [];

  for (const ev of rawEvents) {
    const tMs = normalizeTimestamp(ev.timestamp, fightStartTime, durationMs);
    const bIdx = Math.min(bucketCount - 1, Math.floor(tMs / bucketMs));
    const srcId = getSourceId(ev);
    const ownerId = petOwnerMap[srcId] ?? srcId;
    const tgtId = getTargetId(ev);

    if (ev.type === "damage") {
      const amt = Math.max(0, Number(ev.amount || 0) - Number(ev.overkill || 0));
      if (playerIds.has(ownerId)) {
        dmgBuckets[bIdx] += amt;
      }
      if (playerIds.has(tgtId)) {
        dtpsBuckets[bIdx] += amt;
      }
    } else if (ev.type === "heal" || ev.type === "absorbed") {
      if (playerIds.has(ownerId)) {
        const eff = Math.max(0, Number(ev.amount || 0) - Number(ev.overheal || 0));
        healBuckets[bIdx] += eff;
      }
    } else if ((ev.type === "death" || ev.type === "instakill") && playerIds.has(tgtId)) {
      const actor = actorsById[tgtId];
      friendlyDeaths.push({
        tMs,
        actorId: tgtId,
        actorName: actor?.name || `Player #${tgtId}`,
        classColor: getActorColor(actor),
      });
    }
  }

  const buckets: TimelineBucket[] = [];
  const secPerBucket = bucketMs / 1000;
  for (let i = 0; i < bucketCount; i++) {
    buckets.push({
      tMs: i * bucketMs,
      dps: Math.round(dmgBuckets[i] / secPerBucket),
      hps: Math.round(healBuckets[i] / secPerBucket),
      dtps: Math.round(dtpsBuckets[i] / secPerBucket),
    });
  }

  return {
    summary,
    rawEvents,
    fightStartTime,
    durationMs,
    actorsById,
    playerIds,
    petOwnerMap,
    abilitiesById,
    encounters,
    playerProfiles,
    timeline: {
      durationMs,
      bucketMs,
      buckets,
      deaths: friendlyDeaths,
      encounters,
    },
  };
}

function finalizeBreakdown(
  mode: "damage" | "healing" | "damageTaken",
  durationMs: number,
  tStartMs: number,
  actorStats: Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; activeBuckets: Set<number> }>,
  abilityStats: Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; maxHit: number }>,
  targetStats: Map<number, { total: number; hits: number; crits: number }>,
  seriesBuckets: Array<{ tMs: number; total: number; byActor: Record<number, number> }>,
  ctx: FightContext,
  spellDict?: SpellDict
): BreakdownResult {
  const sec = Math.max(0.001, durationMs / 1000);
  let grandTotal = 0;
  let grandRaw = 0;
  for (const st of actorStats.values()) {
    grandTotal += st.total;
    grandRaw += st.raw;
  }
  const denom = Math.max(1, grandTotal);
  const totalBuckets = Math.max(1, Math.ceil(durationMs / 1000));

  const byActor: BreakdownActorRow[] = Array.from(actorStats.entries())
    .map(([aid, st]) => {
      const actor = ctx.actorsById[aid];
      return {
        actorId: aid,
        name: actor?.name || (aid === -1 ? "Environment" : `Actor #${aid}`),
        className: actor?.type || "Unit",
        color: getActorColor(actor),
        total: st.total,
        rawTotal: st.raw,
        overkillOrOverheal: st.over,
        absorbed: st.abs,
        perSec: Number((st.total / sec).toFixed(1)),
        hits: st.hits,
        crits: st.crits,
        critPct: st.hits > 0 ? Number(((st.crits / st.hits) * 100).toFixed(1)) : 0,
        sharePct: Number(((st.total / denom) * 100).toFixed(1)),
        activePct: Number((Math.min(100, (st.activeBuckets.size / totalBuckets) * 100)).toFixed(1)),
      };
    })
    .sort((a, b) => b.total - a.total);

  let abGrand = 0;
  for (const st of abilityStats.values()) abGrand += st.total;
  const abDenom = Math.max(1, abGrand);

  const byAbility: BreakdownAbilityRow[] = Array.from(abilityStats.entries())
    .map(([abId, st]) => {
      const ab = resolveAbility(abId, ctx.abilitiesById, spellDict);
      return {
        abilityId: abId,
        name: ab.name,
        icon: ab.icon,
        school: ab.school,
        total: st.total,
        rawTotal: st.raw,
        overkillOrOverheal: st.over,
        absorbed: st.abs,
        perSec: Number((st.total / sec).toFixed(1)),
        hits: st.hits,
        crits: st.crits,
        critPct: st.hits > 0 ? Number(((st.crits / st.hits) * 100).toFixed(1)) : 0,
        avgHit: st.hits > 0 ? Math.round(st.total / st.hits) : 0,
        maxHit: st.maxHit,
        sharePct: Number(((st.total / abDenom) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.total - a.total);

  let tgtGrand = 0;
  for (const st of targetStats.values()) tgtGrand += st.total;
  const tgtDenom = Math.max(1, tgtGrand);

  const byTarget: BreakdownTargetRow[] = Array.from(targetStats.entries())
    .map(([tid, st]) => {
      const actor = ctx.actorsById[tid];
      return {
        targetId: tid,
        name: actor?.name || (tid === -1 ? "Environment" : `Actor #${tid}`),
        type: actor?.type || "NPC",
        color: getActorColor(actor),
        total: st.total,
        perSec: Number((st.total / sec).toFixed(1)),
        hits: st.hits,
        crits: st.crits,
        sharePct: Number(((st.total / tgtDenom) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.total - a.total);

  void tStartMs;
  return {
    mode,
    total: grandTotal,
    rawTotal: grandRaw,
    perSec: Number((grandTotal / sec).toFixed(1)),
    durationMs,
    byActor,
    byAbility,
    byTarget,
    series: seriesBuckets,
  };
}

export function analyzeWindow(
  ctx: FightContext,
  filter: FightFilterState,
  spellDict?: SpellDict
): WindowAnalysisResult {
  const tStart = Math.max(0, filter.tStartMs);
  const tEnd = Math.min(ctx.durationMs, Math.max(tStart + 1, filter.tEndMs));
  const winDuration = Math.max(1, tEnd - tStart);
  const bucketMs = Math.max(1000, Math.ceil(winDuration / 120 / 1000) * 1000);
  const bucketCount = Math.max(1, Math.ceil(winDuration / bucketMs));

  const initSeries = () =>
    Array.from({ length: bucketCount }, (_, i) => ({
      tMs: tStart + i * bucketMs,
      total: 0,
      byActor: {} as Record<number, number>,
    }));

  const dmgSeries = initSeries();
  const dtpsSeries = initSeries();
  const healSeries = initSeries();

  const dmgActor = new Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; activeBuckets: Set<number> }>();
  const dmgAbility = new Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; maxHit: number }>();
  const dmgTarget = new Map<number, { total: number; hits: number; crits: number }>();

  const dtActor = new Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; activeBuckets: Set<number> }>();
  const dtAbility = new Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; maxHit: number }>();
  const dtSource = new Map<number, { total: number; hits: number; crits: number }>();

  const healActor = new Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; activeBuckets: Set<number> }>();
  const healAbility = new Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; maxHit: number }>();
  const healTarget = new Map<number, { total: number; hits: number; crits: number }>();

  const addActorStat = (
    map: Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; activeBuckets: Set<number> }>,
    aid: number,
    eff: number,
    raw: number,
    over: number,
    abs: number,
    isCrit: number,
    secIdx: number
  ) => {
    let cur = map.get(aid);
    if (!cur) {
      cur = { total: 0, raw: 0, over: 0, abs: 0, hits: 0, crits: 0, activeBuckets: new Set() };
      map.set(aid, cur);
    }
    cur.total += eff;
    cur.raw += raw;
    cur.over += over;
    cur.abs += abs;
    cur.hits += 1;
    cur.crits += isCrit;
    cur.activeBuckets.add(secIdx);
  };

  const addAbilityStat = (
    map: Map<number, { total: number; raw: number; over: number; abs: number; hits: number; crits: number; maxHit: number }>,
    abId: number,
    eff: number,
    raw: number,
    over: number,
    abs: number,
    isCrit: number
  ) => {
    let cur = map.get(abId);
    if (!cur) {
      cur = { total: 0, raw: 0, over: 0, abs: 0, hits: 0, crits: 0, maxHit: 0 };
      map.set(abId, cur);
    }
    cur.total += eff;
    cur.raw += raw;
    cur.over += over;
    cur.abs += abs;
    cur.hits += 1;
    cur.crits += isCrit;
    if (eff > cur.maxHit) cur.maxHit = eff;
  };

  const addTargetStat = (
    map: Map<number, { total: number; hits: number; crits: number }>,
    tid: number,
    eff: number,
    isCrit: number
  ) => {
    let cur = map.get(tid);
    if (!cur) {
      cur = { total: 0, hits: 0, crits: 0 };
      map.set(tid, cur);
    }
    cur.total += eff;
    cur.hits += 1;
    cur.crits += isCrit;
  };

  // Aura tracking per (targetId -> abilityId)
  interface AuraTracker {
    applications: number;
    refreshes: number;
    maxStacks: number;
    openStart: number | null;
    intervals: Array<[number, number]>;
  }
  const buffMap = new Map<string, AuraTracker>();
  const debuffMap = new Map<string, AuraTracker>();

  const auraKey = (tgtId: number, abId: number) => `${tgtId}:${abId}`;
  const touchAura = (
    store: Map<string, AuraTracker>,
    tgtId: number,
    abId: number,
    kind: "apply" | "refresh" | "remove" | "stack",
    tMs: number,
    stacks = 1
  ) => {
    const key = auraKey(tgtId, abId);
    let tr = store.get(key);
    if (!tr) {
      tr = { applications: 0, refreshes: 0, maxStacks: 1, openStart: null, intervals: [] };
      store.set(key, tr);
    }
    if (stacks > tr.maxStacks) tr.maxStacks = stacks;
    if (kind === "apply") {
      tr.applications += 1;
      if (tr.openStart === null) tr.openStart = tMs;
    } else if (kind === "refresh" || kind === "stack") {
      if (kind === "refresh") tr.refreshes += 1;
      if (tr.openStart === null) tr.openStart = tMs;
    } else if (kind === "remove") {
      if (tr.openStart !== null) {
        if (tMs > tr.openStart) tr.intervals.push([tr.openStart, tMs]);
        tr.openStart = null;
      }
    }
  };

  const castCounts = new Map<number, number>();
  const castTimeline: CastTimelineEntry[] = [];
  const interrupts: InterruptRecord[] = [];
  const friendlyDeaths: DeathRecord[] = [];
  const enemyDeaths: DeathRecord[] = [];
  const incomingBuffer = new Map<number, DeathRecapEvent[]>();
  const hpByActor: Record<number, Array<{ tMs: number; pct: number; hp: number; maxHp: number }>> = {};
  const resourcesByActor: Record<number, Map<number, { type: number; points: Array<{ tMs: number; pct: number; amount: number; max: number }> }>> = {};

  const matchesSrc = (ownerId: number, rawSrc: number) =>
    filter.sourceId === null || ownerId === filter.sourceId || rawSrc === filter.sourceId;
  const matchesTgt = (tgtId: number) =>
    filter.targetId === null || tgtId === filter.targetId;
  const matchesAb = (abId: number) =>
    filter.abilityId === null || abId === filter.abilityId;

  const activeBuffSetByActor = new Map<number, Set<number>>();

  for (const ev of ctx.rawEvents) {
    const tMs = normalizeTimestamp(ev.timestamp, ctx.fightStartTime, ctx.durationMs);
    if (tMs < tStart) {
      // Seed combatantinfo auras when window starts at 0
      if (tStart === 0 && ev.type === "combatantinfo") {
        const srcId = getSourceId(ev);
        if (srcId && matchesSrc(srcId, srcId) && Array.isArray(ev.auras)) {
          for (const au of ev.auras) {
            const aid = Number(au.ability || 0);
            if (aid > 0) {
              touchAura(buffMap, srcId, aid, "apply", 0, Number(au.stacks || 1));
              let aset = activeBuffSetByActor.get(srcId);
              if (!aset) {
                aset = new Set();
                activeBuffSetByActor.set(srcId, aset);
              }
              aset.add(aid);
            }
          }
        }
      }
      continue;
    }
    if (tMs > tEnd) break;

    const evType = ev.type;
    const rawSrc = getSourceId(ev);
    const ownerId = ctx.petOwnerMap[rawSrc] ?? rawSrc;
    const tgtId = getTargetId(ev);
    const abId = getAbilityId(ev);
    const bIdx = Math.min(bucketCount - 1, Math.floor((tMs - tStart) / bucketMs));
    const secIdx = Math.floor((tMs - tStart) / 1000);

    // Track HP & class resources for players
    if (ctx.playerIds.has(rawSrc) && ev.maxHitPoints && ev.maxHitPoints > 0 && ev.hitPoints !== undefined) {
      const hpList = (hpByActor[rawSrc] ||= []);
      const pct = Number((((ev.hitPoints || 0) / ev.maxHitPoints) * 100).toFixed(1));
      const last = hpList[hpList.length - 1];
      if (!last || tMs - last.tMs >= 500 || Math.abs(last.pct - pct) >= 2) {
        hpList.push({ tMs, pct, hp: Number(ev.hitPoints || 0), maxHp: Number(ev.maxHitPoints) });
      }
    }
    if (ctx.playerIds.has(rawSrc) && Array.isArray(ev.classResources) && ev.classResources.length > 0) {
      const r0 = ev.classResources[0];
      const rType = Number(r0.type ?? 0);
      const rMax = Number(r0.max || 0);
      const rAmt = Number(r0.amount || 0);
      if (rMax > 0) {
        const actorRes = (resourcesByActor[rawSrc] ||= new Map());
        let entry = actorRes.get(rType);
        if (!entry) {
          entry = { type: rType, points: [] };
          actorRes.set(rType, entry);
        }
        const pct = Number(((rAmt / rMax) * 100).toFixed(1));
        const last = entry.points[entry.points.length - 1];
        if (!last || tMs - last.tMs >= 500 || Math.abs(last.pct - pct) >= 3) {
          entry.points.push({ tMs, pct, amount: rAmt, max: rMax });
        }
      }
    }

    if (evType === "combatantinfo" && rawSrc && Array.isArray(ev.auras) && tMs <= tStart + 5000) {
      if (matchesSrc(rawSrc, rawSrc)) {
        for (const au of ev.auras) {
          const aid = Number(au.ability || 0);
          if (aid > 0) {
            touchAura(buffMap, rawSrc, aid, "apply", tStart, Number(au.stacks || 1));
            let aset = activeBuffSetByActor.get(rawSrc);
            if (!aset) {
              aset = new Set();
              activeBuffSetByActor.set(rawSrc, aset);
            }
            aset.add(aid);
          }
        }
      }
      continue;
    }

    if (evType === "damage") {
      const rawAmt = Number(ev.amount || 0);
      const ovk = Number(ev.overkill || 0);
      const abs = Number(ev.absorbed || 0);
      const eff = Math.max(0, rawAmt - ovk);
      const isCrit = Number(ev.hitType || 1) === 2 ? 1 : 0;

      // Incoming history for deaths
      if (tgtId) {
        const hpPct =
          ev.maxHitPoints && ev.maxHitPoints > 0 && ev.hitPoints !== undefined
            ? Number(((ev.hitPoints / ev.maxHitPoints) * 100).toFixed(1))
            : null;
        const buf = incomingBuffer.get(tgtId) || [];
        buf.push({
          tMs,
          deltaToDeathMs: 0,
          type: "damage",
          sourceId: ownerId,
          sourceName: ctx.actorsById[ownerId]?.name || (ownerId === -1 ? "Environment" : `Actor #${ownerId}`),
          abilityId: abId,
          amount: rawAmt,
          overkillOrOverheal: ovk,
          absorbed: abs,
          hpPct,
        });
        if (buf.length > 150) buf.shift();
        incomingBuffer.set(tgtId, buf);
      }

      // Friendly Damage Done
      if (ctx.playerIds.has(ownerId)) {
        if (matchesTgt(tgtId)) {
          addActorStat(dmgActor, ownerId, eff, rawAmt, ovk, abs, isCrit, secIdx);
          if (matchesSrc(ownerId, rawSrc)) {
            dmgSeries[bIdx].total += eff;
            dmgSeries[bIdx].byActor[ownerId] = (dmgSeries[bIdx].byActor[ownerId] || 0) + eff;
          }
        }
        if (matchesSrc(ownerId, rawSrc) && matchesTgt(tgtId) && matchesAb(abId)) {
          addAbilityStat(dmgAbility, abId, eff, rawAmt, ovk, abs, isCrit);
        }
        if (matchesSrc(ownerId, rawSrc) && matchesAb(abId) && tgtId) {
          addTargetStat(dmgTarget, tgtId, eff, isCrit);
        }
      }

      // Friendly Damage Taken
      if (ctx.playerIds.has(tgtId)) {
        // When sourceId filter is active, filter Damage Taken to that player (as victim)
        const victimMatch = filter.sourceId === null || tgtId === filter.sourceId;
        const attackerMatch = filter.targetId === null || ownerId === filter.targetId;
        if (attackerMatch) {
          addActorStat(dtActor, tgtId, eff, rawAmt, ovk, abs, isCrit, secIdx);
          if (victimMatch) {
            dtpsSeries[bIdx].total += eff;
            dtpsSeries[bIdx].byActor[tgtId] = (dtpsSeries[bIdx].byActor[tgtId] || 0) + eff;
          }
        }
        if (victimMatch && attackerMatch && matchesAb(abId)) {
          addAbilityStat(dtAbility, abId, eff, rawAmt, ovk, abs, isCrit);
        }
        if (victimMatch && matchesAb(abId) && ownerId) {
          addTargetStat(dtSource, ownerId, eff, isCrit);
        }
      }
    } else if (evType === "heal" || evType === "absorbed") {
      const rawAmt = Number(ev.amount || 0);
      const ovh = Number(ev.overheal || 0);
      const abs = evType === "absorbed" ? rawAmt : Number(ev.absorbed || 0);
      const eff = Math.max(0, rawAmt - ovh);
      const isCrit = Number(ev.hitType || 1) === 2 ? 1 : 0;

      if (tgtId) {
        const hpPct =
          ev.maxHitPoints && ev.maxHitPoints > 0 && ev.hitPoints !== undefined
            ? Number(((ev.hitPoints / ev.maxHitPoints) * 100).toFixed(1))
            : null;
        const buf = incomingBuffer.get(tgtId) || [];
        buf.push({
          tMs,
          deltaToDeathMs: 0,
          type: evType === "absorbed" ? "absorbed" : "heal",
          sourceId: ownerId,
          sourceName: ctx.actorsById[ownerId]?.name || `Actor #${ownerId}`,
          abilityId: abId,
          amount: rawAmt,
          overkillOrOverheal: ovh,
          absorbed: abs,
          hpPct,
        });
        if (buf.length > 150) buf.shift();
        incomingBuffer.set(tgtId, buf);
      }

      if (ctx.playerIds.has(ownerId)) {
        if (matchesTgt(tgtId)) {
          addActorStat(healActor, ownerId, eff, rawAmt, ovh, abs, isCrit, secIdx);
          if (matchesSrc(ownerId, rawSrc)) {
            healSeries[bIdx].total += eff;
            healSeries[bIdx].byActor[ownerId] = (healSeries[bIdx].byActor[ownerId] || 0) + eff;
          }
        }
        if (matchesSrc(ownerId, rawSrc) && matchesTgt(tgtId) && matchesAb(abId)) {
          addAbilityStat(healAbility, abId, eff, rawAmt, ovh, abs, isCrit);
        }
        if (matchesSrc(ownerId, rawSrc) && matchesAb(abId) && tgtId) {
          addTargetStat(healTarget, tgtId, eff, isCrit);
        }
      }
    } else if (evType === "cast" && rawSrc && abId) {
      if (ctx.playerIds.has(ownerId) && matchesSrc(ownerId, rawSrc) && matchesTgt(tgtId) && matchesAb(abId)) {
        castCounts.set(abId, (castCounts.get(abId) || 0) + 1);
        const r0 = ev.classResources?.[0];
        const aset = activeBuffSetByActor.get(ownerId);
        castTimeline.push({
          tMs,
          actorId: ownerId,
          abilityId: abId,
          targetId: tgtId,
          activeBuffs: aset ? Array.from(aset).slice(0, 10) : [],
          resourceType: Number(r0?.type || 0),
          resourceAmount: Number(r0?.amount || 0),
        });
      }
    } else if (evType === "applybuff" || evType === "refreshbuff" || evType === "applybuffstack" || evType === "removebuff" || evType === "removebuffstack") {
      if (tgtId && abId && (filter.sourceId === null || tgtId === filter.sourceId)) {
        const kind =
          evType === "applybuff"
            ? "apply"
            : evType === "refreshbuff"
              ? "refresh"
              : evType === "applybuffstack" || evType === "removebuffstack"
                ? "stack"
                : "remove";
        touchAura(buffMap, tgtId, abId, kind, tMs, Number(ev.stacks || 1));
        if (ctx.playerIds.has(tgtId)) {
          let aset = activeBuffSetByActor.get(tgtId);
          if (!aset) {
            aset = new Set();
            activeBuffSetByActor.set(tgtId, aset);
          }
          if (kind === "remove") aset.delete(abId);
          else aset.add(abId);
        }
      }
    } else if (evType === "applydebuff" || evType === "refreshdebuff" || evType === "applydebuffstack" || evType === "removedebuff" || evType === "removedebuffstack") {
      if (tgtId && abId && matchesSrc(ownerId, rawSrc) && matchesTgt(tgtId)) {
        const kind =
          evType === "applydebuff"
            ? "apply"
            : evType === "refreshdebuff"
              ? "refresh"
              : evType === "applydebuffstack" || evType === "removedebuffstack"
                ? "stack"
                : "remove";
        touchAura(debuffMap, tgtId, abId, kind, tMs, Number(ev.stacks || 1));
      }
    } else if (evType === "interrupt") {
      const exId = Number(ev.extraAbilityGameID ?? ev.extraAbility?.guid ?? 0);
      if (matchesSrc(ownerId, rawSrc) && matchesTgt(tgtId)) {
        interrupts.push({
          tMs,
          sourceId: ownerId,
          sourceName: ctx.actorsById[ownerId]?.name || `Actor #${ownerId}`,
          sourceClass: ctx.actorsById[ownerId]?.type || "Unit",
          targetId: tgtId,
          targetName: ctx.actorsById[tgtId]?.name || `Actor #${tgtId}`,
          abilityId: abId,
          interruptedAbilityId: exId,
        });
      }
    } else if ((evType === "death" || evType === "instakill") && tgtId) {
      // Close open buffs/debuffs on target
      for (const store of [buffMap, debuffMap]) {
        for (const [k, tr] of store.entries()) {
          if (k.startsWith(`${tgtId}:`) && tr.openStart !== null) {
            if (tMs > tr.openStart) tr.intervals.push([tr.openStart, tMs]);
            tr.openStart = null;
          }
        }
      }
      activeBuffSetByActor.delete(tgtId);

      const recentRaw = (incomingBuffer.get(tgtId) || []).filter((e) => e.tMs >= tMs - 15000);
      const recentEvents = recentRaw.map((e) => ({ ...e, deltaToDeathMs: e.tMs - tMs }));
      let dmg15 = 0;
      let heal15 = 0;
      let lastDmgEv: DeathRecapEvent | undefined;
      for (const r of recentEvents) {
        if (r.type === "damage") {
          dmg15 += r.amount;
          lastDmgEv = r;
        } else {
          heal15 += r.amount;
        }
      }

      const killingAbId = Number(ev.killingAbilityGameID ?? ev.killingAbility?.guid ?? abId ?? lastDmgEv?.abilityId ?? 0);
      const isFriendly = ctx.playerIds.has(tgtId);
      const actor = ctx.actorsById[tgtId];
      const rec: DeathRecord = {
        id: `${tgtId}_${tMs}_${friendlyDeaths.length + enemyDeaths.length}`,
        tMs,
        targetId: tgtId,
        targetName: actor?.name || `Actor #${tgtId}`,
        targetClass: actor?.type || "NPC",
        isFriendly,
        killingAbilityId: killingAbId,
        killingSourceId: lastDmgEv?.sourceId || rawSrc,
        killingSourceName: lastDmgEv?.sourceName || ctx.actorsById[rawSrc]?.name || "Environment",
        totalDamage15s: dmg15,
        totalHealing15s: heal15,
        recentEvents,
      };
      if (filter.sourceId === null || tgtId === filter.sourceId || lastDmgEv?.sourceId === filter.sourceId) {
        if (isFriendly) friendlyDeaths.push(rec);
        else enemyDeaths.push(rec);
      }
    }
  }

  // Normalize series to per-second rates
  const bucketSec = Math.max(0.001, bucketMs / 1000);
  const toRateSeries = (arr: typeof dmgSeries) =>
    arr.map((b) => ({
      tMs: b.tMs,
      total: Math.round(b.total / bucketSec),
      byActor: Object.fromEntries(Object.entries(b.byActor).map(([k, v]) => [k, Math.round(v / bucketSec)])),
    }));

  const finalizeAuras = (store: Map<string, AuraTracker>): AuraRow[] => {
    const out: AuraRow[] = [];
    for (const [key, tr] of store.entries()) {
      if (tr.openStart !== null) {
        if (tEnd > tr.openStart) tr.intervals.push([tr.openStart, tEnd]);
      }
      const [tgtStr, abStr] = key.split(":");
      const tgtId = Number(tgtStr);
      const abId = Number(abStr);
      if (filter.abilityId !== null && abId !== filter.abilityId) continue;
      let uptimeMs = 0;
      for (const [s, e] of tr.intervals) uptimeMs += Math.max(0, e - s);
      if (uptimeMs === 0 && tr.applications === 0) continue;
      const ab = resolveAbility(abId, ctx.abilitiesById, spellDict);
      out.push({
        abilityId: abId,
        name: ab.name,
        icon: ab.icon,
        school: ab.school,
        targetId: tgtId,
        targetName: ctx.actorsById[tgtId]?.name || `Actor #${tgtId}`,
        applications: tr.applications,
        refreshes: tr.refreshes,
        maxStacks: tr.maxStacks,
        uptimeMs,
        uptimePct: Number(Math.min(100, (uptimeMs / winDuration) * 100).toFixed(1)),
        intervals: tr.intervals,
      });
    }
    return out.sort((a, b) => b.uptimePct - a.uptimePct || b.applications - a.applications);
  };

  const winMin = Math.max(0.001, winDuration / 60000);
  const totalCasts = Array.from(castCounts.values()).reduce((s, n) => s + n, 0);
  const castDenom = Math.max(1, totalCasts);
  const castsByAbility: CastAbilityRow[] = Array.from(castCounts.entries())
    .map(([abId, count]) => {
      const ab = resolveAbility(abId, ctx.abilitiesById, spellDict);
      return {
        abilityId: abId,
        name: ab.name,
        icon: ab.icon,
        school: ab.school,
        count,
        cpm: Number((count / winMin).toFixed(1)),
        sharePct: Number(((count / castDenom) * 100).toFixed(1)),
      };
    })
    .sort((a, b) => b.count - a.count);

  const formattedResources: Record<number, ResourceSeries[]> = {};
  for (const [aidStr, rMap] of Object.entries(resourcesByActor)) {
    const aid = Number(aidStr);
    formattedResources[aid] = Array.from(rMap.values()).map((entry) => {
      const meta = RESOURCE_TYPES[entry.type] || { name: `Resource #${entry.type}`, color: "#38bdf8" };
      return {
        resourceType: entry.type,
        name: meta.name,
        color: meta.color,
        points: entry.points,
      };
    });
  }

  return {
    durationMs: winDuration,
    damageDone: finalizeBreakdown("damage", winDuration, tStart, dmgActor, dmgAbility, dmgTarget, toRateSeries(dmgSeries), ctx, spellDict),
    damageTaken: finalizeBreakdown("damageTaken", winDuration, tStart, dtActor, dtAbility, dtSource, toRateSeries(dtpsSeries), ctx, spellDict),
    healingDone: finalizeBreakdown("healing", winDuration, tStart, healActor, healAbility, healTarget, toRateSeries(healSeries), ctx, spellDict),
    buffs: finalizeAuras(buffMap),
    debuffs: finalizeAuras(debuffMap),
    casts: {
      totalCasts,
      byAbility: castsByAbility,
      timeline: castTimeline,
    },
    deaths: {
      friendly: friendlyDeaths,
      enemy: enemyDeaths,
    },
    interrupts,
    resourcesByActor: formattedResources,
    hpByActor,
  };
}

export interface EventsQuery {
  category: "all" | "damage" | "healing" | "cast" | "buff" | "debuff" | "death" | "resource";
  search: string;
  page: number;
  pageSize: number;
}

export interface FormattedEventRow {
  index: number;
  tMs: number;
  type: string;
  sourceId: number;
  sourceName: string;
  sourceColor: string;
  targetId: number;
  targetName: string;
  targetColor: string;
  abilityId: number;
  abilityName: string;
  abilityIcon: string;
  amount: number;
  overkillOrOverheal: number;
  absorbed: number;
  isCrit: boolean;
  hpPct: number | null;
  raw: RawCombatEvent;
}

export function filterAndPaginateEvents(
  ctx: FightContext,
  filter: FightFilterState,
  query: EventsQuery,
  spellDict?: SpellDict
): { totalCount: number; page: number; pageSize: number; rows: FormattedEventRow[] } {
  const tStart = Math.max(0, filter.tStartMs);
  const tEnd = Math.min(ctx.durationMs, Math.max(tStart + 1, filter.tEndMs));
  const searchLower = query.search.trim().toLowerCase();

  const matchesCategory = (t: string): boolean => {
    switch (query.category) {
      case "all":
        return t !== "combatantinfo";
      case "damage":
        return t === "damage";
      case "healing":
        return t === "heal" || t === "absorbed";
      case "cast":
        return t === "cast" || t === "begincast";
      case "buff":
        return t === "applybuff" || t === "removebuff" || t === "refreshbuff" || t === "applybuffstack" || t === "removebuffstack";
      case "debuff":
        return t === "applydebuff" || t === "removedebuff" || t === "refreshdebuff" || t === "applydebuffstack" || t === "removedebuffstack";
      case "death":
        return t === "death" || t === "instakill" || t === "interrupt" || t === "resurrect";
      case "resource":
        return t === "resourcechange";
    }
  };

  const matched: FormattedEventRow[] = [];
  let idx = 0;

  for (const ev of ctx.rawEvents) {
    const tMs = normalizeTimestamp(ev.timestamp, ctx.fightStartTime, ctx.durationMs);
    if (tMs < tStart) continue;
    if (tMs > tEnd) break;
    if (!matchesCategory(ev.type)) continue;

    const rawSrc = getSourceId(ev);
    const ownerId = ctx.petOwnerMap[rawSrc] ?? rawSrc;
    const tgtId = getTargetId(ev);
    const abId = getAbilityId(ev);

    if (filter.sourceId !== null && ownerId !== filter.sourceId && rawSrc !== filter.sourceId && tgtId !== filter.sourceId) {
      continue;
    }
    if (filter.targetId !== null && tgtId !== filter.targetId) {
      continue;
    }
    if (filter.abilityId !== null && abId !== filter.abilityId) {
      continue;
    }

    const srcActor = ctx.actorsById[rawSrc];
    const tgtActor = ctx.actorsById[tgtId];
    const srcName = srcActor?.name || (rawSrc === -1 ? "Environment" : rawSrc ? `Actor #${rawSrc}` : "—");
    const tgtName = tgtActor?.name || (tgtId === -1 ? "Environment" : tgtId ? `Actor #${tgtId}` : "—");
    const ab = resolveAbility(abId, ctx.abilitiesById, spellDict);

    if (searchLower) {
      const hay = `${ev.type} ${srcName} ${tgtName} ${ab.name} ${abId}`.toLowerCase();
      if (!hay.includes(searchLower)) continue;
    }

    const hpPct =
      ev.maxHitPoints && ev.maxHitPoints > 0 && ev.hitPoints !== undefined
        ? Math.round((ev.hitPoints / ev.maxHitPoints) * 100)
        : null;

    matched.push({
      index: idx++,
      tMs,
      type: ev.type,
      sourceId: rawSrc,
      sourceName: srcName,
      sourceColor: getActorColor(srcActor),
      targetId: tgtId,
      targetName: tgtName,
      targetColor: getActorColor(tgtActor),
      abilityId: abId,
      abilityName: ab.name,
      abilityIcon: ab.icon,
      amount: Number(ev.amount || 0),
      overkillOrOverheal: Number(ev.overkill || ev.overheal || 0),
      absorbed: Number(ev.absorbed || 0),
      isCrit: Number(ev.hitType || 0) === 2,
      hpPct,
      raw: ev,
    });
  }

  const totalCount = matched.length;
  const pageSize = Math.max(10, query.pageSize);
  const maxPage = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.max(1, Math.min(maxPage, query.page));
  const offset = (safePage - 1) * pageSize;

  return {
    totalCount,
    page: safePage,
    pageSize,
    rows: matched.slice(offset, offset + pageSize),
  };
}

export interface ReplayFrame {
  t: number;
  actor: number;
  x: number;
  y: number;
  hp_pct: number;
}

export function buildReplayFrames(
  ctx: FightContext,
  replayEvents: RawCombatEvent[]
): ReplayFrame[] {
  const source = replayEvents.length > 0 ? replayEvents : ctx.rawEvents;
  const lastByActor = new Map<number, { x: number; y: number; hp: number }>();
  const frames: ReplayFrame[] = [];

  for (const ev of source) {
    if (ev.x === undefined || ev.y === undefined) continue;
    const srcId = getSourceId(ev);
    if (!srcId) continue;
    const x = Number(ev.x);
    const y = Number(ev.y);
    const maxHp = Math.max(1, Number(ev.maxHitPoints || 100));
    const hp = ev.hitPoints !== undefined ? Number(ev.hitPoints) : maxHp;
    const hpPct = Math.round((hp * 10000) / maxHp);
    const prev = lastByActor.get(srcId);
    if (!prev || prev.x !== x || prev.y !== y || prev.hp !== hpPct) {
      lastByActor.set(srcId, { x, y, hp: hpPct });
      frames.push({
        t: normalizeTimestamp(ev.timestamp, ctx.fightStartTime, ctx.durationMs),
        actor: srcId,
        x,
        y,
        hp_pct: hpPct,
      });
    }
  }
  frames.sort((a, b) => a.t - b.t);
  return frames;
}

export function getDungeonTimerSummary(dungeonId: number, durationMs: number): { stars: number; label: string; timed: boolean } {
  const d = DUNGEON_BY_ID[dungeonId];
  if (!d) return { stars: 1, label: "+1", timed: true };
  if (durationMs <= d.timerMs * 0.6) return { stars: 3, label: "+3", timed: true };
  if (durationMs <= d.timerMs * 0.8) return { stars: 2, label: "+2", timed: true };
  if (durationMs <= d.timerMs) return { stars: 1, label: "+1", timed: true };
  return { stars: 0, label: "Depleted", timed: false };
}
