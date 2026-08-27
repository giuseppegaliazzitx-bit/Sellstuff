import { useState } from "react";
import { useConfig } from "../../shared/config";

type Notice = { slug: string; title: string; body: string };

export function dealDisclosures(brand: string): Notice[] {
  return [
    {
      slug: "verify-independently",
      title: "YOU MUST VERIFY ALL INFORMATION INDEPENDENTLY",
      body: `Any estimates, information provided, or photographs/video showing the condition of the property are for your convenience only. Any information regarding specifications, characteristics, or condition of this property, neighborhood, or investment strategy (including, but not limited to, estimated rehab costs, as-is property square footage measurements, or proposed expansion through construction) is an unverified assumption of the broker or its affiliates based on limited information and must be verified independently for accuracy. Broker and its affiliates assume no liability whatsoever for the accuracy of any estimates, information, or photo/video provided. Buyer is required to conduct their own due diligence.`,
    },
    {
      slug: "no-unaccompanied-entry",
      title: "NO UNACCOMPANIED ENTRY OF PROPERTY",
      body: `Broker and its affiliates do not give you authority, express or implied, to enter or access this property unaccompanied. Access to the property may only be obtained through scheduling a property inspection with a ${brand} agent or broker.`,
    },
    {
      slug: "non-representation",
      title: "NON-REPRESENTATION",
      body: "Broker, agent, and their affiliates DO NOT represent you.",
    },
    {
      slug: "risk-of-loss",
      title: "RISK OF LOSS",
      body: "Real estate investment is speculative in nature, and risk of loss can be substantial. The information provided here does not and is not intended to constitute legal, financial, tax, or real estate investing advice. You should educate yourself on the potential risks by consulting with legal counsel, CPA, tax consultant, or licensed real estate agent.",
    },
    {
      slug: "privileged-confidential",
      title: "PRIVILEGED & CONFIDENTIAL INFORMATION",
      body: `This Information contains privileged and confidential information. The material contained herein is not available to the Public and is only provided to ${brand} buyers through a ${brand} agent or broker.`,
    },
    {
      slug: "copyright-material",
      title: "COPYRIGHT MATERIAL",
      body: `All informational and marketing material provided to you is the proprietary property of ${brand} and protected by copyright under U.S. Copyright law. You may not copy, store, distribute, display, modify, create derivative works, sell, or transmit any part of this content without prior written permission of ${brand}.`,
    },
  ];
}

export function DealNotices({ extras = [] }: { extras?: Notice[] }) {
  const cfg = useConfig();
  const core = dealDisclosures(cfg.brand_name);
  const seen = new Set(core.map((n) => n.slug));
  const extra = extras.filter((n) => !seen.has(n.slug) && !core.some((c) => c.title === n.title));
  const all = [...core, ...extra];

  return (
    <div className="flex flex-1 flex-col px-3 pb-16 pt-4" data-testid="deal-notices">
      <h2 className="font-display text-xl font-semibold">Notices & Disclosures</h2>
      <div className="mt-3 flex flex-col">
        {all.map((n) => (
          <NoticeAccordion key={n.slug} notice={n} />
        ))}
      </div>
    </div>
  );
}

function NoticeAccordion({ notice }: { notice: Notice }) {
  const [open, setOpen] = useState(false);
  const headerId = `notice-${notice.slug}-header`;
  const contentId = `notice-${notice.slug}-content`;
  return (
    <div className="border-b border-amber-900/15">
      <h3>
        <button
          type="button"
          id={headerId}
          aria-expanded={open}
          aria-controls={contentId}
          className="flex w-full flex-row items-center justify-between gap-3 py-3 text-left"
          onClick={() => setOpen((v) => !v)}
        >
          <span className="text-sm font-semibold uppercase tracking-wide">{notice.title}</span>
          <svg
            viewBox="0 0 24 24"
            className={`h-5 w-5 shrink-0 fill-current transition-transform ${open ? "rotate-180" : ""}`}
            data-testid="styled-accordion-icon"
            aria-hidden
          >
            <path d="m7 10 5 5 5-5z" />
          </svg>
        </button>
      </h3>
      {open ? (
        <div id={contentId} role="region" aria-labelledby={headerId} className="pb-4 text-sm leading-6 text-neutral-600">
          {notice.body}
        </div>
      ) : null}
    </div>
  );
}
