"use client";

import type { EvidenceRow, EvidenceSource } from "../../hooks/useReviewSession";
import { EvidenceTable } from "./EvidenceTable";

const cards: Array<{ source: EvidenceSource; label: string; copy: string }> = [
  { source: "automatic", label: "자동 수집", copy: "클라우드 API에서 직접 가져온 기술 사실" },
  { source: "inferred", label: "반자동 추정", copy: "태그, 리전, 시나리오로 추정한 값" },
  { source: "missing", label: "수동 필요", copy: "법무/개인정보 담당자 확인 필요" },
];

export function EvidenceSummaryPanel({ rows }: { rows: EvidenceRow[] }) {
  return (
    <div className="space-y-5">
      <div className="grid gap-3 md:grid-cols-3">
        {cards.map((card) => {
          const count = rows.filter((row) => row.source === card.source).length;
          return (
            <div key={card.source} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">{card.label}</p>
              <p className="mt-2 text-2xl font-semibold text-[var(--color-ink)]">{count}</p>
              <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">{card.copy}</p>
            </div>
          );
        })}
      </div>
      <EvidenceTable rows={rows} />
    </div>
  );
}
