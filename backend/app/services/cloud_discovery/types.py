from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field


Provider = Literal["aws", "azure"]
Confidence = Literal["high", "medium", "low", "unknown"]


NORMALIZED_FIELDS = (
    "current_region",
    "encryption_at_rest",
    "encryption_in_transit",
    "access_control_in_place",
    "contains_sensitive_data",
    "data_type",
    "uses_processor",
)


class EvidenceItem(BaseModel):
    field: str
    value: Any
    source: str
    confidence: Confidence = "unknown"


class NormalizedCloudDiscovery(BaseModel):
    provider: Provider
    resource_type: str
    resource_id: str
    normalized_aws_data: Dict[str, Any] = Field(
        description="Cloud-discovered technical inputs shaped for EvaluateRequest.aws_data."
    )
    evidence: list[EvidenceItem] = Field(default_factory=list)
    warnings: list[str] = Field(default_factory=list)
    raw_discovery: Optional[Dict[str, Any]] = None
