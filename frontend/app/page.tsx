"use client";

import { RemediationPreview } from "../components/cloud/RemediationPreview";
import { CloudConnectionCard } from "../components/cloud/CloudConnectionCard";
import { ResourceInspectionCard } from "../components/cloud/ResourceInspectionCard";
import { JsonDebugPanel } from "../components/dev/JsonDebugPanel";
import { EvidenceSummaryPanel } from "../components/evidence/EvidenceSummaryPanel";
import { AppHeader } from "../components/layout/AppHeader";
import { ReviewSidebar } from "../components/layout/ReviewSidebar";
import { StepContainer } from "../components/layout/StepContainer";
import { PackRecommendationPanel } from "../components/policy/PackRecommendationPanel";
import { PolicyQuestionWizard } from "../components/policy/PolicyQuestionWizard";
import { DecisionHeroCard } from "../components/result/DecisionHeroCard";
import { DecisionReasonList } from "../components/result/DecisionReasonList";
import { LegalBasisAccordion } from "../components/result/LegalBasisAccordion";
import { RequiredActionsPanel } from "../components/result/RequiredActionsPanel";
import { TriggeredRulesAccordion } from "../components/result/TriggeredRulesAccordion";
import { useReviewSession, type ReviewStepId } from "../hooks/useReviewSession";

const nextStep: Record<ReviewStepId, ReviewStepId> = {
  connection: "resource",
  resource: "evidence",
  evidence: "policy",
  policy: "result",
  result: "actions",
  actions: "actions",
};

export default function Home() {
  const session = useReviewSession();

  const stepContent = {
    connection: (
      <StepContainer
        eyebrow="Step 1"
        title="클라우드 연결"
        description="AWS 또는 Azure에서 기술 정보를 가져오기 위한 세션을 준비합니다. 연결 정보는 브라우저 저장소에 저장하지 않습니다."
        footer={
          <button
            type="button"
            onClick={() => session.setCurrentStep("resource")}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            리소스 검사로 이동
          </button>
        }
      >
        <CloudConnectionCard
          connection={session.connection}
          credentials={session.credentials}
          roleStart={session.roleStart}
          activeAction={session.activeAction}
          onProviderChange={(provider) =>
            session.setConnection((current) => ({ ...current, provider }))
          }
          onConnectionModeChange={(mode) =>
            session.setConnection((current) => ({ ...current, mode }))
          }
          onCredentialsChange={(next) =>
            session.setCredentials((current) => ({ ...current, ...next }))
          }
          onStartRole={session.startRoleConnection}
          onCompleteRole={session.completeRoleConnection}
        />
      </StepContainer>
    ),
    resource: (
      <StepContainer
        eyebrow="Step 2"
        title="리소스 검사"
        description="검토할 S3 버킷을 선택하고 암호화, 접근 통제, 태그 기반 데이터 유형 같은 기술 근거를 수집합니다."
        footer={
          <button
            type="button"
            onClick={() => session.setCurrentStep("evidence")}
            className="rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
          >
            수집값 확인
          </button>
        }
      >
        <ResourceInspectionCard
          connection={session.connection}
          bucketName={session.bucketName}
          activeAction={session.activeAction}
          onBucketNameChange={session.setBucketName}
          onInspectWithKeys={session.inspectWithKeys}
          onInspectWithRole={session.inspectWithRole}
        />
      </StepContainer>
    ),
    evidence: (
      <StepContainer
        eyebrow="Step 3"
        title="자동 수집/추정/수동 필요 입력값 확인"
        description="기술 사실은 자동화하고, 법률 판단은 사람이 확인해야 한다는 제품의 핵심 흐름을 한눈에 보여줍니다."
        footer={
          <button
            type="button"
            onClick={() => session.setCurrentStep("policy")}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            법률 확인으로 이동
          </button>
        }
      >
        <EvidenceSummaryPanel rows={session.evidenceRows} />
      </StepContainer>
    ),
    policy: (
      <StepContainer
        eyebrow="Step 4"
        title="이전 시나리오와 법률 확인 질문"
        description="사용자가 pack_id를 이해하지 않아도 되도록 이전 상황을 먼저 입력하고, 관련 팩을 추천한 뒤 부족한 법률 근거만 확인합니다."
        footer={
          <button
            type="button"
            onClick={session.evaluateSelectedPacks}
            disabled={session.activeAction !== null}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"
          >
            {session.activeAction === "evaluate" ? "평가 중..." : "평가 실행"}
          </button>
        }
      >
        <div className="space-y-5">
          <PolicyQuestionWizard
            scenario={session.scenario}
            manualPolicy={session.manualPolicy}
            onScenarioChange={session.setScenarioField}
            onManualPolicyChange={session.setManualPolicyField}
          />
          <PackRecommendationPanel
            packSummaries={session.packSummaries}
            recommendedPacks={session.recommendedPacks}
            selectedPacks={session.selectedPacks}
            onTogglePack={session.togglePack}
          />
        </div>
      </StepContainer>
    ),
    result: (
      <StepContainer
        eyebrow="Step 5"
        title="최종 판정 결과"
        description="JSON보다 먼저 의사결정 결과, 이유, 관련 법적 근거, 필요한 조치를 보여줍니다."
        footer={
          <button
            type="button"
            onClick={() => session.setCurrentStep("actions")}
            className="rounded-lg bg-[var(--color-accent)] px-4 py-2 text-sm font-semibold text-white"
          >
            조치 가이드로 이동
          </button>
        }
      >
        <div className="space-y-5">
          <DecisionHeroCard result={session.primaryEvaluation} />
          <div className="grid gap-5 lg:grid-cols-2">
            <DecisionReasonList result={session.primaryEvaluation} />
            <RequiredActionsPanel result={session.primaryEvaluation} />
          </div>
          <LegalBasisAccordion result={session.primaryEvaluation} />
          <TriggeredRulesAccordion result={session.primaryEvaluation} />
          <JsonDebugPanel value={session.mergePreview} />
        </div>
      </StepContainer>
    ),
    actions: (
      <StepContainer
        eyebrow="Step 6"
        title="조치 가이드"
        description="클라우드 설정 변경은 자동 적용처럼 보이지 않게, 변경 전후와 선택 항목을 먼저 확인하는 미리보기 중심으로 제공합니다."
      >
        <div className="space-y-5">
          <RequiredActionsPanel result={session.primaryEvaluation} />
          <RemediationPreview
            activeAction={session.activeAction}
            onApply={session.applyRecommendedSettingsPreview}
          />
          <TriggeredRulesAccordion result={session.primaryEvaluation} />
        </div>
      </StepContainer>
    ),
  };

  return (
    <main className="min-h-screen bg-[var(--color-canvas)]">
      <AppHeader
        connection={session.connection}
        onChangeConnection={() => session.setCurrentStep("connection")}
      />
      <div className="mx-auto grid w-full max-w-7xl gap-6 px-4 py-6 sm:px-6 lg:grid-cols-[260px_1fr] lg:px-8">
        <ReviewSidebar
          currentStep={session.currentStep}
          onStepChange={session.setCurrentStep}
        />
        <div className="space-y-4">
          {session.error ? (
            <div className="rounded-lg border border-[var(--color-danger)] bg-[var(--color-danger-soft)] px-4 py-3 text-sm text-[var(--color-danger)]">
              {session.error}
            </div>
          ) : null}
          <div className="rounded-lg border border-[var(--color-line)] bg-white px-4 py-3 text-sm text-[var(--color-muted)]">
            {session.status}
          </div>
          {stepContent[session.currentStep]}
          {session.currentStep !== "actions" ? (
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => session.setCurrentStep(nextStep[session.currentStep])}
                className="rounded-lg border border-[var(--color-line)] bg-white px-4 py-2 text-sm font-semibold text-[var(--color-ink)]"
              >
                다음 단계
              </button>
            </div>
          ) : null}
        </div>
      </div>
    </main>
  );
}
