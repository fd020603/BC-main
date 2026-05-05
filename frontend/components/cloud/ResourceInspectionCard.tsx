"use client";

import type { CloudConnectionState } from "../../hooks/useReviewSession";

export function ResourceInspectionCard({
  connection,
  bucketName,
  activeAction,
  onBucketNameChange,
  onInspectWithKeys,
  onInspectWithRole,
}: {
  connection: CloudConnectionState;
  bucketName: string;
  activeAction: string | null;
  onBucketNameChange: (value: string) => void;
  onInspectWithKeys: () => void;
  onInspectWithRole: () => void;
}) {
  const canUseRole = connection.mode === "iam_role" && connection.connected;

  return (
    <div className="grid gap-5 lg:grid-cols-[1fr_0.8fr]">
      <div className="rounded-lg border border-[var(--color-line)] p-5">
        <label className="block text-sm font-semibold text-[var(--color-ink)]">
          S3 Bucket Name
          <input
            value={bucketName}
            onChange={(event) => onBucketNameChange(event.target.value)}
            placeholder="customer-records-prod"
            className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
          />
        </label>
        <div className="mt-5 flex flex-wrap gap-3">
          {connection.mode === "access_key" ? (
            <button
              type="button"
              onClick={onInspectWithKeys}
              disabled={activeAction !== null}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {activeAction === "inspect-keys" ? "검사 중..." : "버킷 검사 실행"}
            </button>
          ) : (
            <button
              type="button"
              onClick={onInspectWithRole}
              disabled={activeAction !== null || !canUseRole}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {activeAction === "inspect-role" ? "검사 중..." : "버킷 검사 실행"}
            </button>
          )}
        </div>
      </div>
      <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-5">
        <p className="text-sm font-semibold text-[var(--color-ink)]">검사 항목</p>
        <ul className="mt-3 space-y-2 text-sm leading-6 text-[var(--color-muted)]">
          <li>저장 데이터 암호화와 기본 암호화 설정</li>
          <li>Public Access Block 및 접근 통제 상태</li>
          <li>HTTPS 전송 정책, 태그 기반 데이터 유형</li>
          <li>평가 입력으로 넘길 normalized cloud data</li>
        </ul>
      </div>
    </div>
  );
}
