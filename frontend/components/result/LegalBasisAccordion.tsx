"use client";

import type { EvaluationResult } from "../../app/workspace-types";

export function LegalBasisAccordion({ result }: { result: EvaluationResult | null }) {
  const articles = result?.legal_basis_articles ?? [];

  return (
    <details className="rounded-lg border border-[var(--color-line)] bg-white p-5" open>
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">
        관련 법적 근거
      </summary>
      {articles.length > 0 ? (
        <ul className="mt-3 flex flex-wrap gap-2">
          {articles.map((article) => (
            <li key={article} className="rounded-md border border-[var(--color-line)] bg-[var(--color-surface-muted)] px-3 py-2 text-sm text-[var(--color-muted)]">
              {article}
            </li>
          ))}
        </ul>
      ) : (
        <p className="mt-3 text-sm text-[var(--color-muted)]">평가 실행 후 관련 조항이 표시됩니다.</p>
      )}
    </details>
  );
}
