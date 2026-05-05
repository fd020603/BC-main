"use client";

import { useState } from "react";

const changes = [
  {
    id: "encryption",
    title: "기본 암호화 AES256 활성화",
    before: "미설정 또는 확인 불가",
    after: "AES256 기본 암호화",
  },
  {
    id: "public-access",
    title: "Public Access Block 활성화",
    before: "일부 옵션 비활성화 가능",
    after: "4개 옵션 모두 활성화",
  },
  {
    id: "https-only",
    title: "HTTPS-only Bucket Policy 추가",
    before: "정책 없음 또는 확인 불가",
    after: "aws:SecureTransport=false 차단",
  },
];

export function RemediationPreview({
  activeAction,
  onApply,
}: {
  activeAction: string | null;
  onApply: () => void;
}) {
  const [selected, setSelected] = useState(() => new Set(changes.map((change) => change.id)));

  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-white p-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-[var(--color-ink)]">권장 설정 적용 미리보기</p>
          <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
            자동 적용이 아니라 적용 예정 변경사항을 먼저 확인합니다. 선택한 항목만 적용 요청을 보냅니다.
          </p>
        </div>
        <button
          type="button"
          onClick={onApply}
          disabled={activeAction !== null || selected.size === 0}
          className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
        >
          {activeAction === "apply-preview" ? "적용 중..." : "선택한 설정 적용"}
        </button>
      </div>
      <div className="mt-5 space-y-3">
        {changes.map((change) => (
          <label
            key={change.id}
            className="flex gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-4"
          >
            <input
              type="checkbox"
              checked={selected.has(change.id)}
              onChange={(event) => {
                setSelected((current) => {
                  const next = new Set(current);
                  if (event.target.checked) {
                    next.add(change.id);
                  } else {
                    next.delete(change.id);
                  }
                  return next;
                });
              }}
              className="mt-1 h-4 w-4"
            />
            <span>
              <span className="block font-semibold text-[var(--color-ink)]">{change.title}</span>
              <span className="mt-1 block text-sm text-[var(--color-muted)]">현재: {change.before}</span>
              <span className="mt-1 block text-sm text-[var(--color-muted)]">변경 후: {change.after}</span>
            </span>
          </label>
        ))}
      </div>
    </div>
  );
}
