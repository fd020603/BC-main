"use client";

import type { EvaluationResult } from "../../app/workspace-types";

export function DecisionReasonList({ result }: { result: EvaluationResult | null }) {
  const reasons =
    result?.triggered_rules.slice(0, 5).map((rule) => rule.message || rule.rationale) ?? [];

  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-white p-5">
      <p className="text-sm font-semibold text-[var(--color-ink)]">판정 이유</p>
      {reasons.length > 0 ? (
        <ul className="mt-3 space-y-2 text-sm leading-7 text-[var(--color-muted)]">
          {reasons.map((reason) => (
            <li key={reason} className="flex gap-2">
              <span className="mt-2 h-1.5 w-1.5 rounded-sm bg-[var(--color-accent)]" />
              <span>{reason}</span>
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted)]">평가 실행 후 규칙 기반 이유가 표시됩니다.</p>
      )}
    </div>
  );
}
