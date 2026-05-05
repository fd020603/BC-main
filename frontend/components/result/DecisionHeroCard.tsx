"use client";

import type { DecisionGrade, EvaluationResult } from "../../app/workspace-types";

const decisionMeta: Record<DecisionGrade, { title: string; subtitle: string; className: string }> = {
  allow: {
    title: "Allow",
    subtitle: "허용 가능",
    className: "border-[var(--color-success)] bg-[var(--color-success-soft)] text-[var(--color-success)]",
  },
  condition_allow: {
    title: "Condition Allow",
    subtitle: "조건부 허용",
    className: "border-[var(--color-info)] bg-[var(--color-info-soft)] text-[var(--color-info)]",
  },
  manual_review: {
    title: "Manual Review",
    subtitle: "수동 검토 필요",
    className: "border-[var(--color-warning)] bg-[var(--color-warning-soft)] text-[var(--color-warning)]",
  },
  deny: {
    title: "Deny",
    subtitle: "이전 불가",
    className: "border-[var(--color-danger)] bg-[var(--color-danger-soft)] text-[var(--color-danger)]",
  },
};

export function DecisionHeroCard({ result }: { result: EvaluationResult | null }) {
  if (!result) {
    return (
      <div className="rounded-lg border border-dashed border-[var(--color-line-strong)] bg-white p-6">
        <p className="text-lg font-semibold text-[var(--color-ink)]">아직 판정 결과가 없습니다.</p>
        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
          법률 확인 질문을 채운 뒤 평가를 실행하면 최종 판정과 이유가 표시됩니다.
        </p>
      </div>
    );
  }

  const meta = decisionMeta[result.final_decision];
  return (
    <div className={`rounded-lg border p-6 ${meta.className}`}>
      <p className="text-sm font-semibold uppercase">최종 판정</p>
      <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h3 className="text-3xl font-bold tracking-tight">{meta.title}</h3>
          <p className="mt-1 text-xl font-semibold">{meta.subtitle}</p>
        </div>
        <p className="text-sm font-semibold">위험 수준: {result.final_decision === "deny" ? "High" : result.final_decision === "manual_review" ? "Medium" : "Low"}</p>
      </div>
      <p className="mt-5 max-w-3xl text-sm leading-7 text-[var(--color-ink)]">{result.summary || result.explanation}</p>
    </div>
  );
}
