/**
 * Hand-maintained until openapi-sync is enforced.
 * Do not add DealAdmin-only fields (rehab, assignment_fee, MAO, lockbox).
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
  terms_version: string;
}

export interface AuthUser {
  id: string;
  email: string;
  name: string;
  role: string;
  status: string;
  email_verified: boolean;
  terms_accepted: boolean;
  terms_version: string | null;
}

export interface BuyerRow {
  id: string;
  email: string;
  name: string;
  status: string;
  role: string;
  email_verified: boolean;
  company: string | null;
  lead_source: string | null;
  created_at: string;
  phone: string;
}

export interface SessionRow {
  id: string;
  family_id: string;
  ip: string;
  user_agent: string;
  device_label: string;
  issued_at: string;
  last_used_at: string | null;
  current: boolean;
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
