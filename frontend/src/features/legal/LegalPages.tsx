import { Link } from "react-router-dom";
import { useConfig } from "../../shared/config";

export function LegalPage({ kind }: { kind: "privacy" | "terms" | "disclosures" }) {
  const cfg = useConfig();
  const title =
    kind === "privacy" ? "Privacy" : kind === "terms" ? "Terms" : "Disclosures";
  const body =
    kind === "privacy"
      ? `${cfg.brand_name} is a private wholesale marketplace. We collect account data, buying criteria, and activity on listings to operate the desk. We do not sell buyer lists.`
      : kind === "terms"
        ? `By registering you agree to confidentiality, no daisy-chaining / re-marketing, independent verification of all numbers, and no unaccompanied entry. Terms version ${cfg.terms_version}.`
        : `Off-market inventory. The operator may hold an equitable interest and may not own title. Texas buyers must acknowledge the equitable-interest notice on each deal before offering.`;
  return (
    <div className="mx-auto max-w-2xl px-4 py-16">
      <h1 className="text-2xl font-semibold">{title}</h1>
      <p className="mt-4 text-sm leading-6 text-neutral-700">{body}</p>
      <Link to="/login" className="mt-8 inline-block text-sm text-gold">
        Back
      </Link>
    </div>
  );
}
