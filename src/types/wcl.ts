export interface SpellDictEntry {
  n: string;
  s: number;
  i: string;
}

export type SpellDict = Record<string, SpellDictEntry>;

export interface CatalogParticipant {
  name: string;
  class: string;
  spec: string;
  role: "tank" | "healer" | "dps" | string;
  ilvl: number;
  dps: number;
  hps: number;
  talents: number[];
  legendaries: number[];
}

export interface CatalogFight {
  fight_uid: string;
  report_code: string;
  fight_id: number;
  encounter_id: number;
  encounter_slug: string;
  keystone_level: number;
  duration_ms: number;
  affixes: number[];
  deaths: number;
  compressed_bytes: number;
  file_rel_path: string;
  gdrive_id: string;
  participants: CatalogParticipant[];
}

export interface CatalogPayload {
  generated_at: string;
  total_fights: number;
  gdrive_folder_id: string;
  fights: CatalogFight[];
}

export interface WclfActor {
  id: number;
  guid?: number;
  name: string;
  type: string;
  subType?: string;
  server?: string;
  icon?: string;
  petOwner?: number;
  fights?: string;
}

export interface WclfAbility {
  gameID?: number;
  guid?: number;
  name: string;
  type?: number;
  icon?: string;
  abilityIcon?: string;
}

export interface WclfGearGem {
  id: number;
  itemLevel?: number;
  icon?: string;
}

export interface WclfGearItem {
  id: number;
  quality?: number;
  icon?: string;
  itemLevel?: number;
  permanentEnchant?: number;
  onUseEnchant?: number;
  setID?: number;
  bonusIDs?: number[];
  gems?: WclfGearGem[];
}

export interface WclfTalentEntry {
  id?: number;
  guid?: number;
  icon?: string;
}

export interface WclfArtifactTrait {
  spellID?: number;
  traitID?: number;
  rank?: number;
  icon?: string;
}

export interface WclfCombatantBuild {
  spec_id: number;
  talents: WclfTalentEntry[];
  gear: WclfGearItem[];
  artifact?: WclfArtifactTrait[];
}

export interface WclfDeathEvent {
  t_ms: number;
  target_id: number;
  killing_ability_id: number;
  recent_events: Array<{
    t_ms: number;
    type: string;
    source_id: number;
    ability_id: number;
    amount: number;
  }>;
}

export interface WclfInterruptEvent {
  t_ms: number;
  source_id: number;
  target_id: number;
  ability_id: number;
  interrupted_ability_id: number;
}

export interface WclfSummary {
  report_code: string;
  fight_id: number;
  encounter_id: number;
  name: string;
  keystone_level: number;
  difficulty: number;
  affixes: number[];
  duration_ms: number;
  actors: WclfActor[];
  abilities: Record<string, WclfAbility>;
  combatant_builds: Record<string, WclfCombatantBuild>;
  damage_done: Array<{ actor_id: number; total: number; dps: number; spells: Array<{ ability_id: number; total: number; hits: number; crits: number }> }>;
  healing_done: Array<{ actor_id: number; total: number; hps: number; spells: Array<{ ability_id: number; total: number; overheal: number; hits: number }> }>;
  buff_uptimes: Record<string, Array<{ ability_id: number; uptime_pct: number; intervals: [number, number][] }>>;
  cast_timeline: Record<string, Array<{ t_ms: number; ability_id: number; target_id: number; active_buffs: number[]; resource_type: number; resource_amount: number }>>;
  interrupts: WclfInterruptEvent[];
  deaths: WclfDeathEvent[];
  map_id?: number;
  pulls?: Array<{ id?: number; name?: string; start_time?: number; end_time?: number }>;
}

export interface RawCombatEvent {
  [key: string]: unknown;
  timestamp: number;
  type: string;
  fight?: number;
  sourceID?: number;
  targetID?: number;
  targetInstance?: number;
  source?: { id?: number; name?: string; guid?: number; type?: string; icon?: string };
  target?: { id?: number; name?: string; guid?: number; type?: string; icon?: string };
  sourceIsFriendly?: boolean;
  targetIsFriendly?: boolean;
  abilityGameID?: number;
  ability?: { guid?: number; name?: string; type?: number; abilityIcon?: string };
  extraAbilityGameID?: number;
  extraAbility?: { guid?: number; name?: string; type?: number; abilityIcon?: string };
  killingAbilityGameID?: number;
  killingAbility?: { guid?: number; name?: string; type?: number; abilityIcon?: string };
  amount?: number;
  unmitigatedAmount?: number;
  overkill?: number;
  overheal?: number;
  absorbed?: number;
  mitigated?: number;
  blocked?: number;
  hitType?: number;
  tick?: boolean;
  isAoE?: boolean;
  hitPoints?: number;
  maxHitPoints?: number;
  attackPower?: number;
  spellPower?: number;
  itemLevel?: number;
  x?: number;
  y?: number;
  nextX?: number;
  nextY?: number;
  nextTimestamp?: number;
  facing?: number;
  classResources?: Array<{ amount?: number; max?: number; type?: number }>;
  resourceChange?: number;
  resourceChangeType?: number;
  maxResourceAmount?: number;
  waste?: number;
  specID?: number;
  strength?: number;
  agility?: number;
  stamina?: number;
  intellect?: number;
  dodge?: number;
  parry?: number;
  block?: number;
  armor?: number;
  critMelee?: number;
  critRanged?: number;
  critSpell?: number;
  hasteMelee?: number;
  hasteRanged?: number;
  hasteSpell?: number;
  speed?: number;
  leech?: number;
  avoidance?: number;
  mastery?: number;
  versatilityDamageDone?: number;
  versatilityHealingDone?: number;
  versatilityDamageReduction?: number;
  talents?: WclfTalentEntry[];
  gear?: WclfGearItem[];
  artifact?: WclfArtifactTrait[];
  auras?: Array<{ source?: number; ability?: number; stacks?: number; icon?: string; name?: string }>;
  encounterID?: number;
  name?: string;
  kill?: boolean;
  stacks?: number;
}

export interface WclfMetadata {
  manifest: {
    report_code: string;
    fight_id: number;
    start_time: number;
    end_time: number;
    event_count: number;
  };
}
