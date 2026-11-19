#!/usr/bin/env python3
"""Build static catalog.json and spells_dict.json from local WCL archives and Google Drive."""

from __future__ import annotations

import argparse
from concurrent.futures import ProcessPoolExecutor
from datetime import datetime, timezone
import json
import os
from pathlib import Path
import sqlite3
import sys
import urllib.error
import urllib.parse
import urllib.request

DEFAULT_DATA_DIR = Path(r"D:\wowlogsparser\data")
DEFAULT_PARSER_DIR = Path(r"D:\wowlogsparser")
DEFAULT_FOLDER_ID = "1WxyGu4ocykqVJQtYrgoMgoF2MEGEOWdp"

SPEC_BY_ID = {
    250: ("DeathKnight", "Blood", "tank"),
    251: ("DeathKnight", "Frost", "dps"),
    252: ("DeathKnight", "Unholy", "dps"),
    577: ("DemonHunter", "Havoc", "dps"),
    581: ("DemonHunter", "Vengeance", "tank"),
    102: ("Druid", "Balance", "dps"),
    103: ("Druid", "Feral", "dps"),
    104: ("Druid", "Guardian", "tank"),
    105: ("Druid", "Restoration", "healer"),
    253: ("Hunter", "BeastMastery", "dps"),
    254: ("Hunter", "Marksmanship", "dps"),
    255: ("Hunter", "Survival", "dps"),
    62: ("Mage", "Arcane", "dps"),
    63: ("Mage", "Fire", "dps"),
    64: ("Mage", "Frost", "dps"),
    268: ("Monk", "Brewmaster", "tank"),
    270: ("Monk", "Mistweaver", "healer"),
    269: ("Monk", "Windwalker", "dps"),
    65: ("Paladin", "Holy", "healer"),
    66: ("Paladin", "Protection", "tank"),
    70: ("Paladin", "Retribution", "dps"),
    256: ("Priest", "Discipline", "healer"),
    257: ("Priest", "Holy", "healer"),
    258: ("Priest", "Shadow", "dps"),
    259: ("Rogue", "Assassination", "dps"),
    260: ("Rogue", "Outlaw", "dps"),
    261: ("Rogue", "Subtlety", "dps"),
    262: ("Shaman", "Elemental", "dps"),
    263: ("Shaman", "Enhancement", "dps"),
    264: ("Shaman", "Restoration", "healer"),
    265: ("Warlock", "Affliction", "dps"),
    266: ("Warlock", "Demonology", "dps"),
    267: ("Warlock", "Destruction", "dps"),
    71: ("Warrior", "Arms", "dps"),
    72: ("Warrior", "Fury", "dps"),
    73: ("Warrior", "Protection", "tank"),
}

SPEC_ROLE_BY_NAME = {(cls, spec): role for cls, spec, role in SPEC_BY_ID.values()}
CLASS_COLORS_KEYS = {cls for cls, _, _ in SPEC_BY_ID.values()}


def _ensure_parser_on_path(parser_dir: Path) -> None:
    if str(parser_dir) not in sys.path:
        sys.path.insert(0, str(parser_dir))


def _is_ascii_label(text: str) -> bool:
    return bool(text) and text.isascii() and "Unknown" not in text and not text.startswith("Spell #")


def _extract_single_fight(task: tuple[str, str, int, int]) -> tuple[str, dict, dict[str, dict]]:
    file_path_str, parser_dir_str, size, mtime_ns = task
    _ensure_parser_on_path(Path(parser_dir_str))
    from wcl_archiver.codec.fight_archive import PackedFightReader

    file_path = Path(file_path_str)
    summary = PackedFightReader.read_summary_only(file_path)

    fight_id = int(summary.get("fight_id", 0) or 0)
    fid_token = f".{fight_id}." if fight_id else ""

    actors = summary.get("actors") or []
    actor_by_id = {int(a["id"]): a for a in actors if "id" in a}
    builds = summary.get("combatant_builds") or {}
    dps_by_actor = {int(d["actor_id"]): float(d.get("dps", 0.0) or 0.0) for d in (summary.get("damage_done") or [])}
    hps_by_actor = {int(h["actor_id"]): float(h.get("hps", 0.0) or 0.0) for h in (summary.get("healing_done") or [])}

    all_player_ids = {
        int(a["id"])
        for a in actors
        if a.get("type") in CLASS_COLORS_KEYS or a.get("subType") in CLASS_COLORS_KEYS
    }
    build_ids = {int(k) for k in builds.keys()}
    active_ids = {aid for aid, val in dps_by_actor.items() if val > 0} | {aid for aid, val in hps_by_actor.items() if val > 0}
    fight_tagged_ids = {
        int(a["id"])
        for a in actors
        if int(a["id"]) in all_player_ids and fid_token and fid_token in str(a.get("fights") or "")
    }
    player_ids = (build_ids | fight_tagged_ids | (all_player_ids & active_ids)) & all_player_ids

    # Friendly player deaths only
    deaths_list = summary.get("deaths") or []
    friendly_deaths = sum(1 for d in deaths_list if int(d.get("target_id", 0) or 0) in player_ids)

    players_from_archive: list[dict] = []
    seen_actor_ids: set[int] = set()

    for aid_str, build in builds.items():
        aid = int(aid_str)
        seen_actor_ids.add(aid)
        actor = actor_by_id.get(aid, {})
        spec_id = int(build.get("spec_id", 0) or 0)
        cls_name, spec_name, role = SPEC_BY_ID.get(spec_id, ("", "", ""))
        if not cls_name:
            cls_name = str(actor.get("type") or "")
            icon = str(actor.get("icon") or "")
            if "-" in icon:
                icon_cls, icon_spec = icon.split("-", 1)
                cls_name = cls_name or icon_cls
                spec_name = icon_spec
                role = SPEC_ROLE_BY_NAME.get((cls_name, spec_name), "dps")

        gear = build.get("gear") or []
        ilvls = [
            int(item.get("itemLevel", 0) or 0)
            for idx, item in enumerate(gear)
            if idx != 3 and int(item.get("id", 0) or 0) > 0 and int(item.get("itemLevel", 0) or 0) > 0
        ]
        avg_ilvl = round(sum(ilvls) / len(ilvls), 1) if ilvls else 0.0

        talents = [
            int(t.get("id") or t.get("guid") or 0)
            for t in (build.get("talents") or [])
            if int(t.get("id") or t.get("guid") or 0) > 0
        ]
        legendaries = [
            int(item["id"])
            for item in gear
            if int(item.get("quality", 0) or 0) == 5 and int(item.get("id", 0) or 0) > 0
        ]
        players_from_archive.append(
            {
                "name": str(actor.get("name") or f"Player #{aid}"),
                "class": cls_name,
                "spec": spec_name,
                "role": role or "dps",
                "ilvl": avg_ilvl,
                "dps": round(dps_by_actor.get(aid, 0.0), 1),
                "hps": round(hps_by_actor.get(aid, 0.0), 1),
                "talents": talents,
                "legendaries": legendaries,
            }
        )

    for aid in sorted(player_ids - seen_actor_ids):
        actor = actor_by_id.get(aid, {})
        cls_name = str(actor.get("type") or "")
        icon = str(actor.get("icon") or "")
        spec_name = icon.split("-", 1)[1] if "-" in icon else ""
        role = SPEC_ROLE_BY_NAME.get((cls_name, spec_name), "dps")
        players_from_archive.append(
            {
                "name": str(actor.get("name") or f"Player #{aid}"),
                "class": cls_name,
                "spec": spec_name,
                "role": role,
                "ilvl": 0.0,
                "dps": round(dps_by_actor.get(aid, 0.0), 1),
                "hps": round(hps_by_actor.get(aid, 0.0), 1),
                "talents": [],
                "legendaries": [],
            }
        )

    abilities_out: dict[str, dict] = {}
    for sid_str, ab in (summary.get("abilities") or {}).items():
        sid = int(ab.get("gameID") or ab.get("guid") or sid_str or 0)
        if sid <= 0:
            continue
        name = str(ab.get("name") or "")
        icon = str(ab.get("icon") or ab.get("abilityIcon") or "")
        school = int(ab.get("type") or 1)
        if name or icon:
            abilities_out[str(sid)] = {"n": name, "s": school, "i": icon}

    extracted = {
        "size": size,
        "mtime_ns": mtime_ns,
        "affixes": [int(a) for a in (summary.get("affixes") or [])],
        "deaths": friendly_deaths,
        "players": players_from_archive,
    }
    return file_path_str, extracted, abilities_out


def _load_dotenv(env_path: Path) -> dict[str, str]:
    values: dict[str, str] = {}
    if not env_path.is_file():
        return values
    for raw_line in env_path.read_text(encoding="utf-8").splitlines():
        line = raw_line.strip()
        if not line or line.startswith("#") or "=" not in line:
            continue
        key, val = line.split("=", 1)
        values[key.strip()] = val.strip().strip('"').strip("'")
    return values


def _write_dotenv(env_path: Path, updates: dict[str, str]) -> None:
    existing_lines = env_path.read_text(encoding="utf-8").splitlines() if env_path.is_file() else []
    seen: set[str] = set()
    new_lines: list[str] = []
    for line in existing_lines:
        stripped = line.strip()
        if stripped and not stripped.startswith("#") and "=" in stripped:
            key = stripped.split("=", 1)[0].strip()
            if key in updates:
                new_lines.append(f"{key}={updates[key]}")
                seen.add(key)
                continue
        new_lines.append(line)
    for key, val in updates.items():
        if key not in seen:
            new_lines.append(f"{key}={val}")
    env_path.write_text("\n".join(new_lines) + "\n", encoding="utf-8")


def _gdrive_list(query: str, api_key: str) -> list[dict]:
    items: list[dict] = []
    page_token: str | None = None
    while True:
        params = {
            "q": query,
            "fields": "nextPageToken,files(id,name,mimeType,size)",
            "pageSize": "1000",
            "key": api_key,
            "supportsAllDrives": "true",
            "includeItemsFromAllDrives": "true",
        }
        if page_token:
            params["pageToken"] = page_token
        url = "https://www.googleapis.com/drive/v3/files?" + urllib.parse.urlencode(params)
        req = urllib.request.Request(url, headers={"Accept": "application/json"})
        with urllib.request.urlopen(req, timeout=30) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        items.extend(payload.get("files") or [])
        page_token = payload.get("nextPageToken")
        if not page_token:
            break
    return items


def scan_google_drive_folder(folder_id: str, api_key: str) -> dict[str, str]:
    """Recursively index all .wclf files in folder_id, returning {rel_path_or_name: file_id}."""
    file_map: dict[str, str] = {}
    queue: list[tuple[str, str]] = [(folder_id, "")]
    visited_folders: set[str] = set()

    while queue:
        current_id, prefix = queue.pop(0)
        if current_id in visited_folders:
            continue
        visited_folders.add(current_id)

        children = _gdrive_list(f"'{current_id}' in parents and trashed = false", api_key)
        for item in children:
            name = item.get("name", "")
            mime = item.get("mimeType", "")
            item_id = item.get("id", "")
            rel = f"{prefix}/{name}" if prefix else name
            if mime == "application/vnd.google-apps.folder":
                queue.append((item_id, rel))
            elif name.endswith(".wclf"):
                file_map[rel] = item_id
                file_map.setdefault(name, item_id)
    return file_map


def _merge_spell_entry(spells: dict[str, dict], sid: str, entry: dict) -> None:
    prev = spells.get(sid)
    if prev is None:
        spells[sid] = entry
        return
    new_name = entry.get("n") or ""
    old_name = prev.get("n") or ""
    if (not old_name and new_name) or (_is_ascii_label(new_name) and not _is_ascii_label(old_name)):
        prev["n"] = new_name
    if not prev.get("i") and entry.get("i"):
        prev["i"] = entry["i"]
    if (not prev.get("s") or prev.get("s") == 1) and entry.get("s"):
        prev["s"] = entry["s"]


def main() -> int:
    repo_root = Path(__file__).resolve().parent.parent
    env_path = repo_root / ".env.local"
    env_vals = _load_dotenv(env_path)

    parser = argparse.ArgumentParser(description="Build static catalog.json and sync Google Drive file IDs.")
    parser.add_argument("--data-dir", type=Path, default=DEFAULT_DATA_DIR)
    parser.add_argument("--parser-dir", type=Path, default=DEFAULT_PARSER_DIR)
    parser.add_argument("--output-dir", type=Path, default=repo_root / "public" / "data")
    parser.add_argument("--folder-id", type=str, default=env_vals.get("VITE_GDRIVE_FOLDER_ID", DEFAULT_FOLDER_ID))
    parser.add_argument("--api-key", type=str, default=os.environ.get("VITE_GDRIVE_API_KEY") or env_vals.get("VITE_GDRIVE_API_KEY", ""))
    parser.add_argument("--workers", type=int, default=min(12, max(2, os.cpu_count() or 4)))
    args = parser.parse_args()

    args.output_dir.mkdir(parents=True, exist_ok=True)
    cache_path = repo_root / "scripts" / ".catalog_cache.json"
    gdrive_map_path = repo_root / "scripts" / "gdrive_map.json"

    if args.api_key:
        _write_dotenv(env_path, {
            "VITE_GDRIVE_API_KEY": args.api_key,
            "VITE_GDRIVE_FOLDER_ID": args.folder_id,
        })
        print(f"Updated {env_path} with VITE_GDRIVE_API_KEY and VITE_GDRIVE_FOLDER_ID={args.folder_id}")

    # 1. Load base spells from master_dict.db
    spells: dict[str, dict] = {}
    master_db_path = args.data_dir / "master_dict.db"
    if master_db_path.is_file():
        mconn = sqlite3.connect(master_db_path)
        mconn.row_factory = sqlite3.Row
        for row in mconn.execute("SELECT spell_id, name, school, icon FROM spells"):
            sid = int(row["spell_id"])
            if sid <= 0:
                continue
            spells[str(sid)] = {
                "n": row["name"] or "",
                "s": int(row["school"] or 1),
                "i": row["icon"] or "",
            }
        mconn.close()
    print(f"Loaded {len(spells)} base spells from master_dict.db")

    # 2. Load packed M+ fights and DB participants from index.db
    index_db_path = args.data_dir / "index.db"
    iconn = sqlite3.connect(index_db_path)
    iconn.row_factory = sqlite3.Row
    fight_rows = iconn.execute(
        """
        SELECT fight_uid, report_code, fight_id, encounter_id, encounter_slug,
               keystone_level, duration_ms, file_rel_path, compressed_bytes, event_count
        FROM fights
        WHERE status = 'PACKED' AND content_type = 'mplus'
        ORDER BY keystone_level DESC, duration_ms ASC
        """
    ).fetchall()
    part_rows = iconn.execute(
        """
        SELECT fight_uid, player_name, class_name, spec_name, role
        FROM fight_participants
        """
    ).fetchall()
    iconn.close()

    db_parts_by_fight: dict[str, list[dict]] = {}
    for pr in part_rows:
        db_parts_by_fight.setdefault(pr["fight_uid"], []).append(dict(pr))
    print(f"Loaded {len(fight_rows)} packed Mythic+ fights from index.db")

    # 3. Load incremental summary cache
    cache: dict[str, dict] = {}
    if cache_path.is_file():
        try:
            cached_blob = json.loads(cache_path.read_text(encoding="utf-8"))
            cache = cached_blob.get("fights") or {}
            for sid, sentry in (cached_blob.get("spells") or {}).items():
                _merge_spell_entry(spells, sid, sentry)
        except Exception:
            cache = {}

    tasks: list[tuple[str, str, int, int]] = []
    rel_by_abs: dict[str, str] = {}
    for row in fight_rows:
        rel_path = row["file_rel_path"]
        abs_path = (args.data_dir / rel_path).resolve()
        if not abs_path.is_file():
            continue
        st = abs_path.stat()
        abs_str = str(abs_path)
        rel_by_abs[abs_str] = rel_path
        prev = cache.get(rel_path)
        if prev and prev.get("size") == st.st_size and prev.get("mtime_ns") == st.st_mtime_ns:
            continue
        tasks.append((abs_str, str(args.parser_dir), st.st_size, st.st_mtime_ns))

    if tasks:
        print(f"Reading summary sections from {len(tasks)} .wclf archives using {args.workers} workers...")
        done = 0
        with ProcessPoolExecutor(max_workers=args.workers) as pool:
            for abs_str, extracted, fight_spells in pool.map(_extract_single_fight, tasks, chunksize=16):
                rel_path = rel_by_abs[abs_str]
                cache[rel_path] = extracted
                for sid, sentry in fight_spells.items():
                    _merge_spell_entry(spells, sid, sentry)
                done += 1
                if done % 250 == 0 or done == len(tasks):
                    print(f"  Processed {done}/{len(tasks)} archives")

    cache_path.write_text(json.dumps({"fights": cache, "spells": spells}, ensure_ascii=False), encoding="utf-8")

    # 4. Scan Google Drive if API key is available, or reuse gdrive_map.json
    gdrive_map: dict[str, str] = {}
    if gdrive_map_path.is_file():
        try:
            gdrive_map = json.loads(gdrive_map_path.read_text(encoding="utf-8"))
        except Exception:
            gdrive_map = {}

    if args.api_key:
        print(f"Scanning Google Drive folder {args.folder_id}...")
        try:
            scanned = scan_google_drive_folder(args.folder_id, args.api_key)
            gdrive_map.update(scanned)
            gdrive_map_path.write_text(json.dumps(gdrive_map, ensure_ascii=False, indent=2), encoding="utf-8")
            print(f"Indexed {sum(1 for k in scanned if '/' in k or not k.endswith('.wclf') is False)} entries from Google Drive")
        except urllib.error.HTTPError as exc:
            body = exc.read().decode("utf-8", "ignore")
            print(f"WARNING: Google Drive scan failed (HTTP {exc.code}): {body}", file=sys.stderr)
        except Exception as exc:
            print(f"WARNING: Google Drive scan failed: {exc}", file=sys.stderr)
    else:
        print("No --api-key / VITE_GDRIVE_API_KEY configured; skipping Google Drive scan (gdrive_id will use cached map if present).")

    # 5. Assemble catalog.json
    fights_out: list[dict] = []
    matched_gdrive = 0
    for row in fight_rows:
        rel_path = row["file_rel_path"]
        extracted = cache.get(rel_path)
        if not extracted:
            continue

        # Merge archive players with DB participant metadata fallback
        db_by_name = {p["player_name"]: p for p in db_parts_by_fight.get(row["fight_uid"], [])}
        players: list[dict] = []
        for pl in extracted["players"]:
            db_match = db_by_name.get(pl["name"])
            cls_name = pl["class"] or (db_match["class_name"] if db_match else "")
            spec_name = pl["spec"] or (db_match["spec_name"] if db_match else "")
            role = pl["role"] or (db_match["role"] if db_match else "dps")
            players.append({
                "name": pl["name"],
                "class": cls_name,
                "spec": spec_name,
                "role": role,
                "ilvl": pl["ilvl"],
                "dps": pl["dps"],
                "hps": pl["hps"],
                "talents": pl["talents"],
                "legendaries": pl["legendaries"],
            })

        # Sort party: tank -> healer -> dps by DPS desc
        role_order = {"tank": 0, "healer": 1, "dps": 2}
        players.sort(key=lambda p: (role_order.get(p["role"], 3), -p["dps"]))

        # Look up Google Drive ID by multiple candidate path keys
        rel_no_prefix = rel_path[len("mplus_s5/"):] if rel_path.startswith("mplus_s5/") else rel_path
        filename = Path(rel_path).name
        gdrive_id = gdrive_map.get(rel_path) or gdrive_map.get(rel_no_prefix) or gdrive_map.get(filename) or ""
        if gdrive_id:
            matched_gdrive += 1

        fights_out.append(
            {
                "fight_uid": row["fight_uid"],
                "report_code": row["report_code"],
                "fight_id": int(row["fight_id"]),
                "encounter_id": int(row["encounter_id"]),
                "encounter_slug": row["encounter_slug"],
                "keystone_level": int(row["keystone_level"]),
                "duration_ms": int(row["duration_ms"]),
                "affixes": extracted["affixes"],
                "deaths": extracted["deaths"],
                "compressed_bytes": int(row["compressed_bytes"] or 0),
                "file_rel_path": rel_path,
                "gdrive_id": gdrive_id,
                "participants": players,
            }
        )

    catalog_payload = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "total_fights": len(fights_out),
        "gdrive_folder_id": args.folder_id,
        "fights": fights_out,
    }

    catalog_path = args.output_dir / "catalog.json"
    spells_path = args.output_dir / "spells_dict.json"
    catalog_path.write_text(json.dumps(catalog_payload, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")
    spells_path.write_text(json.dumps(spells, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")

    print(
        f"Wrote {catalog_path} ({catalog_path.stat().st_size / 1024 / 1024:.2f} MB, "
        f"{len(fights_out)} fights, {matched_gdrive} matched gdrive_id) "
        f"and {spells_path} ({spells_path.stat().st_size / 1024:.1f} KB, {len(spells)} spells)"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
