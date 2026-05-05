"use client";

import type { EvidenceSource } from "../../hooks/useReviewSession";

const badgeClass: Record<EvidenceSource, string> = {
  automatic: "bg-[var(--color-info-soft)] text-[var(--color-info)]",
  inferred: "bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  manual: "bg-[var(--color-success-soft)] text-[var(--color-success)]",
  missing: "bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
};

export function EvidenceSourceBadge({
  source,
  label,
}: {
  source: EvidenceSource;
  label: string;
}) {
  return (
    <span className={`inline-flex rounded-md px-2 py-1 text-xs font-semibold ${badgeClass[source]}`}>
      {label}
    </span>
  );
}
