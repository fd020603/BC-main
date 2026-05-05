"use client";

import { formatJson } from "../../app/workspace-runtime";

export function JsonDebugPanel({ value }: { value: unknown }) {
  return (
    <details className="rounded-lg border border-[var(--color-line)] bg-white p-5">
      <summary className="cursor-pointer text-sm font-semibold text-[var(--color-ink)]">
        개발자용 JSON 보기
      </summary>
      <pre className="code-block mt-4 max-h-96 overflow-auto rounded-lg p-4 text-xs leading-5 text-[var(--color-ink)]">
        {formatJson(value ?? { message: "평가 실행 후 merged_input이 표시됩니다." })}
      </pre>
    </details>
  );
}
