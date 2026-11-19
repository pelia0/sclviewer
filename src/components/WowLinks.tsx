import { useEffect } from "react";
import { getSchoolColor, getWowheadIconUrl, QUALITY_COLORS } from "../data/legionConstants";
import type { ResolvedGearSlot } from "../lib/combatAnalyzer";

declare global {
  interface Window {
    $WowheadPower?: {
      refreshLinks?: () => void;
    };
  }
}

export function useWowheadTooltips(deps: unknown[]) {
  useEffect(() => {
    const timer = window.setTimeout(() => {
      try {
        window.$WowheadPower?.refreshLinks?.();
      } catch {
        // Ignore if Wowhead script has not loaded offline
      }
    }, 60);
    return () => window.clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);
}

export function SpellLink({
  spellId,
  name,
  icon,
  school,
  showIcon = true,
  small = false,
}: {
  spellId: number;
  name: string;
  icon?: string;
  school?: number;
  showIcon?: boolean;
  small?: boolean;
}) {
  if (!spellId || spellId <= 0) {
    return <span style={{ color: "#94a3b8" }}>{name || "Melee / Environment"}</span>;
  }
  const color = school ? getSchoolColor(school) : "#60a5fa";
  const iconCls = small ? "wcl-icon wcl-icon-sm" : "wcl-icon";

  return (
    <a
      href={`https://www.wowhead.com/spell=${spellId}`}
      data-wowhead={`spell=${spellId}`}
      target="_blank"
      rel="noreferrer"
      className="wcl-spell-link"
      style={{ color }}
      onClick={(e) => e.stopPropagation()}
    >
      {showIcon && (
        <img
          src={getWowheadIconUrl(icon || "inv_misc_questionmark", "small")}
          alt=""
          className={iconCls}
          loading="lazy"
          onError={(e) => {
            (e.currentTarget as HTMLImageElement).style.display = "none";
          }}
        />
      )}
      <span>{name || `Spell #${spellId}`}</span>
    </a>
  );
}

export function ItemLink({ slot }: { slot: ResolvedGearSlot }) {
  const color = QUALITY_COLORS[slot.quality] || "#a335ee";
  return (
    <a
      href={slot.wowheadUrl}
      data-wowhead={slot.wowheadData}
      target="_blank"
      rel="noreferrer"
      className="wcl-spell-link"
      style={{ color, fontWeight: 600 }}
    >
      <img
        src={getWowheadIconUrl(slot.icon, "small")}
        alt=""
        className="wcl-icon"
        loading="lazy"
        onError={(e) => {
          (e.currentTarget as HTMLImageElement).style.display = "none";
        }}
      />
      <span>Item #{slot.id}</span>
    </a>
  );
}
