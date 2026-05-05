"use client";

import type { ReviewStepId } from "../../hooks/useReviewSession";

const steps: Array<{ id: ReviewStepId; label: string; description: string }> = [
  { id: "connection", label: "연결", description: "AWS/Azure 세션" },
  { id: "resource", label: "리소스 검사", description: "S3 버킷 확인" },
  { id: "evidence", label: "수집값 확인", description: "자동/추정/수동 분리" },
  { id: "policy", label: "법률 확인", description: "팩 추천과 질문" },
  { id: "result", label: "판정 결과", description: "결정과 이유" },
  { id: "actions", label: "조치 가이드", description: "설정 미리보기" },
];

export function ReviewSidebar({
  currentStep,
  onStepChange,
}: {
  currentStep: ReviewStepId;
  onStepChange: (step: ReviewStepId) => void;
}) {
  const currentIndex = steps.findIndex((step) => step.id === currentStep);

  return (
    <aside className="rounded-lg border border-[var(--color-line)] bg-white p-4 lg:sticky lg:top-6">
      <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
        Review Workflow
      </p>
      <nav className="mt-4 space-y-2">
        {steps.map((step, index) => {
          const active = step.id === currentStep;
          const done = index < currentIndex;
          return (
            <button
              key={step.id}
              type="button"
              onClick={() => onStepChange(step.id)}
              className={`flex w-full items-start gap-3 rounded-lg border px-3 py-3 text-left transition ${
                active
                  ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                  : "border-transparent hover:border-[var(--color-line)] hover:bg-[var(--color-surface-muted)]"
              }`}
            >
              <span
                className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md text-xs font-bold ${
                  done
                    ? "bg-[var(--color-success)] text-white"
                    : active
                      ? "bg-[var(--color-accent)] text-white"
                      : "bg-[var(--color-surface-muted)] text-[var(--color-muted)]"
                }`}
              >
                {done ? "✓" : index + 1}
              </span>
              <span>
                <span className="block text-sm font-semibold text-[var(--color-ink)]">
                  {step.label}
                </span>
                <span className="mt-0.5 block text-xs text-[var(--color-muted)]">
                  {step.description}
                </span>
              </span>
            </button>
          );
        })}
      </nav>
    </aside>
  );
}
