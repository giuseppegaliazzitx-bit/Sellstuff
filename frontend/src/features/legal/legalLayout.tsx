import type { ReactNode } from "react";
import { Link } from "react-router-dom";
import { useConfig } from "../../shared/config";

export function useLegalMeta() {
  const cfg = useConfig();
  const brand = cfg.footer_legal_name || cfg.brand_name;
  const host = cfg.domain || "localhost";
  const email = cfg.support_email || `privacy@${host}`;
  const address = cfg.mailing_address;
  const phone = cfg.support_phone;
  const state = cfg.primary_state || "TX";
  return { cfg, brand, host, email, address, phone, state };
}

export function LegalArticle({ title, children }: { title: string; children: ReactNode }) {
  return (
    <article className="mx-auto max-w-3xl px-4 py-16 text-left text-base leading-[1.5] text-neutral-800">
      <h1 className="text-3xl font-semibold tracking-tight">{title}</h1>
      {children}
      <Link to="/" className="mt-10 inline-block text-sm text-gold">
        Back
      </Link>
    </article>
  );
}

export const legalA = "text-gold underline";
export const legalH2 = "mt-8 text-xl font-semibold";
export const legalP = "mt-3";
export const legalUl = "mt-3 list-disc space-y-2 pl-6";
