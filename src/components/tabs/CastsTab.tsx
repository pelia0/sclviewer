import { useMemo, useState } from "react";
import { formatTimestampMMSS, getSchoolColor, getWowheadIconUrl } from "../../data/legionConstants";
import { resolveAbility, type CastAbilityRow, type CastTimelineEntry, type FightContext } from "../../lib/combatAnalyzer";
import type { SpellDict } from "../../types/wcl";
import { Pagination } from "../Pagination";
import { SpellLink, useWowheadTooltips } from "../WowLinks";

interface CastsTabProps {
  ctx: FightContext;
  casts: {
    totalCasts: number;
    byAbility: CastAbilityRow[];
    timeline: CastTimelineEntry[];
  };
  spellDict?: SpellDict;
}

export function CastsTab({ ctx, casts, spellDict }: CastsTabProps) {
  const [subMode, setSubMode] = useState<"summary" | "timeline">("summary");
  const [page, setPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);

  const totalPages = Math.max(1, Math.ceil(casts.timeline.length / pageSize));
  const safePage = Math.max(1, Math.min(totalPages, page));
  const pageCasts = useMemo(() => {
    const start = (safePage - 1) * pageSize;
    return casts.timeline.slice(start, start + pageSize);
  }, [casts.timeline, safePage, pageSize]);

  useWowheadTooltips([subMode, casts.byAbility, pageCasts]);

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
        <div style={{ display: "flex", gap: 6 }}>
          <button
            className={`wcl-btn ${subMode === "summary" ? "wcl-btn-primary" : ""}`}
            onClick={() => setSubMode("summary")}
          >
            Abilities &amp; CPM ({casts.byAbility.length})
          </button>
          <button
            className={`wcl-btn ${subMode === "timeline" ? "wcl-btn-primary" : ""}`}
            onClick={() => setSubMode("timeline")}
          >
            Cast Timeline &amp; Rotation ({casts.timeline.length.toLocaleString()})
          </button>
        </div>
        <span style={{ color: "var(--wcl-muted)", fontSize: 12 }}>
          Total Casts: <strong style={{ color: "#fff" }}>{casts.totalCasts.toLocaleString()}</strong>
        </span>
      </div>

      {subMode === "summary" ? (
        <div className="wcl-card" style={{ marginBottom: 0 }}>
          <div className="wcl-card-title">Casts by Ability</div>
          <div className="wcl-table-wrap">
            <table className="wcl-table">
              <thead>
                <tr>
                  <th>Ability</th>
                  <th>Casts &amp; Share</th>
                  <th className="num" style={{ width: 95 }}>CPM</th>
                </tr>
              </thead>
              <tbody>
                {casts.byAbility.map((row) => (
                  <tr key={row.abilityId}>
                    <td>
                      <SpellLink spellId={row.abilityId} name={row.name} icon={row.icon} school={row.school} />
                    </td>
                    <td className="wcl-bar-cell">
                      <div className="wcl-bar-track">
                        <div
                          className="wcl-bar-fill"
                          style={{ width: `${row.sharePct}%`, background: getSchoolColor(row.school) }}
                        />
                        <div className="wcl-bar-text">
                          <span>{row.count.toLocaleString()}</span>
                          <span>{row.sharePct}%</span>
                        </div>
                      </div>
                    </td>
                    <td className="num" style={{ fontWeight: 700 }}>{row.cpm}</td>
                  </tr>
                ))}
                {casts.byAbility.length === 0 && (
                  <tr>
                    <td colSpan={3} style={{ textAlign: "center", color: "var(--wcl-muted)" }}>
                      No casts found for selected filters.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="wcl-card" style={{ marginBottom: 0 }}>
          {/* Visual Rotation Icon Strip for current page */}
          {pageCasts.length > 0 && (
            <div style={{ marginBottom: 12 }}>
              <div style={{ fontSize: 11, color: "var(--wcl-muted)", textTransform: "uppercase", marginBottom: 6 }}>
                Rotation Sequence (Current Page — hover icons for spell &amp; timestamp)
              </div>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 3,
                  background: "#090c11",
                  border: "1px solid #1e2638",
                  borderRadius: 4,
                  padding: 8,
                }}
              >
                {pageCasts.slice(0, 120).map((c, idx) => {
                  const ab = resolveAbility(c.abilityId, ctx.abilitiesById, spellDict);
                  return (
                    <a
                      key={`${c.tMs}-${c.actorId}-${idx}`}
                      href={`https://www.wowhead.com/spell=${c.abilityId}`}
                      data-wowhead={`spell=${c.abilityId}`}
                      target="_blank"
                      rel="noreferrer"
                      title={`${formatTimestampMMSS(c.tMs, true)} — ${ctx.actorsById[c.actorId]?.name || ""} — ${ab.name}`}
                    >
                      <img
                        src={getWowheadIconUrl(ab.icon, "small")}
                        alt={ab.name}
                        className="wcl-icon"
                        style={{ width: 22, height: 22 }}
                      />
                    </a>
                  );
                })}
              </div>
            </div>
          )}

          <Pagination
            totalItems={casts.timeline.length}
            page={safePage}
            pageSize={pageSize}
            pageSizeOptions={[50, 100, 250, 500]}
            onPageChange={setPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
            itemLabel="casts"
          />

          <div className="wcl-table-wrap">
            <table className="wcl-table">
              <thead>
                <tr>
                  <th style={{ width: 105 }}>Time</th>
                  <th style={{ width: 150 }}>Player</th>
                  <th style={{ width: 240 }}>Ability</th>
                  <th style={{ width: 180 }}>Target</th>
                  <th>Active Buffs at Cast</th>
                </tr>
              </thead>
              <tbody>
                {pageCasts.map((c, idx) => {
                  const player = ctx.playerProfiles.find((p) => p.actorId === c.actorId);
                  const ab = resolveAbility(c.abilityId, ctx.abilitiesById, spellDict);
                  const tgt = c.targetId ? ctx.actorsById[c.targetId] : null;
                  return (
                    <tr key={`${c.tMs}-${c.actorId}-${idx}`}>
                      <td style={{ fontFamily: "monospace", color: "var(--wcl-muted)" }}>
                        {formatTimestampMMSS(c.tMs, true)}
                      </td>
                      <td style={{ color: player?.color || "#e2e8f0", fontWeight: 600 }}>
                        {ctx.actorsById[c.actorId]?.name || `Actor #${c.actorId}`}
                      </td>
                      <td>
                        <SpellLink spellId={c.abilityId} name={ab.name} icon={ab.icon} school={ab.school} />
                      </td>
                      <td style={{ color: tgt ? "#cbd5e1" : "var(--wcl-dim)" }}>
                        {tgt ? tgt.name : "—"}
                      </td>
                      <td>
                        <div style={{ display: "flex", flexWrap: "wrap", gap: 3 }}>
                          {c.activeBuffs.map((bid) => {
                            const bab = resolveAbility(bid, ctx.abilitiesById, spellDict);
                            return (
                              <a
                                key={bid}
                                href={`https://www.wowhead.com/spell=${bid}`}
                                data-wowhead={`spell=${bid}`}
                                target="_blank"
                                rel="noreferrer"
                                title={bab.name}
                              >
                                <img
                                  src={getWowheadIconUrl(bab.icon, "small")}
                                  alt=""
                                  className="wcl-icon wcl-icon-sm"
                                />
                              </a>
                            );
                          })}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {pageCasts.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ textAlign: "center", color: "var(--wcl-muted)" }}>
                      No cast events found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <Pagination
            totalItems={casts.timeline.length}
            page={safePage}
            pageSize={pageSize}
            pageSizeOptions={[50, 100, 250, 500]}
            onPageChange={setPage}
            onPageSizeChange={(sz) => {
              setPageSize(sz);
              setPage(1);
            }}
            itemLabel="casts"
          />
        </div>
      )}
    </div>
  );
}
