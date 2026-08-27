import { useState, type FormEvent } from "react";
import { Link } from "react-router-dom";
import { LegalArticle, legalA, legalP, legalUl, useLegalMeta } from "./legalLayout";

const ROLES = [
  "Investor",
  "Vendor",
  "Employee",
  "Marketing Recipient",
  "Authorized Agent/Parent",
  "Job Applicant",
  "Other",
];

const REQUESTS = [
  "Tell me more about the data you collect, disclose, and/or sell",
  "Provide me with a copy of my personal information that you have collected (California Residents)",
  "Delete my personal information (California Residents)",
  "Do not sell my personal information (California Residents)",
  "Other",
];

export function DoNotSell() {
  const { brand, email, address, phone } = useLegalMeta();
  const [sent, setSent] = useState(false);

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const lines = [
      `First Name: ${fd.get("first_name") || ""}`,
      `Last Name: ${fd.get("last_name") || ""}`,
      `Email: ${fd.get("email") || ""}`,
      `Phone: ${fd.get("phone") || ""}`,
      `I am a: ${fd.get("role") || ""}`,
      `Type of Privacy Request: ${fd.get("request_type") || ""}`,
      `Message: ${fd.get("message") || ""}`,
    ];
    const href = `mailto:${email}?subject=${encodeURIComponent("CCPA Privacy Request")}&body=${encodeURIComponent(lines.join("\n"))}`;
    window.location.href = href;
    setSent(true);
  }

  return (
    <LegalArticle title="Do Not Sell My Personal Information">
      <p className="mt-4 italic">For California Residents Only</p>
      <p className={legalP}>
        Under the California Consumer Privacy Act (CCPA), California residents have certain rights regarding the
        personal information that businesses can collect, use, maintain, and/or disclose. This includes the right to
        request access or deletion of your personal information, as well as the right to direct a business to stop
        selling your personal information.
      </p>
      <p className={legalP}>
        {brand} does not sell your personal information to third parties. Our Privacy Policy describes the limited
        circumstances in which we may share your information with third parties outside of {brand}. This page has been
        provided to make it easier for you to understand and exercise your rights.
      </p>
      <p className={legalP}>
        <Link className={legalA} to="/privacy">
          Read Our Privacy Policy
        </Link>
      </p>
      <p className={legalP}>
        <Link className={legalA} to="/privacy-ca">
          Read Our Privacy Policy for California Residents
        </Link>
      </p>
      <p className={legalP}>If you would like to exercise any of your other California Consumer Privacy Rights, you may:</p>
      <ul className={legalUl}>
        <li>Complete the form below</li>
        {phone ? <li>Call us at {phone}</li> : null}
        <li>
          Email us at{" "}
          <a className={legalA} href={`mailto:${email}`}>
            {email}
          </a>
        </li>
        {address ? (
          <li>
            Write to us at:
            <p className="mt-2 pl-2">
              {brand}
              <br />
              Data Privacy/Compliance
              <br />
              {address}
            </p>
          </li>
        ) : null}
      </ul>

      <form className="mt-8 flex max-w-xl flex-col gap-4" onSubmit={onSubmit} data-testid="ccpa-request-form">
        <label className="flex flex-col gap-1 text-sm">
          First Name
          <input name="first_name" required className="rounded border border-neutral-300 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Last Name
          <input name="last_name" required className="rounded border border-neutral-300 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Email
          <input name="email" type="email" required className="rounded border border-neutral-300 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Phone
          <input name="phone" className="rounded border border-neutral-300 bg-white px-3 py-2" />
        </label>
        <label className="flex flex-col gap-1 text-sm">
          I am a
          <select name="role" required defaultValue="" className="rounded border border-neutral-300 bg-white px-3 py-2">
            <option value="" disabled>
              Select…
            </option>
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Type of Privacy Request
          <select
            name="request_type"
            required
            defaultValue=""
            className="rounded border border-neutral-300 bg-white px-3 py-2"
          >
            <option value="" disabled>
              Select…
            </option>
            {REQUESTS.map((r) => (
              <option key={r} value={r}>
                {r}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 text-sm">
          Message
          <textarea name="message" rows={5} className="rounded border border-neutral-300 bg-white px-3 py-2" />
        </label>
        <button type="submit" className="self-start rounded bg-gold px-4 py-2 text-sm font-semibold text-white">
          Submit
        </button>
        {sent ? (
          <p className="text-sm text-neutral-600" data-testid="ccpa-request-sent">
            Your mail client should open with this request addressed to {email}. If it does not, email us directly.
          </p>
        ) : null}
      </form>
    </LegalArticle>
  );
}
