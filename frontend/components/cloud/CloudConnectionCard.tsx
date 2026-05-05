"use client";

import type {
  AwsCredentialState,
  CloudConnectionState,
  Provider,
} from "../../hooks/useReviewSession";
import type { AwsConnectionStartResponse } from "../../app/workspace-types";

export function CloudConnectionCard({
  connection,
  credentials,
  roleStart,
  activeAction,
  onProviderChange,
  onConnectionModeChange,
  onCredentialsChange,
  onStartRole,
  onCompleteRole,
}: {
  connection: CloudConnectionState;
  credentials: AwsCredentialState;
  roleStart: AwsConnectionStartResponse | null;
  activeAction: string | null;
  onProviderChange: (provider: Provider) => void;
  onConnectionModeChange: (mode: "access_key" | "iam_role") => void;
  onCredentialsChange: (next: Partial<AwsCredentialState>) => void;
  onStartRole: () => void;
  onCompleteRole: () => void;
}) {
  return (
    <div className="space-y-5">
      <div className="flex flex-wrap gap-2">
        {(["aws", "azure"] as const).map((provider) => (
          <button
            key={provider}
            type="button"
            onClick={() => onProviderChange(provider)}
            disabled={provider === "azure"}
            className={`rounded-lg border px-4 py-2 text-sm font-semibold ${
              connection.provider === provider
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
            } disabled:cursor-not-allowed disabled:opacity-50`}
          >
            {provider.toUpperCase()}
          </button>
        ))}
      </div>

      {connection.connected ? (
        <div className="rounded-lg border border-[var(--color-success)] bg-[var(--color-success-soft)] p-4">
          <p className="font-semibold text-[var(--color-success)]">현재 AWS 세션이 연결되어 있습니다.</p>
          <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
            다른 계정으로 변경할 때만 상단의 연결 변경을 사용하면 됩니다. 각 단계에서는 이 연결 상태만 참조합니다.
          </p>
        </div>
      ) : null}

      <div className="rounded-lg border border-[var(--color-line)] p-4">
        <p className="text-sm font-semibold text-[var(--color-ink)]">연결 방식</p>
        <div className="mt-3 grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => onConnectionModeChange("access_key")}
            className={`rounded-lg border px-4 py-3 text-left text-sm ${
              connection.mode === "access_key"
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                : "border-[var(--color-line)] bg-white"
            }`}
          >
            <span className="block font-semibold text-[var(--color-ink)]">Access Key</span>
            <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">데모와 빠른 검사에 적합합니다. 저장하지 않습니다.</span>
          </button>
          <button
            type="button"
            onClick={() => onConnectionModeChange("iam_role")}
            className={`rounded-lg border px-4 py-3 text-left text-sm ${
              connection.mode === "iam_role"
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                : "border-[var(--color-line)] bg-white"
            }`}
          >
            <span className="block font-semibold text-[var(--color-ink)]">IAM Role</span>
            <span className="mt-1 block text-xs leading-5 text-[var(--color-muted)]">운영 환경에 권장되는 세션 기반 연결입니다.</span>
          </button>
        </div>
      </div>

      {connection.mode === "access_key" ? (
        <div className="grid gap-4 sm:grid-cols-2">
          <label className="text-sm font-semibold text-[var(--color-ink)]">
            Access Key ID
            <input
              value={credentials.accessKeyId}
              onChange={(event) => onCredentialsChange({ accessKeyId: event.target.value })}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <label className="text-sm font-semibold text-[var(--color-ink)]">
            Secret Access Key
            <input
              type="password"
              value={credentials.secretAccessKey}
              onChange={(event) => onCredentialsChange({ secretAccessKey: event.target.value })}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <label className="text-sm font-semibold text-[var(--color-ink)] sm:col-span-2">
            Session Token optional
            <textarea
              value={credentials.sessionToken}
              onChange={(event) => onCredentialsChange({ sessionToken: event.target.value })}
              rows={3}
              autoComplete="off"
              className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
            />
          </label>
        </div>
      ) : null}

      {connection.mode === "iam_role" ? (
        <div className="space-y-4">
          <label className="block text-sm font-semibold text-[var(--color-ink)]">
            연결 이름
            <input
              value={credentials.connectionName}
              onChange={(event) => onCredentialsChange({ connectionName: event.target.value })}
              className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
            />
          </label>
          <div className="flex flex-wrap gap-3">
            <button
              type="button"
              onClick={onStartRole}
              disabled={activeAction !== null}
              className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
            >
              {activeAction === "start-role" ? "시작 중..." : "AWS 연결 시작"}
            </button>
            {roleStart ? (
              <a
                href={roleStart.cloudformation_url}
                target="_blank"
                rel="noreferrer"
                className="rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                AWS Console에서 스택 생성
              </a>
            ) : null}
          </div>
          {roleStart ? (
            <div className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-4">
              <p className="text-sm font-semibold text-[var(--color-ink)]">External ID</p>
              <p className="mt-2 break-all rounded-md bg-white px-3 py-2 font-mono text-xs text-[var(--color-muted)]">
                {roleStart.external_id}
              </p>
              <label className="mt-4 block text-sm font-semibold text-[var(--color-ink)]">
                Role ARN
                <input
                  value={credentials.roleArn}
                  onChange={(event) => onCredentialsChange({ roleArn: event.target.value })}
                  placeholder="arn:aws:iam::123456789012:role/BorderCheckerRole"
                  className="mt-2 w-full rounded-lg border border-[var(--color-line)] px-3 py-2 outline-none focus:border-[var(--color-accent)]"
                />
              </label>
              <button
                type="button"
                onClick={onCompleteRole}
                disabled={activeAction !== null}
                className="mt-4 rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
              >
                {activeAction === "complete-role" ? "확인 중..." : "연결 확인"}
              </button>
            </div>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
