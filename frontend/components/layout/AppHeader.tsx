"use client";

import type { CloudConnectionState } from "../../hooks/useReviewSession";

function formatDate(value: string | null) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", {
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function maskArn(value: string) {
  if (!value) return "-";
  return value.replace(/arn:aws:iam::(\d{4})\d+:/, "arn:aws:iam::$1****:");
}

export function AppHeader({
  connection,
  onChangeConnection,
}: {
  connection: CloudConnectionState;
  onChangeConnection: () => void;
}) {
  return (
    <header className="border-b border-[var(--color-line)] bg-white">
      <div className="mx-auto flex w-full max-w-7xl flex-col gap-4 px-4 py-4 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-8">
        <div>
          <p className="text-xs font-semibold uppercase text-[var(--color-muted)]">
            Border Checker
          </p>
          <h1 className="mt-1 text-2xl font-semibold tracking-tight text-[var(--color-ink)]">
            클라우드 국외이전 컴플라이언스 검토
          </h1>
        </div>
        <div className="flex flex-col gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-3 text-sm lg:min-w-[460px]">
          <div className="flex items-center justify-between gap-3">
            <span
              className={`rounded-md px-2 py-1 text-xs font-semibold ${
                connection.connected
                  ? "bg-[var(--color-success-soft)] text-[var(--color-success)]"
                  : "bg-[var(--color-warning-soft)] text-[var(--color-warning)]"
              }`}
            >
              {connection.provider.toUpperCase()} {connection.connected ? "연결됨" : "연결 필요"}
            </span>
            <button
              type="button"
              onClick={onChangeConnection}
              className="rounded-md border border-[var(--color-line)] bg-white px-3 py-1.5 text-xs font-semibold text-[var(--color-ink)] hover:border-[var(--color-line-strong)]"
            >
              연결 변경
            </button>
          </div>
          <div className="grid gap-2 text-xs text-[var(--color-muted)] sm:grid-cols-3">
            <span>Role ARN: {maskArn(connection.roleArn)}</span>
            <span>세션 상태: {connection.statusText}</span>
            <span>마지막 검사: {connection.lastResource || "-"} · {formatDate(connection.lastCheckedAt)}</span>
          </div>
        </div>
      </div>
    </header>
  );
}
