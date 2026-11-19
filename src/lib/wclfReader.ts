import { decode, ExtensionCodec } from "@msgpack/msgpack";
import * as fzstd from "fzstd";
import { XzReadableStream } from "xz-decompress";
import type { RawCombatEvent, WclfMetadata, WclfSummary } from "../types/wcl";

export const MISSING_EXT = Symbol("WCLF_MISSING");

const textDecoder = new TextDecoder("utf-8");

const wclfExtensionCodec = new ExtensionCodec();
// Ext 1: _MISSING sentinel for dense WCLF2 columns
wclfExtensionCodec.register({
  type: 1,
  encode: () => null,
  decode: () => MISSING_EXT,
});
// Ext 2: Python Decimal encoded as ASCII string
wclfExtensionCodec.register({
  type: 2,
  encode: () => null,
  decode: (data: Uint8Array) => {
    const num = Number(textDecoder.decode(data));
    return Number.isNaN(num) ? 0 : num;
  },
});
// Ext 3: Python big int encoded as ASCII string
wclfExtensionCodec.register({
  type: 3,
  encode: () => null,
  decode: (data: Uint8Array) => {
    const str = textDecoder.decode(data);
    const num = Number(str);
    return Number.isNaN(num) ? 0 : num;
  },
});

export interface SectionIndexEntry {
  offset: number;
  length: number;
  size: number;
  sha256: Uint8Array;
  compression?: "zstd" | "lzma";
  encoding?: string;
}

export type SectionName = "summary" | "events" | "replay" | "metadata";

export interface WclfHeader {
  magicVersion: 2 | 3;
  bodyOffset: number;
  index: Record<SectionName, SectionIndexEntry>;
}

export interface DenseOrSparseColumn {
  values: unknown[];
  presence?: Uint8Array;
}

export interface ColumnTable {
  count: number;
  columns: Record<string, DenseOrSparseColumn | unknown[]>;
}

interface EncodedColumnTable {
  table: ColumnTable;
  shared_columns: Record<string, string>;
  column_order: string[];
  delta_columns: string[];
}

export function parseWclfHeader(buffer: ArrayBuffer): WclfHeader {
  if (buffer.byteLength < 9) {
    throw new Error("Invalid WCLF file: buffer too small");
  }
  const bytes = new Uint8Array(buffer);
  const magic = String.fromCharCode(bytes[0], bytes[1], bytes[2], bytes[3]);
  const version = bytes[4];
  if (magic !== "WCLF" || (version !== 2 && version !== 3)) {
    throw new Error(`Invalid WCLF magic header: ${magic} v${version}`);
  }
  const view = new DataView(buffer);
  const headerSize = view.getUint32(5, true);
  if (headerSize <= 0 || headerSize > 1024 * 1024 || 9 + headerSize > buffer.byteLength) {
    throw new Error(`Corrupt WCLF header size: ${headerSize}`);
  }
  const headerSlice = new Uint8Array(buffer, 9, headerSize);
  const index = decode(headerSlice, {
    extensionCodec: wclfExtensionCodec,
  }) as Record<SectionName, SectionIndexEntry>;

  return {
    magicVersion: version,
    bodyOffset: 9 + headerSize,
    index,
  };
}

async function decompressXz(compressed: Uint8Array, expectedSize: number): Promise<Uint8Array> {
  const inputStream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(compressed);
      controller.close();
    },
  });
  const xzStream = new XzReadableStream(inputStream);
  const reader = xzStream.getReader();
  const out = new Uint8Array(expectedSize);
  let offset = 0;

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value && value.byteLength > 0) {
      if (offset + value.byteLength > out.byteLength) {
        // Fallback if expectedSize was exceeded
        const grown = new Uint8Array(offset + value.byteLength);
        grown.set(out.subarray(0, offset), 0);
        grown.set(value, offset);
        return grown;
      }
      out.set(value, offset);
      offset += value.byteLength;
    }
  }
  return offset === expectedSize ? out : out.subarray(0, offset);
}

export async function decompressSection(
  buffer: ArrayBuffer,
  bodyOffset: number,
  entry: SectionIndexEntry,
  magicVersion: 2 | 3
): Promise<Uint8Array> {
  const start = bodyOffset + entry.offset;
  if (start + entry.length > buffer.byteLength) {
    throw new Error("Corrupt WCLF section bounds");
  }
  const compressed = new Uint8Array(buffer, start, entry.length);
  const codec = entry.compression ?? (magicVersion === 2 ? "zstd" : undefined);
  if (codec === "zstd") {
    return fzstd.decompress(compressed);
  }
  if (codec === "lzma") {
    return decompressXz(compressed, entry.size);
  }
  throw new Error(`Unsupported WCLF section compression codec: ${String(codec)}`);
}

export function decodeColumnTable(
  encoded: EncodedColumnTable,
  canonicalTable?: ColumnTable
): ColumnTable {
  const table = encoded.table;
  const columns: Record<string, DenseOrSparseColumn | unknown[]> = { ...table.columns };
  const shared = encoded.shared_columns || {};
  const order = encoded.column_order || Object.keys(columns);
  const deltas = encoded.delta_columns || [];

  for (const [key, ref] of Object.entries(shared)) {
    if (!canonicalTable || !(ref in canonicalTable.columns)) {
      throw new Error(`Missing shared canonical column: ${ref}`);
    }
    columns[key] = canonicalTable.columns[ref];
  }

  for (const key of deltas) {
    const col = columns[key] as DenseOrSparseColumn;
    if (!col || !Array.isArray(col.values)) {
      throw new Error(`Invalid delta column: ${key}`);
    }
    const rawVals = col.values as number[];
    const restored = new Array<number>(rawVals.length);
    let prev = 0;
    for (let i = 0; i < rawVals.length; i++) {
      prev += rawVals[i];
      restored[i] = prev;
    }
    columns[key] = { ...col, values: restored };
  }

  const orderedCols: Record<string, DenseOrSparseColumn | unknown[]> = {};
  for (const key of order) {
    orderedCols[key] = columns[key];
  }
  return { count: table.count, columns: orderedCols };
}

export function tableToRecords<T extends Record<string, unknown>>(table: ColumnTable): T[] {
  const { count, columns } = table;
  const rows: Record<string, unknown>[] = Array.from({ length: count }, () => ({}));

  for (const [key, column] of Object.entries(columns)) {
    if (Array.isArray(column)) {
      for (let i = 0; i < count; i++) {
        const val = column[i];
        if (val !== MISSING_EXT) {
          rows[i][key] = val;
        }
      }
      continue;
    }

    const col = column as DenseOrSparseColumn;
    const values = col.values;
    const presence = col.presence;

    if (!presence) {
      for (let i = 0; i < count; i++) {
        rows[i][key] = values[i];
      }
      continue;
    }

    let valIdx = 0;
    for (let byteIdx = 0; byteIdx < presence.length; byteIdx++) {
      const byte = presence[byteIdx];
      if (byte === 0) continue;
      const base = byteIdx << 3;
      for (let bit = 0; bit < 8; bit++) {
        if (byte & (1 << bit)) {
          rows[base + bit][key] = values[valIdx++];
        }
      }
    }
  }

  return rows as T[];
}

export class WclfArchive {
  private readonly buffer: ArrayBuffer;
  private readonly header: WclfHeader;
  private summaryCache?: WclfSummary;
  private metadataCache?: WclfMetadata;
  private eventsTableCache?: ColumnTable;
  private eventsCache?: RawCombatEvent[];
  private replayCache?: RawCombatEvent[];

  constructor(buffer: ArrayBuffer) {
    this.buffer = buffer;
    this.header = parseWclfHeader(buffer);
  }

  private async decodeRawSection<T>(name: SectionName): Promise<T> {
    const entry = this.header.index[name];
    if (!entry) {
      throw new Error(`Missing WCLF section: ${name}`);
    }
    const raw = await decompressSection(
      this.buffer,
      this.header.bodyOffset,
      entry,
      this.header.magicVersion
    );
    return decode(raw, { extensionCodec: wclfExtensionCodec }) as T;
  }

  async readSummary(): Promise<WclfSummary> {
    if (!this.summaryCache) {
      this.summaryCache = await this.decodeRawSection<WclfSummary>("summary");
    }
    return this.summaryCache;
  }

  async readMetadata(): Promise<WclfMetadata> {
    if (!this.metadataCache) {
      this.metadataCache = await this.decodeRawSection<WclfMetadata>("metadata");
    }
    return this.metadataCache;
  }

  private async readEventsTable(): Promise<ColumnTable> {
    if (this.eventsTableCache) {
      return this.eventsTableCache;
    }
    const entry = this.header.index.events;
    const decoded = await this.decodeRawSection<unknown>("events");
    if (entry.encoding === "columns-v1") {
      this.eventsTableCache = decodeColumnTable(decoded as EncodedColumnTable);
    } else if (decoded && typeof decoded === "object" && "count" in decoded && "columns" in decoded) {
      this.eventsTableCache = decoded as ColumnTable;
    } else {
      throw new Error("Unsupported events section format");
    }
    return this.eventsTableCache;
  }

  async readEvents(): Promise<RawCombatEvent[]> {
    if (!this.eventsCache) {
      const entry = this.header.index.events;
      if (this.header.magicVersion === 2 && entry.encoding !== "columns-v1") {
        const decoded = await this.decodeRawSection<unknown>("events");
        if (Array.isArray(decoded)) {
          this.eventsCache = decoded as RawCombatEvent[];
          return this.eventsCache;
        }
      }
      const table = await this.readEventsTable();
      this.eventsCache = tableToRecords<RawCombatEvent>(table);
    }
    return this.eventsCache;
  }

  async readReplay(): Promise<RawCombatEvent[]> {
    if (!this.replayCache) {
      const entry = this.header.index.replay;
      const decoded = await this.decodeRawSection<EncodedColumnTable | ColumnTable | RawCombatEvent[]>("replay");
      if (entry.encoding === "columns-v1") {
        const enc = decoded as EncodedColumnTable;
        const needsCanonical = enc.shared_columns && Object.keys(enc.shared_columns).length > 0;
        const canonical = needsCanonical ? await this.readEventsTable() : undefined;
        const table = decodeColumnTable(enc, canonical);
        this.replayCache = tableToRecords<RawCombatEvent>(table);
      } else if (Array.isArray(decoded)) {
        this.replayCache = decoded;
      } else {
        this.replayCache = tableToRecords<RawCombatEvent>(decoded as ColumnTable);
      }
    }
    return this.replayCache;
  }
}
