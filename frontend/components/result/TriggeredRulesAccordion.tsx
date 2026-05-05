"use client";

import type { EvaluationResult } from "../../app/workspace-types";

export function TriggeredRulesAccordion({ result }: { result: EvaluationResult | null }) {
  const rules = result?.triggered_rules ?? [];

  return (
    <details className="rounded-lg border border-[var(--color-line)] bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">
        발동된 규칙 {rules.length > 0 ? `(${rules.length})` : ""}
      </summary>
      {rules.length > 0 ? (
        <div className="mt-4 space-y-3">
          {rules.map((rule) => (
            <article key={rule.rule_id} className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-semibold text-[var(--color-ink)]">{rule.title}</p>
                <span className="rounded-md bg-white px-2 py-1 text-xs font-semibold text-[var(--color-muted)]">
                  {rule.decision}
                </span>
              </div>
              <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">{rule.rationale}</p>
              <p className="mt-2 font-mono text-xs text-[var(--color-muted)]">{rule.rule_id} · {rule.article}</p>
            </article>
          ))}
        </div>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted)]">평가 실행 후 발동 규칙을 확인할 수 있습니다.</p>
      )}
    </details>
  );
}
