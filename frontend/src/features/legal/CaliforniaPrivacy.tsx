import { Link } from "react-router-dom";
import { LegalArticle, legalA, legalH2, legalP, legalUl, useLegalMeta } from "./legalLayout";

const CATEGORIES = [
  "Identifiers",
  "Additional Data Subject to Cal. Civ. Code § 1798.80",
  "Protected Classifications",
  "Commercial Information",
  "Online Activity",
  "Geolocation Data",
  "Sensory Information",
  "Employment Information",
  "Education Information",
  "Inferences",
];

const THIRD_PARTIES = [
  "Our affiliates",
  "Vendors who provide services on our behalf",
  "Industry trade associations and other third parties we use to support our business",
  "Our joint marketing and business partners",
  "Online advertising services",
  "Data analytics providers",
  "Social networks",
  "ISPs and operating systems and platforms",
  "Data brokers, such as credit bureaus, credit reporting service providers, background check services",
];

export function CaliforniaPrivacy() {
  const { brand, email, address, phone } = useLegalMeta();

  return (
    <LegalArticle title="Privacy Policy for California Residents">
      <p className="mt-4">
        <strong>Effective Date:</strong> January 1, 2020
      </p>
      <p className={legalP}>
        <strong>Last Updated:</strong> August 2026
      </p>
      <p className={legalP}>
        This Privacy Policy for California Residents supplements {brand}’s general{" "}
        <Link className={legalA} to="/privacy">
          Privacy Policy
        </Link>{" "}
        and applies solely to personal information collected about California consumers, such as our customers, website
        visitors, business partners and job applicants. This Privacy Policy for California Residents does not apply to
        personal information collected about {brand} personnel.
      </p>
      <p className={legalP}>
        This Privacy Policy for California Residents uses certain terms that have the meaning given to them in the
        California Consumer Privacy Act of 2018 (as amended by the California Privacy Rights Act of 2020) and its
        implementing regulations (collectively, the “CCPA”).
      </p>

      <h2 className={legalH2}>Notice of Collection and Use of Personal Information</h2>
      <p className={legalP}>
        We may collect (and may have collected during the 12-month period prior to the Last Updated date of this
        Privacy Policy for California Residents) the following categories of personal information about you:
      </p>
      <ul className={legalUl}>
        <li>
          <strong>Identifiers:</strong> identifiers such as a real name, alias, postal address, unique personal
          identifier (such as a device identifier; cookies, beacons, pixel tags, mobile ad identifiers, and similar
          technology; customer number, unique pseudonym, or user alias; telephone number and other forms of persistent
          or probabilistic identifiers), online identifier, IP address, email address, account name, and other similar
          identifiers
        </li>
        <li>
          <strong>Additional Data Subject to Cal. Civ. Code § 1798.80:</strong> signature, state identification card
          number, education information, and medical information.
        </li>
        <li>
          <strong>Protected Classifications:</strong> characteristics of protected classifications under California or
          federal law, such as race, color, national origin, religion, age, sex, gender, gender identity, gender
          expression, sexual orientation, marital status, medical condition, ancestry, genetic information, disability,
          citizenship status, and military and veteran status.
        </li>
        <li>
          <strong>Commercial Information:</strong> commercial information, including records of personal property,
          products or services purchased, obtained, or considered, and other purchasing or consuming histories or
          tendencies.
        </li>
        <li>
          <strong>Online Activity:</strong> Internet and other electronic network activity information, including, but
          not limited to, browsing history, search history, and information regarding your interaction with websites,
          applications or advertisements.
        </li>
        <li>
          <strong>Geolocation Data</strong>
        </li>
        <li>
          <strong>Sensory Information:</strong> audio, electronic, visual, and similar information.
        </li>
        <li>
          <strong>Employment Information:</strong> professional or employment-related information such as résumé
          information, occupation details, education details, certifications and professional associations, historical
          compensation details, previous employment details, emergency contact information, and pre-employment
          screening and background check information, including criminal records information.
        </li>
        <li>
          <strong>Education Information:</strong> education information that is not publicly available personally
          identifiable information as defined in the Family Educational Rights and Privacy Act (20 U.S.C. Sec. 1232g;
          34 C.F.R. Part 99).
        </li>
        <li>
          <strong>Inferences:</strong> inferences drawn from any of the information identified above to create a
          profile about you reflecting your preferences, characteristics, psychological trends, predispositions,
          behavior, attitudes, intelligence, abilities, and aptitudes.
        </li>
      </ul>
      <p className={legalP}>
        We may use (and may have used during the 12-month period prior to the Last Updated date of this Privacy Policy
        for California Residents) your personal information for the purposes described in the {brand} Privacy Policy
        and for the following business purposes:
      </p>
      <ul className={legalUl}>
        <li>
          Performing services, including maintaining or servicing accounts, providing customer service, processing or
          fulfilling orders and transactions, verifying customer information, processing payments, providing financing,
          providing analytics services, providing storage, or providing similar services;
        </li>
        <li>Providing advertising and marketing services;</li>
        <li>
          Auditing related to counting ad impressions to unique visitors, verifying positioning and quality of ad
          impressions, and auditing compliance;
        </li>
        <li>Short-term, transient use, such as nonpersonalized advertising shown as part of your current interaction with us;</li>
        <li>Helping to ensure security and integrity;</li>
        <li>
          Undertaking activities to verify or maintain the quality or safety of our services or devices and to improve,
          upgrade, or enhance them;
        </li>
        <li>Debugging to identify and repair errors;</li>
        <li>Undertaking internal research for technological development and demonstration;</li>
        <li>Managing career opportunities with us; and</li>
        <li>
          Managing our relationships with current or prospective partners, corporate customers, industry trade
          associations, and vendors and other business partner personnel.
        </li>
      </ul>
      <p className={legalP}>
        We do not collect or process sensitive personal information for purposes of inferring characteristics about
        consumers.
      </p>
      <p className={legalP}>
        To the extent we process deidentified information, we will maintain and use the information in deidentified
        form and will not attempt to reidentify the information unless permitted by applicable law.
      </p>

      <h2 className={legalH2}>Retention of Personal Information</h2>
      <p className={legalP}>
        We will retain your personal information for the time period reasonably necessary to achieve the purposes
        described in the {brand} Privacy Policy and this Privacy Policy for California Residents, or any other notice
        provided at the time of collection, taking into account applicable statutes of limitation and records retention
        requirements under applicable law.
      </p>

      <h2 className={legalH2}>Sources of Personal Information</h2>
      <p className={legalP}>
        During the 12-month period prior to the Last Updated date of this Privacy Policy for California Residents, we
        may have obtained personal information about you from the following categories of sources:
      </p>
      <ul className={legalUl}>
        <li>Directly from you, such as when you contact us</li>
        <li>Your devices, such as when you use our Website</li>
        <li>Our affiliates</li>
        <li>Service providers, contractors and other vendors who provide services on our behalf</li>
        <li>
          <strong>Our joint marketing and business partners</strong>
        </li>
        <li>Online advertising services</li>
        <li>Data analytics providers</li>
        <li>Internet service providers (“ISPs”)</li>
        <li>Operating systems and platforms</li>
        <li>Social networks</li>
        <li>Recruiting and talent agencies</li>
        <li>Job references, such as your employers or teachers</li>
        <li>Data brokers, such as public databases, credit bureaus, credit reporting service providers and background check services</li>
      </ul>

      <h2 className={legalH2}>Sale or Sharing of Personal Information</h2>
      <p className={legalP}>
        We may share your personal information by disclosing it to a third party for a business purpose. We only make
        these business purpose disclosures under written contracts that describe the purposes, require the recipient to
        keep the personal information confidential, and prohibit using the disclosed information for any purpose except
        performing the contract.
      </p>
      <p className={legalP}>
        We may also share your personal information by allowing certain third parties (such as online advertising
        services) to collect personal information via automated technologies on our websites for cross-context
        behavioral advertising purposes. This kind of sharing may be considered a “sale” under California law when the
        personal information is exchanged for non-monetary consideration. You have the right to opt out of these types
        of disclosures of your information.
      </p>
      <p className={legalP}>
        We may sell or share for cross-context behavioral advertising purposes (and may have sold or shared during the
        12-month period prior to the Last Updated date of this Privacy Policy for California Residents) the following
        categories of personal information about you to online advertising services:
      </p>
      <ul className={legalUl}>
        <li>Identifiers</li>
        <li>Commercial Information</li>
        <li>Online Activity</li>
        <li>Inferences</li>
      </ul>
      <p className={legalP}>
        You have the right to opt-out of this disclosure of your information, as detailed below. We do not have actual
        knowledge that we sell or share the personal information of minors under 18 years of age.
      </p>

      <h2 className={legalH2}>Disclosure of Personal Information</h2>
      <p className={legalP}>
        During the 12-month period prior to the Last Updated date of this Privacy Policy for California Residents, we
        may have disclosed the following categories of personal information about you for the business purposes
        described above to the following categories of third parties:
      </p>
      <div className="mt-4 overflow-x-auto">
        <table className="w-full border-collapse text-sm">
          <thead>
            <tr>
              <th className="border border-neutral-300 bg-chip px-3 py-2 text-left font-semibold">
                Category of Personal Information
              </th>
              <th className="border border-neutral-300 bg-chip px-3 py-2 text-left font-semibold">
                Categories of Third Parties
              </th>
            </tr>
          </thead>
          <tbody>
            {CATEGORIES.map((cat) => (
              <tr key={cat}>
                <td className="border border-neutral-300 px-3 py-2 align-top font-medium">{cat}</td>
                <td className="border border-neutral-300 px-3 py-2 align-top">
                  <ul className="list-disc space-y-1 pl-5">
                    {THIRD_PARTIES.map((p) => (
                      <li key={p}>{p}</li>
                    ))}
                  </ul>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className={legalP}>
        In addition to the categories of third parties identified above, during the 12-month period prior to the Last
        Updated date of this Privacy Policy for California Residents, we may have disclosed personal information about
        you to government entities and third parties in connection with corporate transactions, such as mergers,
        acquisitions or divestitures.
      </p>

      <h2 className={legalH2}>California Consumer Privacy Rights</h2>
      <p className={legalP}>You have certain choices regarding your personal information, as described below.</p>
      <ul className={legalUl}>
        <li>
          <strong>Access:</strong> You have the right to request, twice in a 12-month period, that we disclose to you
          the personal information we have collected, used, disclosed, and sold or shared about you. If you are
          exercising this right for a time period greater than the immediately preceding 12 month period to your
          request, please indicate the relevant time period for your request.
        </li>
        <li>
          <strong>Correction:</strong> You have the right to request that we correct the personal information we
          maintain about you, if that information is inaccurate.
        </li>
        <li>
          <strong>Deletion:</strong> You have the right to request that we delete certain personal information we have
          collected from you.
        </li>
        <li>
          <strong>Opt-Out of Sale or Sharing:</strong> You have the right to opt-out of the sale of your personal
          information or the sharing of your personal information for cross-context behavioral advertising purposes.
          You may also request that we confirm your request to opt-out of the sale of your personal information or the
          sharing of your personal information for cross-context behavioral advertising purposes has been honored.
        </li>
        <li>
          <strong>Shine the Light Request:</strong> You also may have the right to request that we provide you with (a)
          a list of certain categories of personal information we have disclosed to third parties for their direct
          marketing purposes during the immediately preceding calendar year and (b) the identity of those third
          parties.
        </li>
      </ul>
      <p className={legalP}>
        <strong>How to Submit a Request.</strong> To exercise your rights as described above, please submit a request
        by either:
      </p>
      <ul className={legalUl}>
        {phone ? <li>Calling us at {phone}</li> : null}
        <li>
          Emailing us at{" "}
          <a className={legalA} href={`mailto:${email}`}>
            {email}
          </a>
          .
        </li>
        <li>
          Submitting the form on our{" "}
          <Link className={legalA} to="/do-not-sell">
            Do Not Sell My Personal Information
          </Link>{" "}
          page.
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
      <p className={legalP}>
        You can opt-out of the sale or sharing of your personal information by clicking{" "}
        <Link className={legalA} to="/do-not-sell">
          here
        </Link>
        . To submit a request as an authorized agent on behalf of a consumer, please select “Authorized Agent/Parent”
        on the request form. For questions or concerns about our privacy policies and practices, please contact us as
        described in the “Contact Us” section of the {brand}{" "}
        <Link className={legalA} to="/privacy">
          Privacy Policy
        </Link>
        .
      </p>
      <p className={legalP}>
        <strong>Verifying Requests.</strong> To help protect your privacy and maintain security, we will take steps to
        verify your identity before granting you access to your personal information or complying with your deletion or
        correction request. If you have a {brand} account with us, we may verify your identity by requiring you to sign
        in to your account. If you do not have a {brand} account with us and you request access to, correction of or
        deletion of your personal information, we may require you to verify your email address or phone number in our
        records and/or provide any of the following information:
      </p>
      <ul className={legalUl}>
        <li>Contact information (such as name, email, and phone number); and</li>
        <li>
          An indication of your prior contact with {brand} (such as whether you are an Investor, Vendor, Marketing
          Recipient or Job Applicant).
        </li>
      </ul>
      <p className={legalP}>
        In addition, if you ask us to provide you with specific pieces of personal information, we may require you to
        sign a declaration under penalty of perjury that you are the consumer whose personal information is the subject
        of the request.
      </p>
      <p className={legalP}>
        <strong>Additional Information.</strong> If you choose to exercise any of your rights under the CCPA, you have
        the right to not receive discriminatory treatment by us. To the extent permitted by applicable law, we may
        charge a reasonable fee to comply with your request.
      </p>
    </LegalArticle>
  );
}
