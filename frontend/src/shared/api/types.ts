/**
 * Hand-maintained until openapi-sync is enforced.
 * Do not add DealAdmin-only fields to DealPublic.
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
  totp_enrolled?: boolean;
  totp_required?: boolean;
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
  tier?: string;
  tags?: string[];
  do_not_contact?: boolean;
  funds_verified?: boolean;
  duplicate_hint?: string | null;
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

export interface DealPublic {
  id: string;
  market_id: string;
  market_name: string;
  market_timezone: string;
  status: string;
  list_price_cents: number;
  arv_cents: number;
  address1: string;
  city: string;
  state: string;
  postal_code: string;
  lat: number | null;
  lng: number | null;
  beds: number;
  baths: number;
  sqft: number;
  year_built: number | null;
  occupancy: string;
  access: string;
  property_type: string;
  description: string;
  offers_due_at: string | null;
  video_url: string | null;
  photos: string[];
  cover_photo: string | null;
  price_history: { old_cents: number; new_cents: number; at: string }[];
  reduced_cents: number | null;
  saved: boolean;
  early_access?: boolean;
}

export interface DealAdmin extends DealPublic {
  rehab_low_cents: number;
  rehab_high_cents: number;
  assignment_fee_cents: number;
  mao_cents: number;
  lockbox_code: string;
  deal_structure: string;
  contract_close_by: string | null;
  days_to_close: number | null;
  early_access_until?: string | null;
}

export interface MapPin {
  id: string;
  lat: number;
  lng: number;
  list_price_cents: number;
  price_label: string;
  status: string;
  reduced: boolean;
  offers_due_at: string | null;
}

export interface MarketOut {
  id: string;
  slug: string;
  name: string;
  state: string;
  center_lat: number;
  center_lng: number;
  zoom: number;
  timezone: string;
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
