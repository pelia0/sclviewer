import { useState } from "react";

interface PaginationProps {
  totalItems: number;
  page: number;
  pageSize: number;
  pageSizeOptions?: number[];
  onPageChange: (page: number) => void;
  onPageSizeChange?: (size: number) => void;
  itemLabel?: string;
}

export function Pagination({
  totalItems,
  page,
  pageSize,
  pageSizeOptions = [25, 50, 100, 250],
  onPageChange,
  onPageSizeChange,
  itemLabel = "logs",
}: PaginationProps) {
  const [jumpInput, setJumpInput] = useState("");
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.max(1, Math.min(totalPages, page));
  const startIdx = totalItems === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const endIdx = Math.min(totalItems, safePage * pageSize);

  const pageNumbers: Array<number | "..."> = [];
  if (totalPages <= 7) {
    for (let i = 1; i <= totalPages; i++) pageNumbers.push(i);
  } else {
    pageNumbers.push(1);
    if (safePage > 3) pageNumbers.push("...");
    const start = Math.max(2, safePage - 1);
    const end = Math.min(totalPages - 1, safePage + 1);
    for (let i = start; i <= end; i++) pageNumbers.push(i);
    if (safePage < totalPages - 2) pageNumbers.push("...");
    pageNumbers.push(totalPages);
  }

  const handleJump = (e: React.FormEvent) => {
    e.preventDefault();
    const num = Number(jumpInput.trim());
    if (Number.isFinite(num) && num >= 1) {
      onPageChange(Math.min(totalPages, Math.floor(num)));
      setJumpInput("");
    }
  };

  return (
    <div className="wcl-pagination">
      <div className="wcl-pagination-left">
        <span>
          Showing <strong>{startIdx.toLocaleString()}</strong>–<strong>{endIdx.toLocaleString()}</strong> of{" "}
          <strong>{totalItems.toLocaleString()}</strong> {itemLabel}
        </span>
        {onPageSizeChange && (
          <label style={{ display: "inline-flex", alignItems: "center", gap: 6 }}>
            Per page:
            <select
              className="wcl-select"
              value={pageSize}
              onChange={(e) => onPageSizeChange(Number(e.target.value))}
              style={{ padding: "2px 6px" }}
            >
              {pageSizeOptions.map((opt) => (
                <option key={opt} value={opt}>
                  {opt}
                </option>
              ))}
            </select>
          </label>
        )}
      </div>

      <div className="wcl-pagination-pages">
        <button
          className="wcl-page-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(1)}
          title="First page"
        >
          «
        </button>
        <button
          className="wcl-page-btn"
          disabled={safePage <= 1}
          onClick={() => onPageChange(safePage - 1)}
        >
          Prev
        </button>

        {pageNumbers.map((item, idx) =>
          item === "..." ? (
            <span key={`e-${idx}`} style={{ color: "var(--wcl-dim)", padding: "0 4px" }}>
              …
            </span>
          ) : (
            <button
              key={item}
              className={`wcl-page-btn ${item === safePage ? "active" : ""}`}
              onClick={() => onPageChange(item)}
            >
              {item}
            </button>
          )
        )}

        <button
          className="wcl-page-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(safePage + 1)}
        >
          Next
        </button>
        <button
          className="wcl-page-btn"
          disabled={safePage >= totalPages}
          onClick={() => onPageChange(totalPages)}
          title="Last page"
        >
          »
        </button>

        <form onSubmit={handleJump} style={{ display: "inline-flex", alignItems: "center", gap: 4, marginLeft: 8 }}>
          <input
            type="number"
            min={1}
            max={totalPages}
            placeholder="Page"
            value={jumpInput}
            onChange={(e) => setJumpInput(e.target.value)}
            className="wcl-input"
            style={{ width: 58, padding: "3px 6px", fontSize: 12 }}
          />
          <button type="submit" className="wcl-page-btn">
            Go
          </button>
        </form>
      </div>
    </div>
  );
}
