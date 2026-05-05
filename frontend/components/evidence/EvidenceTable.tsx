"use client";

import type { EvidenceRow, EvidenceSource } from "../../hooks/useReviewSession";
import { EvidenceSourceBadge } from "./EvidenceSourceBadge";

function formatValue(value: unknown) {
  if (value === true) return "true";
  if (value === false) return "false";
  if (value === null || value === undefined || value === "") return "미확인";
  return String(value);
}

const sourceTitle: Record<EvidenceSource, string> = {
  automatic: "자동 수집",
  inferred: "반자동 추정",
  manual: "수동 확인",
  missing: "수동 확인 필요",
};

export function EvidenceTable({
  rows,
  filter,
}: {
  rows: EvidenceRow[];
  filter?: EvidenceSource;
}) {
  const visibleRows = filter ? rows.filter((row) => row.source === filter) : rows;

  return (
    <div className="overflow-hidden rounded-lg border border-[var(--color-line)]">
      <table className="w-full border-collapse bg-white text-sm">
        <thead className="bg-[var(--color-surface-muted)] text-left text-xs uppercase text-[var(--color-muted)]">
          <tr>
            <th className="px-4 py-3 font-semibold">필드</th>
            <th className="px-4 py-3 font-semibold">값</th>
            <th className="px-4 py-3 font-semibold">출처</th>
            <th className="hidden px-4 py-3 font-semibold lg:table-cell">설명</th>
          </tr>
        </thead>
        <tbody>
          {visibleRows.map((row) => (
            <tr key={`${row.field}-${row.badge}`} className="border-t border-[var(--color-line)]">
              <td className="px-4 py-3 font-mono text-xs text-[var(--color-ink)]">{row.field}</td>
              <td className="px-4 py-3 font-semibold text-[var(--color-ink)]">{formatValue(row.value)}</td>
              <td className="px-4 py-3">
                <EvidenceSourceBadge source={row.source} label={row.badge || sourceTitle[row.source]} />
              </td>
              <td className="hidden px-4 py-3 text-[var(--color-muted)] lg:table-cell">{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
