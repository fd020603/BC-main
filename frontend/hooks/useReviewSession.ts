"use client";

import { useEffect, useMemo, useState } from "react";

import type {
  AwsConnectionCompleteResponse,
  AwsConnectionStartResponse,
  AwsS3CheckResponse,
  DecisionGrade,
  EvaluationResult,
  JsonObject,
  PackSummary,
} from "../app/workspace-types";
import { API_BASE_URL, buildErrorMessage, fetchJson } from "../app/workspace-runtime";

export type ReviewStepId =
  | "connection"
  | "resource"
  | "evidence"
  | "policy"
  | "result"
  | "actions";

export type Provider = "aws" | "azure";
export type ConnectionMode = "access_key" | "iam_role";

export type ScenarioState = {
  sourceRegion: string;
  targetRegion: string;
  dataSubjectRegion: string;
  dataType: string;
  usesProcessor: string;
};

export type ManualPolicyState = {
  lawful_basis: string;
  transfer_notice_provided: string;
  dpa_exists: string;
  risk_assessment_done: string;
  privacy_notice_updated: string;
  records_of_processing_exists: string;
  scc_in_place: string;
};

export type EvidenceSource = "automatic" | "inferred" | "manual" | "missing";

export type EvidenceRow = {
  field: string;
  value: unknown;
  source: EvidenceSource;
  badge: string;
  description: string;
};

export type CloudConnectionState = {
  provider: Provider;
  connected: boolean;
  mode: ConnectionMode;
  statusText: string;
  roleArn: string;
  connectionId: string | null;
  lastResource: string;
  lastCheckedAt: string | null;
};

export type AwsCredentialState = {
  accessKeyId: string;
  secretAccessKey: string;
  sessionToken: string;
  roleArn: string;
  connectionName: string;
};

export type EvaluationEntry = {
  packId: string;
  result: EvaluationResult;
};

const STORAGE_KEY = "border-checker-review-session-v1";
const DEFAULT_PACKS = ["korea_pipa", "gdpr"];

const decisionRank: Record<DecisionGrade, number> = {
  allow: 0,
  condition_allow: 1,
  manual_review: 2,
  deny: 3,
};

const defaultScenario: ScenarioState = {
  sourceRegion: "ap-northeast-2",
  targetRegion: "eu-central-1",
  dataSubjectRegion: "Korea",
  dataType: "customer_records",
  usesProcessor: "true",
};

const defaultManualPolicy: ManualPolicyState = {
  lawful_basis: "",
  transfer_notice_provided: "unknown",
  dpa_exists: "unknown",
  risk_assessment_done: "unknown",
  privacy_notice_updated: "unknown",
  records_of_processing_exists: "unknown",
  scc_in_place: "unknown",
};

const defaultConnection: CloudConnectionState = {
  provider: "aws",
  connected: false,
  mode: "access_key",
  statusText: "not_connected",
  roleArn: "",
  connectionId: null,
  lastResource: "",
  lastCheckedAt: null,
};

const defaultCredentials: AwsCredentialState = {
  accessKeyId: "",
  secretAccessKey: "",
  sessionToken: "",
  roleArn: "",
  connectionName: "border-checker-demo",
};

function toBool(value: string): boolean | null {
  if (value === "true") {
    return true;
  }
  if (value === "false") {
    return false;
  }
  return null;
}

function boolToString(value: unknown) {
  if (value === true) {
    return "true";
  }
  if (value === false) {
    return "false";
  }
  if (value === null || value === undefined || value === "") {
    return "unknown";
  }
  return String(value);
}

function regionCountry(region: string) {
  if (region === "ap-northeast-2") return "Korea";
  if (region.startsWith("eu-")) return "EU";
  if (region.startsWith("us-")) return "United States";
  if (region.startsWith("sa-")) return "Brazil";
  if (region.startsWith("tw-")) return "Taiwan";
  return "Other";
}

function normalizeCloudData(result: AwsS3CheckResponse | null, scenario: ScenarioState) {
  const data = result?.normalized_cloud_data ?? result?.normalized_aws_data ?? {};
  return {
    current_region: data.current_region ?? scenario.sourceRegion,
    encryption_at_rest_effective:
      data.encryption_at_rest_effective ?? data.encryption_at_rest ?? null,
    bucket_default_encryption_configured:
      data.bucket_default_encryption_configured ?? data.encryption_at_rest ?? null,
    encryption_at_rest: data.encryption_at_rest ?? data.encryption_at_rest_effective ?? null,
    encryption_in_transit: data.encryption_in_transit ?? null,
    access_control_in_place: data.access_control_in_place ?? null,
    contains_sensitive_data:
      data.contains_sensitive_data ?? (scenario.dataType.includes("sensitive") ? true : false),
    data_type: data.data_type ?? scenario.dataType,
    uses_processor: data.uses_processor ?? toBool(scenario.usesProcessor),
  };
}

function buildPolicyPayload(scenario: ScenarioState, manual: ManualPolicyState): JsonObject {
  const target = scenario.targetRegion;
  const transferOutsideKorea = scenario.sourceRegion === "ap-northeast-2" && target !== "ap-northeast-2";
  const transferOutsideBrazil = !target.startsWith("sa-");
  const crossBorderTaiwan = target !== "tw-taipei-dc";
  const usesProcessor = toBool(scenario.usesProcessor) ?? false;
  const lawfulBasis = manual.lawful_basis || "unknown";

  return {
    dataset_name: "cloud_resource_review",
    data_subject_region: scenario.dataSubjectRegion,
    data_subject_connection:
      scenario.dataSubjectRegion === "Brazil" ? "BRAZIL_RESIDENT" : "OTHER",
    target_region: target,
    processing_purpose_defined: true,
    data_minimized: true,
    retention_period_defined: true,
    lawful_basis: lawfulBasis,
    processing_legal_basis: lawfulBasis === "unknown" ? "legitimate_interest" : lawfulBasis,
    transfer_notice_provided: toBool(manual.transfer_notice_provided),
    cross_border_notice_provided: transferOutsideKorea
      ? toBool(manual.transfer_notice_provided)
      : null,
    privacy_notice_updated: toBool(manual.privacy_notice_updated),
    privacy_notice_available: toBool(manual.privacy_notice_updated),
    privacy_policy_available: toBool(manual.privacy_notice_updated),
    records_of_processing_exists: toBool(manual.records_of_processing_exists),
    transfer_documented_in_ropa: toBool(manual.records_of_processing_exists),
    dpa_in_place: usesProcessor ? toBool(manual.dpa_exists) : null,
    processor_agreement_in_place: usesProcessor ? toBool(manual.dpa_exists) : null,
    processor_compliance_verified: usesProcessor ? toBool(manual.risk_assessment_done) : null,
    subprocessor_controls_in_place: usesProcessor ? toBool(manual.dpa_exists) : null,
    controller_processor_roles_defined: usesProcessor ? toBool(manual.dpa_exists) : null,
    processor_sufficient_guarantees: usesProcessor ? toBool(manual.risk_assessment_done) : null,
    scc_in_place: toBool(manual.scc_in_place),
    standard_contractual_clauses_in_place: toBool(manual.scc_in_place),
    standard_contractual_clauses_full_unaltered: toBool(manual.scc_in_place),
    bcr_in_place: false,
    other_safeguards_in_place: toBool(manual.risk_assessment_done),
    transfer_impact_assessment_completed: toBool(manual.risk_assessment_done),
    supplemental_measures_documented: toBool(manual.risk_assessment_done),
    transfer_risk_assessment_completed: toBool(manual.risk_assessment_done),
    risk_assessment_done: toBool(manual.risk_assessment_done),
    incident_response_in_place: true,
    derogation_used: false,
    transfer_exception_used: false,
    transfer_outside_korea: transferOutsideKorea,
    is_third_country_transfer: transferOutsideKorea,
    pipa_transfer_basis_available:
      transferOutsideKorea &&
      (manual.transfer_notice_provided === "true" || manual.scc_in_place === "true"),
    separate_consent_for_transfer: false,
    treaty_or_statutory_transfer_basis: false,
    contract_necessity_disclosed_or_notified: manual.transfer_notice_provided === "true",
    pipa_certified_recipient: false,
    pipa_equivalence_recognition_exists: false,
    transfer_protection_measures_ready: toBool(manual.risk_assessment_done),
    onward_transfer_controls: toBool(manual.dpa_exists),
    transfer_outside_brazil: transferOutsideBrazil,
    adequacy_decision_confirmed: false,
    appropriate_transfer_mechanism_available: manual.scc_in_place === "true",
    international_transfer_transparency_document_available:
      toBool(manual.transfer_notice_provided),
    full_transfer_clauses_request_ready: toBool(manual.scc_in_place),
    subsequent_transfer_expected: usesProcessor,
    subsequent_transfer_controls_in_place: usesProcessor ? toBool(manual.dpa_exists) : null,
    agency_type: "non_government_agency",
    specific_purpose_defined: true,
    collection_processing_basis: lawfulBasis === "unknown" ? "contract_or_quasi_contract_with_security" : "data_subject_consent",
    collected_directly_from_data_subject: true,
    article8_notice_provided: toBool(manual.transfer_notice_provided),
    data_subject_rights_request_ready: true,
    security_maintenance_measures_ready: true,
    cross_border_transfer: crossBorderTaiwan,
  };
}

function buildAwsPayload(result: AwsS3CheckResponse | null, scenario: ScenarioState): JsonObject {
  const normalized = normalizeCloudData(result, scenario);
  return {
    current_region: normalized.current_region,
    encryption_at_rest: normalized.encryption_at_rest,
    encryption_at_rest_effective: normalized.encryption_at_rest_effective,
    bucket_default_encryption_configured: normalized.bucket_default_encryption_configured,
    encryption_in_transit: normalized.encryption_in_transit,
    access_control_in_place: normalized.access_control_in_place,
    data_type: normalized.data_type,
    contains_sensitive_data: normalized.contains_sensitive_data,
    uses_processor: normalized.uses_processor,
  };
}

export function getRecommendedPacks(scenario: ScenarioState) {
  const packs = new Map<string, string>();
  const sourceCountry = regionCountry(scenario.sourceRegion);
  const targetCountry = regionCountry(scenario.targetRegion);

  if (sourceCountry === "Korea" || scenario.dataSubjectRegion === "Korea") {
    packs.set("korea_pipa", "한국 리전 또는 한국 정보주체가 관련된 국외이전입니다.");
  }
  if (
    targetCountry === "EU" ||
    scenario.dataSubjectRegion === "EU" ||
    scenario.dataSubjectRegion === "EEA"
  ) {
    packs.set("gdpr", "EU 도착지 또는 EU/EEA 정보주체 관련 검토가 필요합니다.");
  }
  if (targetCountry === "Brazil" || scenario.dataSubjectRegion === "Brazil") {
    packs.set("lgpd", "브라질 도착지 또는 브라질 정보주체가 관련됩니다.");
  }
  if (targetCountry === "Taiwan" || scenario.dataSubjectRegion === "Taiwan") {
    packs.set("taiwan_pdpa", "대만 도착지 또는 대만 정보주체가 관련됩니다.");
  }
  if (targetCountry === "Other" && scenario.targetRegion.includes("saudi")) {
    packs.set("saudi_pdpl", "사우디 관련 이전 시나리오로 볼 수 있습니다.");
  }

  if (packs.size === 0) {
    packs.set("gdpr", "기본 국제 이전 검토 팩으로 우선 확인합니다.");
  }

  return packs;
}

function loadStoredSession() {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    return JSON.parse(window.localStorage.getItem(STORAGE_KEY) ?? "null") as {
      currentStep?: ReviewStepId;
      scenario?: Partial<ScenarioState>;
      manualPolicy?: Partial<ManualPolicyState>;
      selectedPacks?: string[];
      provider?: Provider;
    } | null;
  } catch {
    return null;
  }
}

export function useReviewSession() {
  const stored = loadStoredSession();
  const [currentStep, setCurrentStep] = useState<ReviewStepId>(stored?.currentStep ?? "connection");
  const [scenario, setScenario] = useState<ScenarioState>({
    ...defaultScenario,
    ...(stored?.scenario ?? {}),
  });
  const [manualPolicy, setManualPolicy] = useState<ManualPolicyState>({
    ...defaultManualPolicy,
    ...(stored?.manualPolicy ?? {}),
  });
  const [selectedPacks, setSelectedPacks] = useState<string[]>(
    stored?.selectedPacks?.length ? stored.selectedPacks : DEFAULT_PACKS,
  );
  const [connection, setConnection] = useState<CloudConnectionState>({
    ...defaultConnection,
    provider: stored?.provider ?? "aws",
  });
  const [credentials, setCredentials] = useState<AwsCredentialState>(defaultCredentials);
  const [bucketName, setBucketName] = useState("");
  const [roleStart, setRoleStart] = useState<AwsConnectionStartResponse | null>(null);
  const [lastCheckResult, setLastCheckResult] = useState<AwsS3CheckResponse | null>(null);
  const [packSummaries, setPackSummaries] = useState<PackSummary[]>([]);
  const [evaluations, setEvaluations] = useState<EvaluationEntry[]>([]);
  const [mergePreview, setMergePreview] = useState<JsonObject | null>(null);
  const [status, setStatus] = useState("검토 세션을 준비했습니다.");
  const [error, setError] = useState<string | null>(null);
  const [activeAction, setActiveAction] = useState<string | null>(null);

  useEffect(() => {
    const recommended = Array.from(getRecommendedPacks(scenario).keys());
    setSelectedPacks((current) => {
      const merged = Array.from(new Set([...recommended, ...current]));
      return merged.length ? merged : DEFAULT_PACKS;
    });
  }, [scenario]);

  useEffect(() => {
    void fetchJson<PackSummary[]>("/api/v1/packs")
      .then(setPackSummaries)
      .catch((err) => setError(buildErrorMessage(err)));
  }, []);

  useEffect(() => {
    window.localStorage.setItem(
      STORAGE_KEY,
      JSON.stringify({
        currentStep,
        scenario,
        manualPolicy,
        selectedPacks,
        provider: connection.provider,
      }),
    );
  }, [connection.provider, currentStep, manualPolicy, scenario, selectedPacks]);

  const evidenceRows = useMemo<EvidenceRow[]>(() => {
    const normalized = normalizeCloudData(lastCheckResult, scenario);
    return [
      {
        field: "current_region",
        value: normalized.current_region,
        source: lastCheckResult ? "automatic" : "manual",
        badge: lastCheckResult ? "AWS 자동수집" : "시나리오 입력",
        description: "리소스가 현재 위치한 클라우드 리전입니다.",
      },
      {
        field: "encryption_at_rest_effective",
        value: normalized.encryption_at_rest_effective,
        source: lastCheckResult ? "automatic" : "missing",
        badge: lastCheckResult ? "AWS 자동수집" : "확인 불가",
        description: "저장 데이터 암호화가 실제로 유효한지 나타냅니다.",
      },
      {
        field: "bucket_default_encryption_configured",
        value: normalized.bucket_default_encryption_configured,
        source: lastCheckResult ? "automatic" : "missing",
        badge: lastCheckResult ? "AWS 자동수집" : "확인 불가",
        description: "S3 기본 암호화 설정 여부입니다.",
      },
      {
        field: "access_control_in_place",
        value: normalized.access_control_in_place,
        source: lastCheckResult ? "automatic" : "missing",
        badge: lastCheckResult ? "AWS 자동수집" : "확인 불가",
        description: "Public Access Block, ACL 등 접근 통제 근거입니다.",
      },
      {
        field: "contains_sensitive_data",
        value: normalized.contains_sensitive_data,
        source: "inferred",
        badge: "태그 기반 추정",
        description: "태그 또는 데이터 유형으로 민감정보 가능성을 추정합니다.",
      },
      {
        field: "data_type",
        value: normalized.data_type,
        source: "inferred",
        badge: "시나리오 추정",
        description: "고객기록, 로그, 인사정보 등 처리 데이터 유형입니다.",
      },
      {
        field: "uses_processor",
        value: normalized.uses_processor,
        source: "inferred",
        badge: "시나리오 추정",
        description: "외부 처리자 또는 하위처리자 사용 여부입니다.",
      },
      {
        field: "lawful_basis",
        value: manualPolicy.lawful_basis || "미확인",
        source: manualPolicy.lawful_basis ? "manual" : "missing",
        badge: manualPolicy.lawful_basis ? "수동 확인" : "수동 확인 필요",
        description: "처리 및 이전의 법적 근거입니다.",
      },
      {
        field: "transfer_notice_provided",
        value: boolToString(toBool(manualPolicy.transfer_notice_provided)),
        source: manualPolicy.transfer_notice_provided === "unknown" ? "missing" : "manual",
        badge: "수동 확인 필요",
        description: "정보주체에게 국외이전 사실을 고지했는지 확인합니다.",
      },
      {
        field: "dpa_exists",
        value: boolToString(toBool(manualPolicy.dpa_exists)),
        source: manualPolicy.dpa_exists === "unknown" ? "missing" : "manual",
        badge: "수동 확인 필요",
        description: "처리자 계약 또는 DPA 체결 여부입니다.",
      },
      {
        field: "risk_assessment_done",
        value: boolToString(toBool(manualPolicy.risk_assessment_done)),
        source: manualPolicy.risk_assessment_done === "unknown" ? "missing" : "manual",
        badge: "수동 확인 필요",
        description: "이전 영향평가, 위험평가, 보완조치 문서화 여부입니다.",
      },
    ];
  }, [lastCheckResult, manualPolicy, scenario]);

  const recommendedPacks = useMemo(() => getRecommendedPacks(scenario), [scenario]);

  const primaryEvaluation = useMemo(() => {
    return evaluations
      .map((entry) => entry.result)
      .sort((a, b) => decisionRank[b.final_decision] - decisionRank[a.final_decision])[0] ?? null;
  }, [evaluations]);

  function setScenarioField(key: keyof ScenarioState, value: string) {
    setScenario((current) => ({ ...current, [key]: value }));
  }

  function setManualPolicyField(key: keyof ManualPolicyState, value: string) {
    setManualPolicy((current) => ({ ...current, [key]: value }));
  }

  function togglePack(packId: string) {
    setSelectedPacks((current) =>
      current.includes(packId)
        ? current.filter((id) => id !== packId)
        : [...current, packId],
    );
  }

  async function withAction(action: string, task: () => Promise<void>) {
    setActiveAction(action);
    setError(null);
    try {
      await task();
    } catch (err) {
      setError(buildErrorMessage(err));
    } finally {
      setActiveAction(null);
    }
  }

  async function startRoleConnection() {
    await withAction("start-role", async () => {
      const response = await fetchJson<AwsConnectionStartResponse>("/api/v1/cloud-connections/aws/start", {
        method: "POST",
        body: JSON.stringify({
          connection_name: credentials.connectionName,
          region: scenario.sourceRegion || "ap-northeast-2",
        }),
      });
      setRoleStart(response);
      setConnection((current) => ({
        ...current,
        mode: "iam_role",
        connectionId: response.connection_id,
        statusText: "role_setup_started",
      }));
      setStatus("IAM Role 연결을 시작했습니다. CloudFormation 생성 후 Role ARN을 확인해주세요.");
    });
  }

  async function completeRoleConnection() {
    await withAction("complete-role", async () => {
      if (!connection.connectionId) {
        throw new Error("먼저 AWS 연결 시작을 실행해주세요.");
      }
      if (!credentials.roleArn.trim()) {
        throw new Error("Role ARN을 입력해주세요.");
      }
      const response = await fetchJson<AwsConnectionCompleteResponse>("/api/v1/cloud-connections/aws/complete", {
        method: "POST",
        body: JSON.stringify({
          connection_id: connection.connectionId,
          role_arn: credentials.roleArn.trim(),
        }),
      });
      setConnection((current) => ({
        ...current,
        connected: true,
        mode: "iam_role",
        roleArn: response.role_arn,
        statusText: "active",
      }));
      setStatus("AWS IAM Role 연결이 확인되었습니다.");
    });
  }

  async function inspectWithKeys() {
    await withAction("inspect-keys", async () => {
      if (!credentials.accessKeyId.trim() || !credentials.secretAccessKey.trim()) {
        throw new Error("Access Key ID와 Secret Access Key를 입력해주세요.");
      }
      if (!bucketName.trim()) {
        throw new Error("검사할 S3 버킷 이름을 입력해주세요.");
      }
      const response = await fetchJson<AwsS3CheckResponse>("/api/v1/cloud-discovery/aws/s3/check-with-keys", {
        method: "POST",
        body: JSON.stringify({
          access_key_id: credentials.accessKeyId.trim(),
          secret_access_key: credentials.secretAccessKey,
          session_token: credentials.sessionToken.trim() || null,
          bucket_name: bucketName.trim(),
        }),
      });
      applyInspectionResult(response, "access_key");
    });
  }

  async function inspectWithRole() {
    await withAction("inspect-role", async () => {
      if (!connection.connectionId || !connection.connected) {
        throw new Error("IAM Role 연결을 먼저 완료해주세요.");
      }
      if (!bucketName.trim()) {
        throw new Error("검사할 S3 버킷 이름을 입력해주세요.");
      }
      const response = await fetchJson<AwsS3CheckResponse>("/api/v1/cloud-discovery/aws/s3/check", {
        method: "POST",
        body: JSON.stringify({
          connection_id: connection.connectionId,
          bucket_name: bucketName.trim(),
        }),
      });
      applyInspectionResult(response, "iam_role");
    });
  }

  function applyInspectionResult(response: AwsS3CheckResponse, mode: ConnectionMode) {
    const normalized = normalizeCloudData(response, scenario);
    setLastCheckResult(response);
    setConnection((current) => ({
      ...current,
      connected: true,
      mode,
      statusText: "active",
      lastResource: response.resource_id || bucketName,
      lastCheckedAt: new Date().toISOString(),
    }));
    setScenario((current) => ({
      ...current,
      sourceRegion: String(normalized.current_region ?? current.sourceRegion),
      dataType: String(normalized.data_type ?? current.dataType),
      usesProcessor: boolToString(normalized.uses_processor),
    }));
    setStatus("S3 검사 결과를 수집값 확인 단계에 반영했습니다.");
    setCurrentStep("evidence");
  }

  async function evaluateSelectedPacks() {
    await withAction("evaluate", async () => {
      if (selectedPacks.length === 0) {
        throw new Error("검토할 법률 팩을 하나 이상 선택해주세요.");
      }
      const aws_data = buildAwsPayload(lastCheckResult, scenario);
      const policy_data = buildPolicyPayload(scenario, manualPolicy);
      const results: EvaluationEntry[] = [];

      for (const packId of selectedPacks) {
        const result = await fetchJson<EvaluationResult>("/api/v1/evaluate", {
          method: "POST",
          body: JSON.stringify({ pack_id: packId, aws_data, policy_data }),
        });
        results.push({ packId, result });
      }

      setEvaluations(results);
      setMergePreview(results[0]?.result.merged_input ?? null);
      setStatus("선택한 법률 팩 평가를 완료했습니다.");
      setCurrentStep("result");
    });
  }

  async function applyRecommendedSettingsPreview() {
    await withAction("apply-preview", async () => {
      if (connection.mode === "iam_role") {
        if (!connection.connectionId || !bucketName.trim()) {
          throw new Error("연결된 Role과 S3 버킷이 필요합니다.");
        }
        const response = await fetch(`${API_BASE_URL}/api/v1/cloud-discovery/aws/s3/apply-recommended-settings`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            connection_id: connection.connectionId,
            bucket_name: bucketName.trim(),
            data_type: scenario.dataType,
            contains_sensitive_data: scenario.dataType.includes("sensitive"),
            uses_processor: toBool(scenario.usesProcessor),
          }),
        });
        if (!response.ok) {
          throw new Error("권장 설정 적용 요청이 실패했습니다.");
        }
      }
      setStatus("선택한 권장 설정 적용 요청을 전송했습니다.");
    });
  }

  return {
    activeAction,
    bucketName,
    connection,
    credentials,
    currentStep,
    error,
    evaluations,
    evidenceRows,
    lastCheckResult,
    manualPolicy,
    mergePreview,
    packSummaries,
    primaryEvaluation,
    recommendedPacks,
    roleStart,
    scenario,
    selectedPacks,
    status,
    applyRecommendedSettingsPreview,
    completeRoleConnection,
    evaluateSelectedPacks,
    inspectWithKeys,
    inspectWithRole,
    setBucketName,
    setConnection,
    setCredentials,
    setCurrentStep,
    setManualPolicyField,
    setScenarioField,
    startRoleConnection,
    togglePack,
  };
}
