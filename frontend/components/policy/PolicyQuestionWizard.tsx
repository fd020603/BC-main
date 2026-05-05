"use client";

import type { ManualPolicyState, ScenarioState } from "../../hooks/useReviewSession";

const regionOptions: Array<[string, string]> = [
  ["ap-northeast-2", "한국 · Seoul"],
  ["eu-central-1", "독일 · Frankfurt"],
  ["us-east-1", "미국 · N. Virginia"],
  ["ap-northeast-1", "일본 · Tokyo"],
  ["sa-east-1", "브라질 · Sao Paulo"],
  ["tw-taipei-dc", "대만 · Taipei"],
];

const subjectOptions = ["Korea", "EU", "EEA", "Brazil", "Taiwan", "Other"];
const dataTypeOptions: Array<[string, string]> = [
  ["customer_records", "고객기록"],
  ["analytics_events", "분석 이벤트"],
  ["hr_records", "인사 기록"],
  ["sensitive_support_cases", "민감 상담 기록"],
];

function SelectRow({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string;
  options: Array<string | [string, string]>;
  onChange: (value: string) => void;
}) {
  return (
    <label className="block text-sm font-semibold text-[var(--color-ink)]">
      {label}
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        className="mt-2 w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-accent)]"
      >
        {options.map((option) => {
          const valueLabel = Array.isArray(option) ? option : [option, option];
          return (
            <option key={valueLabel[0]} value={valueLabel[0]}>
              {valueLabel[1]}
            </option>
          );
        })}
      </select>
    </label>
  );
}

function TriStateRow({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
}) {
  return (
    <div>
      <p className="text-sm font-semibold text-[var(--color-ink)]">{label}</p>
      <div className="mt-2 flex flex-wrap gap-2">
        {[
          ["true", "예"],
          ["false", "아니오"],
          ["unknown", "미확인"],
        ].map(([optionValue, optionLabel]) => (
          <button
            key={optionValue}
            type="button"
            onClick={() => onChange(optionValue)}
            className={`rounded-lg border px-3 py-2 text-sm font-semibold ${
              value === optionValue
                ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                : "border-[var(--color-line)] bg-white text-[var(--color-muted)]"
            }`}
          >
            {optionLabel}
          </button>
        ))}
      </div>
    </div>
  );
}

export function PolicyQuestionWizard({
  scenario,
  manualPolicy,
  onScenarioChange,
  onManualPolicyChange,
}: {
  scenario: ScenarioState;
  manualPolicy: ManualPolicyState;
  onScenarioChange: (key: keyof ScenarioState, value: string) => void;
  onManualPolicyChange: (key: keyof ManualPolicyState, value: string) => void;
}) {
  return (
    <div className="grid gap-5 lg:grid-cols-2">
      <div className="rounded-lg border border-[var(--color-line)] bg-white p-5">
        <p className="text-sm font-semibold text-[var(--color-ink)]">이전 시나리오</p>
        <div className="mt-4 grid gap-4">
          <SelectRow label="출발 리전" value={scenario.sourceRegion} options={regionOptions} onChange={(value) => onScenarioChange("sourceRegion", value)} />
          <SelectRow label="도착 리전" value={scenario.targetRegion} options={regionOptions} onChange={(value) => onScenarioChange("targetRegion", value)} />
          <SelectRow label="정보주체 지역" value={scenario.dataSubjectRegion} options={subjectOptions} onChange={(value) => onScenarioChange("dataSubjectRegion", value)} />
          <SelectRow label="데이터 유형" value={scenario.dataType} options={dataTypeOptions} onChange={(value) => onScenarioChange("dataType", value)} />
          <TriStateRow label="외부 처리자 사용" value={scenario.usesProcessor} onChange={(value) => onScenarioChange("usesProcessor", value)} />
        </div>
      </div>

      <div className="rounded-lg border border-[var(--color-line)] bg-white p-5">
        <p className="text-sm font-semibold text-[var(--color-ink)]">자동으로 채울 수 없는 법률 확인</p>
        <div className="mt-4 grid gap-4">
          <label className="block text-sm font-semibold text-[var(--color-ink)]">
            lawful_basis
            <select
              value={manualPolicy.lawful_basis}
              onChange={(event) => onManualPolicyChange("lawful_basis", event.target.value)}
              className="mt-2 w-full rounded-lg border border-[var(--color-line)] bg-white px-3 py-2 outline-none focus:border-[var(--color-accent)]"
            >
              <option value="">미확인</option>
              <option value="consent">동의</option>
              <option value="contract">계약 이행</option>
              <option value="legal_obligation">법적 의무</option>
              <option value="legitimate_interest">정당한 이익</option>
            </select>
          </label>
          <TriStateRow label="국외이전 고지 제공" value={manualPolicy.transfer_notice_provided} onChange={(value) => onManualPolicyChange("transfer_notice_provided", value)} />
          <TriStateRow label="DPA 또는 처리위탁 계약 존재" value={manualPolicy.dpa_exists} onChange={(value) => onManualPolicyChange("dpa_exists", value)} />
          <TriStateRow label="위험평가 또는 이전 영향평가 완료" value={manualPolicy.risk_assessment_done} onChange={(value) => onManualPolicyChange("risk_assessment_done", value)} />
          <TriStateRow label="개인정보 처리방침 반영" value={manualPolicy.privacy_notice_updated} onChange={(value) => onManualPolicyChange("privacy_notice_updated", value)} />
          <TriStateRow label="ROPA 또는 처리기록 반영" value={manualPolicy.records_of_processing_exists} onChange={(value) => onManualPolicyChange("records_of_processing_exists", value)} />
          <TriStateRow label="SCC 등 이전 보호장치 존재" value={manualPolicy.scc_in_place} onChange={(value) => onManualPolicyChange("scc_in_place", value)} />
        </div>
      </div>
    </div>
  );
}
