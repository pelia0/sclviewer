import type { EncounterSegment } from "../lib/combatAnalyzer";

export interface DungeonFloorMap {
  uiMapId: number;
  floorIndex: number;
  name: string;
  imageUrl: string;
  minX: number;
  maxX: number;
  minY: number;
  maxY: number;
}

export const DUNGEON_MAPS: Record<number, DungeonFloorMap[]> = {
  // Eye of Azshara
  11456: [
    {
      uiMapId: 713,
      floorIndex: 0,
      name: "Eye of Azshara",
      imageUrl: "./maps/8040.jpg",
      minX: -543958,
      maxX: -353958,
      minY: -407292,
      maxY: -280625,
    },
  ],
  // Neltharion's Lair
  11458: [
    {
      uiMapId: 731,
      floorIndex: 0,
      name: "Neltharion's Lair",
      imageUrl: "./maps/7546.jpg",
      minX: -226667,
      maxX: -93958,
      minY: 244375,
      maxY: 332917,
    },
  ],
  // Darkheart Thicket
  11466: [
    {
      uiMapId: 733,
      floorIndex: 0,
      name: "Darkheart Thicket",
      imageUrl: "./maps/7673.jpg",
      minX: -224167,
      maxX: -111667,
      minY: 260417,
      maxY: 335417,
    },
  ],
  // Halls of Valor
  11477: [
    {
      uiMapId: 703,
      floorIndex: 0,
      name: "Fields of the Eternal Hunt",
      imageUrl: "./maps/7672.jpg",
      minX: -348542,
      maxX: -261042,
      minY: 278333,
      maxY: 336667,
    },
    {
      uiMapId: 704,
      floorIndex: 1,
      name: "The High Gate",
      imageUrl: "./maps/7672-1.jpg",
      minX: -113750,
      maxX: 13750,
      minY: 302500,
      maxY: 387500,
    },
    {
      uiMapId: 705,
      floorIndex: 2,
      name: "Halls of Valor (Odyn)",
      imageUrl: "./maps/7672-2.jpg",
      minX: -131125,
      maxX: 21125,
      minY: 228500,
      maxY: 330000,
    },
  ],
  // Maw of Souls
  11492: [
    {
      uiMapId: 706,
      floorIndex: 0,
      name: "Helmouth Cliffs",
      imageUrl: "./maps/7812.jpg",
      minX: -760833,
      maxX: -698958,
      minY: 709583,
      maxY: 750833,
    },
    {
      uiMapId: 708,
      floorIndex: 2,
      name: "The Naglfar (Deck)",
      imageUrl: "./maps/7812-2.jpg",
      minX: -100000,
      maxX: -60000,
      minY: 281667,
      maxY: 308333,
    },
    {
      uiMapId: 707,
      floorIndex: 1,
      name: "The Hold",
      imageUrl: "./maps/7812-1.jpg",
      minX: -100000,
      maxX: -60000,
      minY: 281667,
      maxY: 308333,
    },
  ],
  // Vault of the Wardens
  11493: [
    {
      uiMapId: 710,
      floorIndex: 1,
      name: "The Warden's Court",
      imageUrl: "./maps/7787-1.jpg",
      minX: 28625,
      maxX: 96375,
      minY: 408333,
      maxY: 453500,
    },
    {
      uiMapId: 711,
      floorIndex: 2,
      name: "Vault of the Wardens",
      imageUrl: "./maps/7787-2.jpg",
      minX: -3063,
      maxX: 100038,
      minY: 409649,
      maxY: 478383,
    },
    {
      uiMapId: 712,
      floorIndex: 3,
      name: "Vault of the Betrayer",
      imageUrl: "./maps/7787-3.jpg",
      minX: -21250,
      maxX: 80938,
      minY: 389375,
      maxY: 457500,
    },
  ],
  // Black Rook Hold
  11501: [
    {
      uiMapId: 751,
      floorIndex: 1,
      name: "The Ravenscrypt",
      imageUrl: "./maps/7805-1.jpg",
      minX: -784312,
      maxX: -717688,
      minY: 308584,
      maxY: 353000,
    },
    {
      uiMapId: 752,
      floorIndex: 2,
      name: "The Grand Hall",
      imageUrl: "./maps/7805-2.jpg",
      minX: -749119,
      maxX: -716869,
      minY: 300000,
      maxY: 321500,
    },
    {
      uiMapId: 753,
      floorIndex: 3,
      name: "Ravenshold",
      imageUrl: "./maps/7805-3.jpg",
      minX: -748250,
      maxX: -726750,
      minY: 312433,
      maxY: 326767,
    },
    {
      uiMapId: 754,
      floorIndex: 4,
      name: "The Rook's Roost",
      imageUrl: "./maps/7805-4.jpg",
      minX: -752625,
      maxX: -719375,
      minY: 311599,
      maxY: 333765,
    },
    {
      uiMapId: 755,
      floorIndex: 5,
      name: "Lord Ravencrest's Chamber",
      imageUrl: "./maps/7805-5.jpg",
      minX: -746950,
      maxX: -728950,
      minY: 312000,
      maxY: 324000,
    },
    {
      uiMapId: 756,
      floorIndex: 6,
      name: "The Raven's Crown",
      imageUrl: "./maps/7805-6.jpg",
      minX: -748875,
      maxX: -731625,
      minY: 313000,
      maxY: 324500,
    },
  ],
  // The Arcway
  11516: [
    {
      uiMapId: 749,
      floorIndex: 0,
      name: "The Arcway",
      imageUrl: "./maps/7855-1.jpg",
      minX: -530675,
      maxX: -426200,
      minY: 296875,
      maxY: 366525,
    },
  ],
  // Court of Stars
  11571: [
    {
      uiMapId: 761,
      floorIndex: 0,
      name: "Court of Stars",
      imageUrl: "./maps/8079.jpg",
      minX: -388750,
      maxX: -289375,
      minY: 80833,
      maxY: 147083,
    },
    {
      uiMapId: 762,
      floorIndex: 1,
      name: "The Jeweled Estate",
      imageUrl: "./maps/8079-1.jpg",
      minX: -337500,
      maxX: -297500,
      minY: 83937,
      maxY: 110604,
    },
    {
      uiMapId: 763,
      floorIndex: 2,
      name: "The Balconies",
      imageUrl: "./maps/8079-2.jpg",
      minX: -338950,
      maxX: -296050,
      minY: 82000,
      maxY: 110600,
    },
  ],
  // Return to Karazhan: Lower
  11651: [
    {
      uiMapId: 809,
      floorIndex: 1,
      name: "Servant's Quarters",
      imageUrl: "./maps/8443-1.jpg",
      minX: 167498,
      maxX: 222502,
      minY: -1118960,
      maxY: -1082290,
    },
    {
      uiMapId: 810,
      floorIndex: 2,
      name: "Upper Livery Stables",
      imageUrl: "./maps/8443-2.jpg",
      minX: 182356,
      maxX: 208142,
      minY: -1118900,
      maxY: -1101710,
    },
    {
      uiMapId: 811,
      floorIndex: 3,
      name: "The Banquet Hall",
      imageUrl: "./maps/8443-3.jpg",
      minX: 178743,
      maxX: 213257,
      minY: -1106630,
      maxY: -1083620,
    },
    {
      uiMapId: 812,
      floorIndex: 4,
      name: "The Guest Chambers",
      imageUrl: "./maps/8443-4.jpg",
      minX: 166998,
      maxX: 219002,
      minY: -1111960,
      maxY: -1077290,
    },
    {
      uiMapId: 813,
      floorIndex: 5,
      name: "Opera Hall Balcony",
      imageUrl: "./maps/8443-5.jpg",
      minX: 169843,
      maxX: 193258,
      minY: -1096930,
      maxY: -1081320,
    },
    {
      uiMapId: 814,
      floorIndex: 6,
      name: "Master's Terrace",
      imageUrl: "./maps/8443-6.jpg",
      minX: 162423,
      maxX: 220577,
      minY: -1119060,
      maxY: -1080290,
    },
  ],
  // Return to Karazhan: Upper
  11652: [
    {
      uiMapId: 815,
      floorIndex: 7,
      name: "Lower Broken Stair",
      imageUrl: "./maps/8443-7.jpg",
      minX: 187523,
      maxX: 206677,
      minY: -1111560,
      maxY: -1098790,
    },
    {
      uiMapId: 816,
      floorIndex: 8,
      name: "Upper Broken Stair",
      imageUrl: "./maps/8443-8.jpg",
      minX: 189833,
      maxX: 203768,
      minY: -1110520,
      maxY: -1101230,
    },
    {
      uiMapId: 817,
      floorIndex: 9,
      name: "The Menagerie",
      imageUrl: "./maps/8443-9.jpg",
      minX: 167998,
      maxX: 211002,
      minY: -1122960,
      maxY: -1094290,
    },
    {
      uiMapId: 818,
      floorIndex: 10,
      name: "Guardian's Library",
      imageUrl: "./maps/8443-10.jpg",
      minX: 210625,
      maxX: 266875,
      minY: -480000,
      maxY: -442500,
    },
    {
      uiMapId: 819,
      floorIndex: 11,
      name: "Library Floor",
      imageUrl: "./maps/8443-11.jpg",
      minX: 204375,
      maxX: 305625,
      minY: -485000,
      maxY: -417500,
    },
    {
      uiMapId: 820,
      floorIndex: 12,
      name: "Upper Library",
      imageUrl: "./maps/8443-12.jpg",
      minX: 198525,
      maxX: 244575,
      minY: 391800,
      maxY: 422500,
    },
    {
      uiMapId: 821,
      floorIndex: 13,
      name: "Gamesman's Hall",
      imageUrl: "./maps/8443-13.jpg",
      minX: 198375,
      maxX: 251625,
      minY: 366000,
      maxY: 401500,
    },
    {
      uiMapId: 822,
      floorIndex: 14,
      name: "Netherspace",
      imageUrl: "./maps/8443-14.jpg",
      minX: 155719,
      maxX: 265969,
      minY: 333000,
      maxY: 406500,
    },
  ],
  // Cathedral of Eternal Night
  11677: [
    {
      uiMapId: 845,
      floorIndex: 1,
      name: "Hall of the Moon",
      imageUrl: "./maps/8527-1.jpg",
      minX: -283906,
      maxX: -217531,
      minY: -74500,
      maxY: -30250,
    },
    {
      uiMapId: 846,
      floorIndex: 2,
      name: "Twilight Grove",
      imageUrl: "./maps/8527-2.jpg",
      minX: -277844,
      maxX: -223844,
      minY: -72500,
      maxY: -36500,
    },
    {
      uiMapId: 847,
      floorIndex: 3,
      name: "The Emerald Archives",
      imageUrl: "./maps/8527-3.jpg",
      minX: -277956,
      maxX: -229581,
      minY: -67500,
      maxY: -35250,
    },
    {
      uiMapId: 848,
      floorIndex: 4,
      name: "Path of Illumination",
      imageUrl: "./maps/8527-4.jpg",
      minX: -275178,
      maxX: -227928,
      minY: -72500,
      maxY: -41000,
    },
    {
      uiMapId: 849,
      floorIndex: 5,
      name: "Sacristy of Elune",
      imageUrl: "./maps/8527-5.jpg",
      minX: -266003,
      maxX: -240503,
      minY: -65000,
      maxY: -48000,
    },
  ],
  // Seat of the Triumvirate
  11753: [
    {
      uiMapId: 903,
      floorIndex: 0,
      name: "Seat of the Triumvirate",
      imageUrl: "./maps/8910.jpg",
      minX: -1115630,
      maxX: -961250,
      minY: 527500,
      maxY: 630417,
    },
  ],
};

function floorContains(floor: DungeonFloorMap, x: number, y: number): boolean {
  return x >= floor.minX && x <= floor.maxX && y >= floor.minY && y <= floor.maxY;
}

export function selectBestFloor(
  dungeonId: number,
  x: number,
  y: number,
  currentMs: number,
  encounters: EncounterSegment[]
): DungeonFloorMap | null {
  const floors = DUNGEON_MAPS[dungeonId];
  if (!floors || floors.length === 0) return null;
  if (floors.length === 1) return floors[0];

  // Dungeon-specific progression heuristics when floors overlap vertically
  if (dungeonId === 11477) {
    // Halls of Valor: Fenryr is outdoors (x < -200000); Hyrja/Hymdall vs Odyn
    if (x < -200000) return floors[0];
    const odynStarted = encounters.some((e) => (e.encounterId === 1808 || e.encounterId === 1809) && currentMs >= e.startMs - 20000);
    if (y < 295000 || odynStarted) return floors[2];
    return floors[1];
  }

  if (dungeonId === 11492) {
    // Maw of Souls: Helmouth Cliffs (y > 500000) vs Naglfar Ship
    if (y > 500000) return floors[0];
    const harbaronOrLater = encounters.some((e) => (e.encounterId === 1823 || e.encounterId === 1824) && currentMs >= e.startMs - 25000);
    const ymironEnded = encounters.find((e) => e.encounterId === 1822)?.endMs;
    if (ymironEnded !== undefined && currentMs > ymironEnded && currentMs < ymironEnded + 90000 && !harbaronOrLater) {
      return floors[2]; // The Hold lower deck
    }
    return floors[1]; // The Naglfar main deck
  }

  if (dungeonId === 11652) {
    // Upper Karazhan distinct coordinate zones
    if (y < -800000) {
      if (floorContains(floors[2], x, y)) return floors[2]; // The Menagerie
      if (floorContains(floors[1], x, y)) return floors[1]; // Upper Broken Stair
      return floors[0]; // Lower Broken Stair
    }
    if (y < 0) {
      return floorContains(floors[3], x, y) ? floors[3] : floors[4]; // Guardian's Library / Library Floor
    }
    const vizStarted = encounters.some((e) => e.encounterId === 2017 && currentMs >= e.startMs - 25000);
    if (vizStarted || !floorContains(floors[5], x, y) && !floorContains(floors[6], x, y)) return floors[7]; // Netherspace
    if (y < 395000 && floorContains(floors[6], x, y)) return floors[6]; // Gamesman's Hall
    return floorContains(floors[5], x, y) ? floors[5] : floors[7]; // Upper Library / Netherspace
  }

  const matching = floors.filter((f) => floorContains(f, x, y));
  if (matching.length === 0) return floors[0];
  if (matching.length === 1) return matching[0];

  // For vertically stacked dungeons (BRH, CoEN, VotW, CoS, Lower Kara), pick based on run progress or largest encompassing first floor
  const totalEnc = encounters.length;
  if (totalEnc > 0) {
    const completed = encounters.filter((e) => currentMs >= e.startMs).length;
    const approxIdx = Math.min(floors.length - 1, Math.floor((completed / Math.max(1, totalEnc)) * floors.length));
    if (matching.includes(floors[approxIdx])) return floors[approxIdx];
  }

  return matching[0];
}
