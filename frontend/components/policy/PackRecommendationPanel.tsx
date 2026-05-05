"use client";

import type { PackSummary } from "../../app/workspace-types";

const packFallbackNames: Record<string, string> = {
  gdpr: "GDPR",
  korea_pipa: "Korea PIPA",
  saudi_pdpl: "Saudi PDPL",
  lgpd: "Brazil LGPD",
  taiwan_pdpa: "Taiwan PDPA",
};

export function PackRecommendationPanel({
  packSummaries,
  recommendedPacks,
  selectedPacks,
  onTogglePack,
}: {
  packSummaries: PackSummary[];
  recommendedPacks: Map<string, string>;
  selectedPacks: string[];
  onTogglePack: (packId: string) => void;
}) {
  const availableIds =
    packSummaries.length > 0
      ? packSummaries.map((pack) => pack.pack_id)
      : Object.keys(packFallbackNames);

  return (
    <div className="rounded-lg border border-[var(--color-line)] bg-white p-5">
      <p className="text-sm font-semibold text-[var(--color-ink)]">추천 검토 팩</p>
      <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
        출발/도착 리전, 정보주체 지역, 데이터 유형을 바탕으로 우선 검토할 팩을 추천합니다.
      </p>
      <div className="mt-4 grid gap-3">
        {availableIds.map((packId) => {
          const summary = packSummaries.find((pack) => pack.pack_id === packId);
          const recommended = recommendedPacks.get(packId);
          return (
            <label
              key={packId}
              className="flex gap-3 rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-muted)] p-4"
            >
              <input
                type="checkbox"
                checked={selectedPacks.includes(packId)}
                onChange={() => onTogglePack(packId)}
                className="mt-1 h-4 w-4"
              />
              <span>
                <span className="font-semibold text-[var(--color-ink)]">
                  {summary?.pack_name ?? packFallbackNames[packId] ?? packId}
                </span>
                {recommended ? (
                  <span className="ml-2 rounded-md bg-[var(--color-accent-soft)] px-2 py-1 text-xs font-semibold text-[var(--color-accent)]">
                    추천
                  </span>
                ) : null}
                <span className="mt-1 block text-sm leading-6 text-[var(--color-muted)]">
                  {recommended ?? summary?.description ?? "사용자가 직접 추가한 검토 팩입니다."}
                </span>
              </span>
            </label>
          );
        })}
      </div>
    </div>
  );
}
