import fs from "node:fs";
import path from "node:path";
import { encode } from "@msgpack/msgpack";
import { describe, expect, it } from "vitest";
import { decodeColumnTable, parseWclfHeader, tableToRecords, WclfArchive } from "../wclfReader";

const SAMPLE_WCLF = path.resolve(
  "D:/wowlogsparser/data/mplus_s5/11456_eye-of-azshara/k10_15m49s_FJqAkpHyB6naDZbz_f11.wclf"
);

describe("WclfArchive client-side WCLF3 decoder", () => {
  it("decodes columnar delta + LSB presence bitmap tables", () => {
    const canonical = decodeColumnTable({
      table: {
        count: 3,
        columns: {
          timestamp: { values: [1000, 250, 500] },
          type: { values: ["damage", "heal", "damage"] },
          overkill: { values: [42], presence: new Uint8Array([0b00000100]) },
        },
      },
      shared_columns: {},
      column_order: ["timestamp", "type", "overkill"],
      delta_columns: ["timestamp"],
    });

    const records = tableToRecords(canonical);
    expect(records).toEqual([
      { timestamp: 1000, type: "damage" },
      { timestamp: 1250, type: "heal" },
      { timestamp: 1750, type: "damage", overkill: 42 },
    ]);

    // Verify header parser rejects invalid magic
    const bad = new Uint8Array([0x00, 0x01, 0x02, 0x03, 0x03, 0, 0, 0, 0]).buffer;
    expect(() => parseWclfHeader(bad)).toThrow();
    void encode;
  });

  it.skipIf(!fs.existsSync(SAMPLE_WCLF))(
    "decodes summary, metadata, events, and replay from a real .wclf archive",
    async () => {
      const fileBuf = fs.readFileSync(SAMPLE_WCLF);
      const arrayBuf = fileBuf.buffer.slice(fileBuf.byteOffset, fileBuf.byteOffset + fileBuf.byteLength);

      const archive = new WclfArchive(arrayBuf);
      const summary = await archive.readSummary();
      expect(summary.report_code).toBe("FJqAkpHyB6naDZbz");
      expect(summary.fight_id).toBe(11);
      expect(summary.keystone_level).toBe(10);
      expect(summary.duration_ms).toBeGreaterThan(900_000);
      expect(Object.keys(summary.combatant_builds).length).toBe(5);

      const metadata = await archive.readMetadata();
      expect(metadata.manifest.report_code).toBe("FJqAkpHyB6naDZbz");
      expect(metadata.manifest.start_time).toBeGreaterThan(0);
      expect(metadata.manifest.event_count).toBe(34021);

      const events = await archive.readEvents();
      expect(events.length).toBe(34021);
      const combatantInfo = events.find((e) => e.type === "combatantinfo");
      expect(combatantInfo).toBeDefined();
      expect(combatantInfo?.gear?.length).toBeGreaterThan(10);
      expect(combatantInfo?.talents?.length).toBe(7);
      expect(combatantInfo?.agility || combatantInfo?.strength || combatantInfo?.intellect).toBeGreaterThan(0);

      const replay = await archive.readReplay();
      expect(replay.length).toBe(34021);
      const withCoords = replay.find((e) => e.x !== undefined && e.y !== undefined);
      expect(withCoords).toBeDefined();
    }
  );
});
