import { PrivacyPolicy } from "./PrivacyPolicy";
import { TermsOfUse } from "./TermsOfUse";
import { CaliforniaPrivacy } from "./CaliforniaPrivacy";
import { DoNotSell } from "./DoNotSell";

export type LegalKind = "privacy" | "terms" | "privacy-ca" | "do-not-sell";

export function LegalPage({ kind }: { kind: LegalKind }) {
  if (kind === "privacy") return <PrivacyPolicy />;
  if (kind === "terms") return <TermsOfUse />;
  if (kind === "privacy-ca") return <CaliforniaPrivacy />;
  return <DoNotSell />;
}
