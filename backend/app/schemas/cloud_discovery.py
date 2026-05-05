from typing import Any, Dict, Literal, Optional

from pydantic import BaseModel, Field

from app.services.cloud_discovery.types import EvidenceItem, Provider


DiscoveryMode = Literal["mock", "sample", "live"]


class AwsDiscoveryRequest(BaseModel):
    resource_type: Literal["s3_bucket"] = "s3_bucket"
    resource_id: str = Field(..., description="S3 bucket name")
    region: Optional[str] = Field(default=None, description="Optional AWS region hint")
    mode: DiscoveryMode = Field(
        default="mock",
        description="mock/sample uses supplied discovery data; live requires optional AWS SDK.",
    )
    sample_discovery: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Raw AWS discovery payload to normalize in mock/sample mode.",
    )


class AzureDiscoveryRequest(BaseModel):
    resource_type: Literal["storage_account"] = "storage_account"
    resource_id: str = Field(..., description="Azure Storage Account name")
    subscription_id: Optional[str] = None
    resource_group: Optional[str] = None
    mode: DiscoveryMode = "mock"
    sample_discovery: Optional[Dict[str, Any]] = Field(
        default=None,
        description="Raw Azure discovery payload to normalize in mock/sample mode.",
    )


class NormalizeDiscoveryRequest(BaseModel):
    provider: Provider
    resource_type: str
    resource_id: str
    raw_discovery: Dict[str, Any]


class CloudDiscoveryResponse(BaseModel):
    provider: Provider
    resource_type: str
    resource_id: str
    normalized_aws_data: Dict[str, Any]
    evidence: list[EvidenceItem]
    warnings: list[str] = []
    raw_discovery: Optional[Dict[str, Any]] = None
