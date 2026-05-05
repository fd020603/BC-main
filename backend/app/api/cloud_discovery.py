from fastapi import APIRouter, HTTPException

from app.schemas.cloud_discovery import (
    AwsDiscoveryRequest,
    AzureDiscoveryRequest,
    CloudDiscoveryResponse,
    NormalizeDiscoveryRequest,
)
from app.services.cloud_discovery.aws_collector import (
    build_mock_aws_s3_discovery,
    collect_aws_s3_bucket_live,
)
from app.services.cloud_discovery.azure_collector import (
    build_mock_azure_storage_discovery,
    collect_azure_storage_account_live,
)
from app.services.cloud_discovery.normalizer import normalize_cloud_discovery

router = APIRouter(prefix="/api/v1/cloud-discovery", tags=["cloud-discovery"])


@router.post("/aws", response_model=CloudDiscoveryResponse)
def discover_aws(payload: AwsDiscoveryRequest):
    try:
        if payload.mode == "live":
            raw_discovery = collect_aws_s3_bucket_live(
                bucket_name=payload.resource_id,
                region=payload.region,
            )
        else:
            raw_discovery = build_mock_aws_s3_discovery(
                bucket_name=payload.resource_id,
                region=payload.region,
                sample_discovery=payload.sample_discovery,
            )

        return normalize_cloud_discovery(
            provider="aws",
            resource_type=payload.resource_type,
            resource_id=payload.resource_id,
            raw_discovery=raw_discovery,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=501, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/azure", response_model=CloudDiscoveryResponse)
def discover_azure(payload: AzureDiscoveryRequest):
    try:
        if payload.mode == "live":
            raw_discovery = collect_azure_storage_account_live(
                storage_account_name=payload.resource_id,
                subscription_id=payload.subscription_id,
                resource_group=payload.resource_group,
            )
        else:
            raw_discovery = build_mock_azure_storage_discovery(
                storage_account_name=payload.resource_id,
                sample_discovery=payload.sample_discovery,
            )

        return normalize_cloud_discovery(
            provider="azure",
            resource_type=payload.resource_type,
            resource_id=payload.resource_id,
            raw_discovery=raw_discovery,
        )
    except RuntimeError as e:
        raise HTTPException(status_code=501, detail=str(e)) from e
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e


@router.post("/normalize", response_model=CloudDiscoveryResponse)
def normalize_discovery(payload: NormalizeDiscoveryRequest):
    try:
        return normalize_cloud_discovery(
            provider=payload.provider,
            resource_type=payload.resource_type,
            resource_id=payload.resource_id,
            raw_discovery=payload.raw_discovery,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e)) from e
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e)) from e
