"use client";

import type { EvaluationResult } from "../../app/workspace-types";

export function RequiredActionsPanel({ result }: { result: EvaluationResult | null }) {
  const actions = result ? Array.from(new Set([...result.required_actions, ...result.next_steps])) : [];

  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-white p-5">
      <p className="text-sm font-semibold text-[var(--color-ink)]">다음 조치</p>
      {actions.length > 0 ? (
        <ol className="mt-3 space-y-2 text-sm leading-7 text-[var(--color-muted)]">
          {actions.slice(0, 8).map((action, index) => (
            <li key={action} className="flex gap-3">
              <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[var(--color-accent-soft)] text-xs font-bold text-[var(--color-accent)]">
                {index + 1}
              </span>
              <span>{action}</span>
            </li>
          ))}
        </ol>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted)]">평가 실행 후 개선 조치가 표시됩니다.</p>
      )}
    </div>
  );
}
