"use client";

import { useEffect, useState, useTransition } from "react";

import { PACK_UI_DEFINITIONS } from "./guided-pack-config";
import { AwsIntegrationPanel } from "./aws-integration-panel";
import { AwsIntegrationProvider } from "./context/aws-integration-context";
import { applyCloudDataToFormState } from "./cloud-discovery-panel";
import type {
  GuidedField,
  GuidedFormState,
  PackUiDefinition,
} from "./guided-pack-types";
import { ExplainabilityPanel, ResultPanel } from "./workspace-output-panels";
import { buildErrorMessage, fetchJson } from "./workspace-runtime";
import type {
  EvaluationResult,
  JsonObject,
  PackDetail,
  PackSummary,
} from "./workspace-types";
import {
  ActionButton,
  EmptyState,
  ErrorBanner,
  MetricCard,
  SegmentedField,
  SelectField,
  StatusBanner,
  SummaryRow,
  TextList,
} from "./workspace-ui";

const SELECTED_PACK_STORAGE_KEY = "border-checker-selected-pack";
const CLOUD_DISCOVERY_FIELD_KEYS = [
  "current_region",
  "encryption_at_rest",
  "encryption_in_transit",
  "access_control_in_place",
  "data_type",
  "contains_sensitive_data",
  "uses_processor",
] as const;

const CLOUD_TO_PACK_FIELD_MAP: Record<string, Record<string, string>> = {
  taiwan: {
    contains_sensitive_data: "contains_article6_sensitive_data",
    uses_processor: "uses_commissioned_processor",
  },
};

type ScreenMode = "intro" | "step" | "review" | "result";

function renderField(
  field: GuidedField,
  state: GuidedFormState,
  onChange: (key: string, value: string) => void,
) {
  if (field.kind === "select") {
    return (
      <SelectField
        label={field.label}
        helper={field.helper}
        tooltip={field.tooltip}
        value={state[field.key] ?? ""}
        onChange={(value) => onChange(field.key, value)}
        options={field.options}
      />
    );
  }

  return (
    <SegmentedField
      label={field.label}
      helper={field.helper}
      tooltip={field.tooltip}
      value={state[field.key] ?? ""}
      onChange={(value) => onChange(field.key, value)}
      options={field.options}
    />
  );
}

function optionLabelForField(field: GuidedField, rawValue: string) {
  if (rawValue === "") {
    return "";
  }

  const matched = field.options.find((option) => option.value === rawValue);
  if (matched) {
    return matched.label;
  }

  if (rawValue === "true") {
    return "예";
  }
  if (rawValue === "false") {
    return "아니오";
  }
  if (rawValue === "unknown") {
    return "잘 모르겠음";
  }

  return rawValue;
}

function collectVisibleStepFields(
  definition: PackUiDefinition,
  state: GuidedFormState,
  stepIndex: number,
) {
  const step = definition.steps[stepIndex];
  return step.fields.filter(
    (field) => !field.visibleIf || field.visibleIf(state),
  );
}

function isKnownCloudValue(value: unknown) {
  return value !== null && value !== undefined && value !== "";
}

function mapCloudDataForPack(packId: string, normalized: JsonObject) {
  const mapped: JsonObject = { ...normalized };
  const fieldMap = CLOUD_TO_PACK_FIELD_MAP[packId] ?? {};

  for (const [cloudField, packField] of Object.entries(fieldMap)) {
    if (isKnownCloudValue(normalized[cloudField])) {
      mapped[packField] = normalized[cloudField];
    }
  }

  return mapped;
}

function getCloudAppliedFieldKeysForPack(packId: string, normalized: JsonObject) {
  const fields = new Set<string>();
  const mapped = mapCloudDataForPack(packId, normalized);

  for (const field of CLOUD_DISCOVERY_FIELD_KEYS) {
    if (isKnownCloudValue(normalized[field])) {
      fields.add(CLOUD_TO_PACK_FIELD_MAP[packId]?.[field] ?? field);
    }
  }

  for (const field of Object.values(CLOUD_TO_PACK_FIELD_MAP[packId] ?? {})) {
    if (isKnownCloudValue(mapped[field])) {
      fields.add(field);
    }
  }

  return Array.from(fields);
}

function fieldLabelForKey(definition: PackUiDefinition, key: string) {
  for (const step of definition.steps) {
    const field = step.fields.find((item) => item.key === key);
    if (field) {
      return field.label;
    }
  }
  return key;
}

function hideCloudAppliedFields(
  fields: GuidedField[],
  cloudAppliedFields: string[],
) {
  const hidden = new Set(cloudAppliedFields);
  return fields.filter((field) => !hidden.has(field.key));
}

function collectStepMissingFields(
  definition: PackUiDefinition,
  state: GuidedFormState,
  stepIndex: number,
  cloudAppliedFields: string[] = [],
) {
  return hideCloudAppliedFields(
    collectVisibleStepFields(definition, state, stepIndex),
    cloudAppliedFields,
  )
    .filter((field) => field.required)
    .filter((field) => !state[field.key])
    .map((field) => field.label);
}

function buildReviewSections(
  definition: PackUiDefinition,
  state: GuidedFormState,
) {
  return definition.steps
    .map((step, stepIndex) => {
      const rows = collectVisibleStepFields(definition, state, stepIndex)
        .map((field) => ({
          label: field.label,
          value: optionLabelForField(field, state[field.key] ?? ""),
        }))
        .filter((row) => row.value);

      return {
        id: step.id,
        title: step.title,
        description: step.description,
        rows,
      };
    })
    .filter((section) => section.rows.length > 0);
}

export function GuidedSingleFlowPage() {
  const [packSummaries, setPackSummaries] = useState<PackSummary[]>([]);
  const [selectedPackId, setSelectedPackId] = useState("gdpr");
  const [packDetail, setPackDetail] = useState<PackDetail | null>(null);
  const [formState, setFormState] = useState<GuidedFormState>({});
  const [screenMode, setScreenMode] = useState<ScreenMode>("intro");
  const [stepIndex, setStepIndex] = useState(0);
  const [evaluationResult, setEvaluationResult] =
    useState<EvaluationResult | null>(null);
  const [statusMessage, setStatusMessage] = useState(
    "법제를 고르고 단계별 질문에 답하면 마지막 검토 화면에서 평가를 실행합니다.",
  );
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isBusy, setIsBusy] = useState(false);
  const [storageReady, setStorageReady] = useState(false);
  const [cloudAppliedFields, setCloudAppliedFields] = useState<string[]>([]);
  const [, startTransition] = useTransition();

  const packDefinition =
    PACK_UI_DEFINITIONS[selectedPackId] ?? PACK_UI_DEFINITIONS.gdpr;
  const currentStep = packDefinition.steps[stepIndex];
  const visibleFields = hideCloudAppliedFields(
    collectVisibleStepFields(
      packDefinition,
      formState,
      stepIndex,
    ),
    cloudAppliedFields,
  );
  const currentStepMissing = collectStepMissingFields(
    packDefinition,
    formState,
    stepIndex,
    cloudAppliedFields,
  );
  const overallMissing = packDefinition.validate(formState);
  const advisoryNotes = packDefinition.buildAdvisoryNotes(formState);
  const reviewSections = buildReviewSections(packDefinition, formState);
  const progressPercent =
    screenMode === "intro"
      ? 8
      : screenMode === "review"
        ? 92
        : ((stepIndex + 1) / packDefinition.steps.length) * 100;

  useEffect(() => {
    let cancelled = false;

    async function bootstrap() {
      try {
        const summaries = await fetchJson<PackSummary[]>("/api/v1/packs");
        const supportedSummaries = summaries.filter(
          (pack) => pack.pack_id in PACK_UI_DEFINITIONS,
        );
        const storedPackId =
          window.localStorage.getItem(SELECTED_PACK_STORAGE_KEY) ?? "gdpr";
        const nextPackId =
          storedPackId in PACK_UI_DEFINITIONS ? storedPackId : "gdpr";

        if (!cancelled) {
          startTransition(() => {
            setPackSummaries(supportedSummaries);
            setSelectedPackId(nextPackId);
          });
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(buildErrorMessage(error));
        }
      }
    }

    void bootstrap();
    return () => {
      cancelled = true;
    };
  }, [startTransition]);

  useEffect(() => {
    let cancelled = false;
    const definition = PACK_UI_DEFINITIONS[selectedPackId];
    if (!definition) {
      return;
    }

    window.localStorage.setItem(SELECTED_PACK_STORAGE_KEY, selectedPackId);

    const storedState = window.localStorage.getItem(definition.storageKey);
    let nextState = { ...definition.defaultState };
    if (storedState) {
      try {
        nextState = {
          ...definition.defaultState,
          ...(JSON.parse(storedState) as GuidedFormState),
        };
      } catch {}
    }

    startTransition(() => {
      setFormState(nextState);
      setCloudAppliedFields([]);
      setStepIndex(0);
      setScreenMode("intro");
      setEvaluationResult(null);
      setStorageReady(true);
      setStatusMessage(
        `${definition.label} 질문 흐름을 불러왔습니다. 시작하기를 누르면 한 단계씩 진행됩니다.`,
      );
    });

    async function loadDetail() {
      try {
        const detail = await fetchJson<PackDetail>(
          `/api/v1/packs/${selectedPackId}/detail`,
        );
        if (!cancelled) {
          setPackDetail(detail);
        }
      } catch (error) {
        if (!cancelled) {
          setErrorMessage(buildErrorMessage(error));
        }
      }
    }

    void loadDetail();
    return () => {
      cancelled = true;
    };
  }, [selectedPackId, startTransition]);

  useEffect(() => {
    if (!storageReady) {
      return;
    }

    window.localStorage.setItem(
      packDefinition.storageKey,
      JSON.stringify(formState),
    );
  }, [formState, packDefinition.storageKey, storageReady]);

  function updateField(key: string, value: string) {
    setErrorMessage(null);
    setFormState((current) => {
      const next = { ...current, [key]: value };

      if (key === "derogation_used" && value !== "true") {
        next.derogation_type = "";
      }
      if (key === "transfer_exception_used" && value !== "true") {
        next.transfer_exception_type = "";
      }
      if (key === "contains_article6_sensitive_data" && value !== "true") {
        next.sensitive_data_exception_basis = "";
        next.written_consent_for_sensitive_data = "unknown";
        next.consent_freely_given = "unknown";
        next.consent_proof_available = "unknown";
      }
      if (key === "sensitive_data_exception_basis" && value !== "written_consent") {
        next.written_consent_for_sensitive_data = "unknown";
        next.consent_freely_given = "unknown";
      }
      if (key === "use_outside_original_specific_purpose" && value !== "true") {
        next.outside_purpose_use_basis = "";
        next.separate_consent_for_outside_purpose = "unknown";
      }
      if (key === "outside_purpose_use_basis" && value !== "consent") {
        next.separate_consent_for_outside_purpose = "unknown";
      }
      if (key === "uses_data_for_marketing" && value !== "true") {
        next.marketing_optout_mechanism_ready = "unknown";
      }
      if (key === "data_subject_objected_public_source_processing" && value !== "true") {
        next.public_source_objection_handled = "unknown";
      }
      if (key === "industry_security_plan_required" && value !== "true") {
        next.industry_security_plan_in_place = "unknown";
      }
      if (key === "uses_commissioned_processor" && value !== "true") {
        next.commissioned_processor_terms_in_place = "unknown";
      }
      if (key === "standard_contractual_clauses_in_place" && value !== "true") {
        next.standard_contractual_clauses_full_unaltered = "unknown";
      }
      if (key === "legacy_contractual_clauses_used" && value !== "true") {
        next.anpd_scc_migration_completed = "unknown";
      }
      if (key === "specific_contractual_clauses_used" && value !== "true") {
        next.specific_contractual_clauses_anpd_approved = "unknown";
      }
      if (key === "binding_corporate_rules_used" && value !== "true") {
        next.binding_corporate_rules_anpd_approved = "unknown";
      }
      if (key === "subsequent_transfer_expected" && value !== "true") {
        next.subsequent_transfer_controls_in_place = "unknown";
      }
      if (key === "dpia_required" && value !== "true") {
        next.dpia_completed = "";
      }
      if (key === "dpo_required" && value !== "true") {
        next.dpo_assigned = "";
      }
      if (key === "processing_legal_basis" && value !== "consent") {
        next.consent_withdrawal_process_ready = "unknown";
      }
      if (key === "contains_sensitive_data" && value !== "true") {
        next.special_category_condition_met = "unknown";
        next.explicit_consent_for_sensitive_data = "unknown";
        next.sensitive_data_legal_basis = "";
        next.specific_highlighted_consent_for_sensitive_data = "unknown";
        next.sensitive_data_basis = "";
      }
      if (key === "sensitive_data_legal_basis" && value !== "consent") {
        next.specific_highlighted_consent_for_sensitive_data = "unknown";
      }
      if (key === "third_party_sharing" && value !== "true") {
        next.third_party_provision_consent_or_basis = "unknown";
      }
      if (key === "has_unique_identifier" && value !== "true") {
        next.unique_identifier_basis = "";
      }
      if (key === "uses_resident_registration_number" && value !== "true") {
        next.resident_registration_statutory_basis = "unknown";
      }
      if (key === "uses_processor" && value !== "true") {
        next.controller_processor_roles_defined = "unknown";
        next.dpa_in_place = "unknown";
        next.processor_sufficient_guarantees = "unknown";
        next.processor_agreement_in_place = "unknown";
        next.processor_compliance_verified = "unknown";
        next.processor_public_disclosure = "unknown";
        next.processor_supervision_done = "unknown";
        next.subprocessor_controls_in_place = "unknown";
        next.subprocessor_or_onward_transfer_controls = "unknown";
      }
      if (key === "is_automated_decision_only" && value !== "true") {
        next.automated_decision_significant_effect = "unknown";
        next.automated_decision_rights_ready = "unknown";
        next.provides_explanation = "unknown";
        next.human_review_available = "unknown";
      }
      if (key === "automated_decision_significant_effect" && value !== "true") {
        next.automated_decision_rights_ready = "unknown";
        next.provides_explanation = "unknown";
        next.human_review_available = "unknown";
      }

      return next;
    });
  }

  function resetCurrentPack() {
    window.localStorage.removeItem(packDefinition.storageKey);
    startTransition(() => {
      setFormState({ ...packDefinition.defaultState });
      setCloudAppliedFields([]);
      setStepIndex(0);
      setScreenMode("intro");
      setEvaluationResult(null);
      setErrorMessage(null);
      setStatusMessage("입력을 초기화했습니다. 다시 시작해 주세요.");
    });
  }

  function clearAwsAppliedFormValues() {
    setCloudAppliedFields([]);
    setFormState((current) => {
      const next = { ...current };
      for (const key of CLOUD_DISCOVERY_FIELD_KEYS) {
        next[key] = packDefinition.defaultState[key] ?? "";
      }
      for (const key of Object.values(CLOUD_TO_PACK_FIELD_MAP[selectedPackId] ?? {})) {
        next[key] = packDefinition.defaultState[key] ?? "";
      }
      return next;
    });
  }

  async function runEvaluation() {
    setIsBusy(true);
    setErrorMessage(null);

    try {
      const response = await fetchJson<EvaluationResult>("/api/v1/evaluate", {
        method: "POST",
        body: JSON.stringify({
          pack_id: selectedPackId,
          ...packDefinition.buildPayload(formState),
        }),
      });

      startTransition(() => {
        setEvaluationResult(response);
        setScreenMode("result");
        setStatusMessage("평가가 완료되었습니다. 최종 결과 화면을 확인해 주세요.");
      });
    } catch (error) {
      setErrorMessage(buildErrorMessage(error));
    } finally {
      setIsBusy(false);
    }
  }

  const availablePackCards = Object.values(PACK_UI_DEFINITIONS).map((definition) => {
    const matchedSummary = packSummaries.find(
      (pack) => pack.pack_id === definition.id,
    );

    return (
      matchedSummary ?? {
        pack_id: definition.id,
        pack_name: definition.label,
        jurisdiction: definition.label,
        version: "1.0.0",
        description: definition.subtitle,
        rule_count: definition.steps.length,
        supported_decisions: [],
        covered_categories: [],
        disclaimer: "",
      }
    );
  });

  if (screenMode === "result" && evaluationResult) {
    return (
      <main className="app-shell min-h-screen overflow-hidden">
        <div className="mx-auto flex w-full max-w-6xl flex-col gap-5 px-4 py-6 sm:px-6 lg:px-8">
          <section className="glass-panel rounded-lg border border-[var(--color-line)] px-5 py-6 sm:px-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                  Evaluation Complete
                </p>
                <h1 className="mt-3 text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                  {packDefinition.label} 평가 결과
                </h1>
                <p className="mt-2 max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                  입력을 모두 확인한 뒤 최종 결과를 생성했습니다. 필요하면 다시
                  입력 화면으로 돌아가 수정할 수 있습니다.
                </p>
              </div>
              <div className="flex flex-wrap gap-3">
                <ActionButton
                  label="입력 다시 보기"
                  onClick={() => setScreenMode("review")}
                  variant="secondary"
                />
                <ActionButton
                  label="법제 바꾸기"
                  onClick={() => setScreenMode("intro")}
                  variant="secondary"
                />
                <ActionButton label="새로 시작" onClick={resetCurrentPack} />
              </div>
            </div>
          </section>

          <section className="grid gap-5">
            <ResultPanel evaluationResult={evaluationResult} />
            <ExplainabilityPanel
              evaluationResult={evaluationResult}
              mergePreview={evaluationResult.merged_input}
            />
          </section>

          <footer className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-strong)] px-5 py-4 text-sm leading-7 text-[var(--color-muted)]">
            <p className="font-semibold text-[var(--color-ink)]">Disclaimer</p>
            <p>
              Border Checker는 정책 기반 의사결정 지원 도구입니다. 실제 운영
              반영 전에는 법무, 프라이버시, 보안 담당자가 사실관계와 문서를 함께
              검토해야 합니다.
            </p>
          </footer>
        </div>
      </main>
    );
  }

  return (
    <AwsIntegrationProvider>
    <main className="app-shell min-h-screen overflow-hidden">
      <div className="mx-auto flex min-h-screen w-full max-w-4xl flex-col gap-5 px-4 py-6 sm:px-6">
        <header className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="rounded-md border border-[var(--color-accent)] bg-[var(--color-accent-soft)] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-accent)]">
              Border Checker
            </span>
            <span className="text-sm text-[var(--color-muted)]">
              Guided Intake Flow
            </span>
          </div>
          {screenMode !== "intro" ? (
            <button
              type="button"
              onClick={() => setScreenMode("intro")}
              className="text-sm font-medium text-[var(--color-accent)] underline-offset-4 hover:underline"
            >
              법제 다시 선택
            </button>
          ) : null}
        </header>

        <div className="flex flex-1 items-center justify-center">
          <section className="glass-panel w-full overflow-hidden rounded-lg border border-[var(--color-line)] px-5 py-6 sm:px-6 sm:py-7">
            <div
              key={`${selectedPackId}-${screenMode}-${stepIndex}`}
              className="screen-enter"
            >
            {screenMode === "intro" ? (
              <div className="space-y-7">
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Step 0
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)] sm:text-4xl">
                    어떤 법제로 검토할지 먼저 선택해 주세요
                  </h1>
                  <p className="max-w-2xl text-sm leading-7 text-[var(--color-muted)]">
                    데모 사이트입니다.
                  </p>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  {availablePackCards.map((pack) => {
                    const isActive = pack.pack_id === selectedPackId;
                    return (
                      <button
                        key={pack.pack_id}
                        type="button"
                        onClick={() => setSelectedPackId(pack.pack_id)}
                        className={`interactive-card rounded-lg border p-5 text-left transition ${
                          isActive
                            ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)]"
                            : "border-[var(--color-line)] bg-[var(--color-surface-strong)]"
                        }`}
                      >
                        <p className="text-sm font-semibold text-[var(--color-ink)]">
                          {pack.pack_name}
                        </p>
                        <p className="mt-2 text-sm leading-6 text-[var(--color-muted)]">
                          {PACK_UI_DEFINITIONS[pack.pack_id]?.subtitle ?? pack.description}
                        </p>
                        <div className="mt-4 flex flex-wrap gap-2 text-xs text-[var(--color-muted)]">
                          <span className="rounded-md border border-[var(--color-line)] px-2.5 py-1">
                            {pack.jurisdiction}
                          </span>
                          <span className="rounded-md border border-[var(--color-line)] px-2.5 py-1">
                            v{pack.version}
                          </span>
                        </div>
                      </button>
                    );
                  })}
                </div>

                <div className="grid gap-3 sm:grid-cols-3">
                  <MetricCard label="선택된 팩" value={packDefinition.label} />
                  <MetricCard
                    label="입력 방식"
                    value="한 화면씩 단계 진행"
                  />
                  <MetricCard
                    label="규칙 수"
                    value={packDetail ? `${packDetail.rule_count} rules` : "로딩 중"}
                  />
                </div>

                {packDetail ? (
                  <TextList
                    title="검토 가이드"
                    items={packDetail.review_guidance}
                  />
                ) : (
                  <EmptyState
                    title="팩 정보를 불러오는 중입니다."
                    description="선택한 팩의 질문 구조와 메타데이터를 준비하고 있습니다."
                  />
                )}

                <div className="flex flex-wrap gap-3">
                  <ActionButton
                    label="시작하기"
                    onClick={() => {
                      setStepIndex(0);
                      setScreenMode("step");
                      setStatusMessage(
                        `${packDefinition.label} 질문을 시작합니다. 각 단계마다 필요한 항목만 보여드립니다.`,
                      );
                    }}
                  />
                  <ActionButton
                    label="입력 초기화"
                    onClick={resetCurrentPack}
                    variant="secondary"
                  />
                </div>
              </div>
            ) : null}

            {screenMode === "step" ? (
              <div className="space-y-7">
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Step {stepIndex + 1}
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                    {currentStep.title}
                  </h1>
                  <p className="text-sm leading-7 text-[var(--color-muted)]">
                    {currentStep.description}
                  </p>
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                      <span>진행률</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="progress-track mt-2">
                      <div
                        className="progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  {packDefinition.steps.map((step, index) => (
                    <span
                      key={step.id}
                      className={`rounded-md border px-3 py-1.5 text-sm ${
                        index === stepIndex
                          ? "border-[var(--color-accent)] bg-[var(--color-accent-soft)] text-[var(--color-accent)]"
                          : "border-[var(--color-line)] bg-[var(--color-surface-strong)] text-[var(--color-muted)]"
                      }`}
                    >
                      {index + 1}. {step.title}
                    </span>
                  ))}
                </div>

                <AwsIntegrationPanel
                  onClearAppliedValues={clearAwsAppliedFormValues}
                  onApply={(normalized) => {
                    const mapped = mapCloudDataForPack(selectedPackId, normalized);
                    setFormState((current) =>
                      applyCloudDataToFormState(current, mapped),
                    );
                    setCloudAppliedFields(
                      getCloudAppliedFieldKeysForPack(selectedPackId, normalized),
                    );
                    setStatusMessage(
                      "클라우드에서 확인 가능한 기술 입력값을 현재 폼에 반영했습니다. 법적 판단 항목은 변경하지 않았습니다.",
                    );
                  }}
                />

                {cloudAppliedFields.length > 0 ? (
                  <TextList
                    title="AWS에서 자동 입력되어 숨긴 질문"
                    items={cloudAppliedFields.map((key) =>
                      fieldLabelForKey(packDefinition, key),
                    )}
                    compact
                  />
                ) : null}

                <div className="grid gap-5">
                  {visibleFields.length > 0 ? (
                    visibleFields.map((field) => (
                      <div key={field.key}>{renderField(field, formState, updateField)}</div>
                    ))
                  ) : (
                    <EmptyState
                      title="이 단계의 기술 질문은 AWS에서 채워졌습니다."
                      description="확인되지 않은 법률·정책 질문이 남아 있으면 다음 단계에서 계속 표시됩니다."
                    />
                  )}
                </div>

                <TextList title="입력 안내" items={advisoryNotes} />
                <StatusBanner message={statusMessage} />
                {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

                <div className="flex flex-wrap gap-3">
                  <ActionButton
                    label="이전"
                    onClick={() =>
                      stepIndex === 0
                        ? setScreenMode("intro")
                        : setStepIndex((value) => value - 1)
                    }
                    variant="secondary"
                  />
                  <ActionButton
                    label={
                      stepIndex === packDefinition.steps.length - 1
                        ? "검토 화면으로"
                        : "다음"
                    }
                    onClick={() => {
                      if (currentStepMissing.length > 0) {
                        setErrorMessage(
                          `${currentStepMissing.join(", ")} 항목을 먼저 선택해 주세요.`,
                        );
                        return;
                      }

                      setErrorMessage(null);
                      if (stepIndex === packDefinition.steps.length - 1) {
                        setScreenMode("review");
                        return;
                      }
                      setStepIndex((value) => value + 1);
                    }}
                  />
                </div>
              </div>
            ) : null}

            {screenMode === "review" ? (
              <div className="space-y-7">
                <div className="space-y-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--color-muted)]">
                    Final Review
                  </p>
                  <h1 className="text-3xl font-bold tracking-tight text-[var(--color-ink)]">
                    입력 내용을 마지막으로 확인해 주세요
                  </h1>
                  <p className="text-sm leading-7 text-[var(--color-muted)]">
                    여기서 검토가 끝나면 평가를 실행합니다. 결과 화면 전에는 최종
                    판단을 보여주지 않습니다.
                  </p>
                  <div className="pt-2">
                    <div className="flex items-center justify-between text-xs text-[var(--color-muted)]">
                      <span>진행률</span>
                      <span>{Math.round(progressPercent)}%</span>
                    </div>
                    <div className="progress-track mt-2">
                      <div
                        className="progress-fill"
                        style={{ width: `${progressPercent}%` }}
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-3">
                  <MetricCard label="팩" value={packDefinition.label} />
                  <MetricCard label="남은 필수값" value={`${overallMissing.length}개`} />
                  <MetricCard
                    label="현재 상태"
                    value={overallMissing.length === 0 ? "평가 가능" : "입력 보완 필요"}
                  />
                </div>

                <div className="space-y-4">
                  {reviewSections.map((section) => (
                    <div
                      key={section.id}
                      className="rounded-lg border border-[var(--color-line)] bg-[var(--color-surface-strong)] p-5"
                    >
                      <p className="text-sm font-semibold text-[var(--color-ink)]">
                        {section.title}
                      </p>
                      <p className="mt-1 text-sm leading-6 text-[var(--color-muted)]">
                        {section.description}
                      </p>
                      <div className="mt-3">
                        {section.rows.map((row) => (
                          <SummaryRow
                            key={`${section.id}-${row.label}`}
                            label={row.label}
                            value={row.value}
                          />
                        ))}
                      </div>
                    </div>
                  ))}
                </div>

                <StatusBanner
                  message={
                    overallMissing.length === 0
                      ? "입력이 모두 정리되었습니다. 평가 실행을 누르면 결과 화면으로 이동합니다."
                      : `${overallMissing.join(", ")} 항목이 아직 필요합니다.`
                  }
                />
                {errorMessage ? <ErrorBanner message={errorMessage} /> : null}

                <div className="flex flex-wrap gap-3">
                  <ActionButton
                    label="이전 단계로"
                    onClick={() => {
                      setStepIndex(packDefinition.steps.length - 1);
                      setScreenMode("step");
                    }}
                    variant="secondary"
                  />
                  <ActionButton
                    label="평가 실행"
                    onClick={() => {
                      if (overallMissing.length > 0) {
                        setErrorMessage(
                          `${overallMissing.join(", ")} 항목을 먼저 선택해 주세요.`,
                        );
                        return;
                      }

                      void runEvaluation();
                    }}
                    active={isBusy}
                    disabled={isBusy}
                  />
                </div>
              </div>
            ) : null}
            </div>
          </section>
        </div>
      </div>
    </main>
    </AwsIntegrationProvider>
  );
}
