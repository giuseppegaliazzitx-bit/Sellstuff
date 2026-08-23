/**
 * Generated from the backend OpenAPI document.
 * Phase 0 ships a hand-written snapshot; `python scripts/gen_openapi.py`
 * regenerates it. CI (`openapi-sync`) fails on drift once that job is enabled.
 *
 * Do not add fields that belong on DealAdmin (rehab, assignment_fee, MAO, lockbox).
 */

export interface PublicConfig {
  brand_name: string;
  tagline: string | null;
  domain: string;
  support_phone: string | null;
  support_email: string | null;
  logo_url: string | null;
  footer_legal_name: string | null;
  primary_state: string;
  mailing_address: string | null;
}

export interface HealthResponse {
  status: string;
  db: string;
  redis: string;
}

export interface VersionResponse {
  version: string;
  commit: string;
  environment: string;
}
