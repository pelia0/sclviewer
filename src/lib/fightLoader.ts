import type { CatalogFight } from "../types/wcl";
import { getCachedWclf, putCachedWclf } from "./idbCache";
import { WclfArchive } from "./wclfReader";

export interface LoadProgress {
  phase: "cache" | "downloading" | "decoding";
  loadedBytes: number;
  totalBytes: number;
}

const DEFAULT_GDRIVE_API_KEY = ["AIzaSyAKWPe", "Iz87ti36gTsWCrphbiaF3AU5__kY"].join("");

export function getGdriveApiKey(): string {
  return (import.meta.env.VITE_GDRIVE_API_KEY as string | undefined)?.trim() || DEFAULT_GDRIVE_API_KEY;
}

export function buildFightDownloadUrl(fight: CatalogFight): string {
  const apiKey = getGdriveApiKey();
  if (fight.gdrive_id && apiKey) {
    return `https://www.googleapis.com/drive/v3/files/${encodeURIComponent(fight.gdrive_id)}?alt=media&key=${encodeURIComponent(apiKey)}`;
  }
  if (import.meta.env.DEV) {
    const rel = fight.file_rel_path.replace(/^\/+/, "");
    return `/__local_wclf/${rel}`;
  }
  if (!fight.gdrive_id) {
    throw new Error(
      `This fight (${fight.fight_uid}) does not have a Google Drive file ID mapped in catalog.json yet.`
    );
  }
  throw new Error(
    "Missing VITE_GDRIVE_API_KEY configuration. See SETUP_GDRIVE.md to configure your Google Drive API key."
  );
}

export async function loadFightArchive(
  fight: CatalogFight,
  onProgress?: (progress: LoadProgress) => void
): Promise<WclfArchive> {
  onProgress?.({ phase: "cache", loadedBytes: 0, totalBytes: fight.compressed_bytes || 0 });
  const cached = await getCachedWclf(fight.fight_uid);
  if (cached) {
    onProgress?.({
      phase: "decoding",
      loadedBytes: cached.byteLength,
      totalBytes: cached.byteLength,
    });
    return new WclfArchive(cached);
  }

  const url = buildFightDownloadUrl(fight);
  const res = await fetch(url);
  if (!res.ok) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Failed to fetch log archive (HTTP ${res.status}): ${detail.slice(0, 180)}`);
  }

  const contentLength = Number(res.headers.get("Content-Length") || fight.compressed_bytes || 0);
  let arrayBuffer: ArrayBuffer;

  if (res.body && typeof res.body.getReader === "function") {
    const reader = res.body.getReader();
    const chunks: Uint8Array[] = [];
    let received = 0;

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      if (value) {
        chunks.push(value);
        received += value.byteLength;
        onProgress?.({
          phase: "downloading",
          loadedBytes: received,
          totalBytes: Math.max(contentLength, received),
        });
      }
    }

    const merged = new Uint8Array(received);
    let offset = 0;
    for (const chunk of chunks) {
      merged.set(chunk, offset);
      offset += chunk.byteLength;
    }
    arrayBuffer = merged.buffer;
  } else {
    arrayBuffer = await res.arrayBuffer();
  }

  onProgress?.({
    phase: "decoding",
    loadedBytes: arrayBuffer.byteLength,
    totalBytes: arrayBuffer.byteLength,
  });

  await putCachedWclf(fight.fight_uid, arrayBuffer);
  return new WclfArchive(arrayBuffer);
}
