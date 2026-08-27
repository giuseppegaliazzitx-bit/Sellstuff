import { Link } from "react-router-dom";
import { LegalArticle, legalA, legalH2, legalP, legalUl, useLegalMeta } from "./legalLayout";

export function TermsOfUse() {
  const { brand, email, address, state, cfg } = useLegalMeta();

  return (
    <LegalArticle title="Terms of Use">
      <p className="mt-4">Last Modified: August 27, 2026</p>
      <p className={legalP}>Version {cfg.terms_version}.</p>
      <p className={legalP}>
        Thank you for your interest in {brand} (“{brand},” “us,” “our,” or “we”). By agreeing, submitting your
        information, and using our websites (“Website”) to access content provided by us (“Services”), you (“User” or
        “you”) agree to be bound by the following terms of use, as updated from time to time (the “Terms of Use”). If
        you do not agree to be bound by these Terms of Use, you are not authorized to use the Website or to obtain
        Services from {brand}.
      </p>
      <p className={legalP}>
        By using or attempting to use this Website, you certify to {brand} that you are a resident of the United States
        or otherwise authorized to conduct business in the United States, and are at least 18 years of age or older and
        have the legal capacity to agree to these Terms of Use.
      </p>

      <h2 className={legalH2}>1. {brand}’s Role</h2>
      <p className={legalP}>
        NO associates at {brand} REPRESENT you in any capacity. It is the sole responsibility of User to conduct its
        own due diligence in any business dealings. Any content published on our Website does not constitute a contract
        or create any type of contractual obligation between {brand} and User and said content may not constitute the
        most up-to-date information. The information provided on the Website does not, and is not intended to,
        constitute legal, financial, or investing advice.
      </p>

      <h2 className={legalH2}>2. Real Estate Investment Risk</h2>
      <p className={legalP}>
        {brand} is involved with investment real estate. Real estate investing involves varying degrees of risk, and it
        is the sole responsibility of User to do all due diligence concerning any potential purchase of real estate.
        User acknowledges that the RISK OF LOSS in real estate investing can be substantial, that real estate
        investment is SPECULATIVE by its nature, and that {brand} does not guarantee any investment will be profitable.
      </p>

      <h2 className={legalH2}>3. Website Content</h2>
      <p className={legalP}>
        The content contained on the Website is provided “AS-IS” and provided for your convenience only. No
        representations are made that the content is error-free including, but not limited to, any information
        regarding specifications, characteristics or the condition of a property. All liability with respect to actions
        taken or not taken based on the content contained on the Website are hereby expressly disclaimed and User
        waives User’s right to assert any such actions. Any estimates, information provided, or photographs/video
        showing the condition of the property are for your convenience only. In addition, {brand}, its affiliates and
        licensors disclaim all warranties, express or implied, statutory or otherwise, including but not limited to the
        implied warranties of merchantability, non-infringement and fitness for a particular purpose. Any information
        regarding specifications, characteristics, or condition of this property, neighborhood, or investment strategy
        (including, but not limited to, estimated rehab costs, as-is property square footage measurements, or proposed
        expansion through construction) is an unverified assumption based on limited information and must be verified
        independently for accuracy. {brand} and its affiliates assume no liability whatsoever for the accuracy of any
        estimates, information, or photo/video provided. You are required to conduct your own due diligence.
      </p>

      <h2 className={legalH2}>4. Affiliates and Subsidiaries</h2>
      <p className={legalP}>
        By consenting to communications from or with {brand} it may include communication with any of {brand}’s
        affiliates, subsidiaries, and commonly owned entities. User acknowledges that information may be shared among
        these entities.
      </p>

      <h2 className={legalH2}>5. Consent to Communications</h2>
      <p className={legalP}>
        Any email message or other electronic message and the contents thereof are intended solely for the addressee.
        User acknowledges that information within any email message may be legally PRIVILEGED AND CONFIDENTIAL. You may
        not reproduce, disseminate, or forward the contents of any electronic transmission received from {brand} without
        the express written consent of {brand}.
      </p>
      <p className={legalP}>
        User acknowledges that any contact information provided to {brand} will be for BUSINESS PURPOSES. The contact
        information provided to {brand} should not be for personal, family, household, or consumer purposes.
      </p>
      <p className={legalP}>
        <strong>Phone Calls and SMS/MMS Text Messages:</strong> If you have provided a phone number, you consent to
        receive calls and SMS/MMS text messages from {brand}, that consent is exclusive to {brand} and its partners,
        subsidiaries, and affiliates, and is collected solely for the purpose of obtaining your permission to call or
        text you as part of providing you with the Services or to send you marketing messages as described within this{" "}
        <Link className={legalA} to="/privacy">
          Privacy Policy
        </Link>
        . By using the Services and/or creating an account with {brand}, User expressly consents to {brand} contacting
        the User at the number(s) they have provided, or will provide, for marketing purposes, including through the
        use of automated dialing technology, prerecorded or artificial voice, ringless voicemail, and SMS/MMS text
        messages. You acknowledge that your consent is not required to obtain any good or service. Message and data
        rates may apply. You may opt out of receiving SMS/MMS marketing text messages at any time. To opt-out at any
        time reply “STOP” to any marketing text messages or revoke your consent over the phone. For assistance, please
        refer to our{" "}
        <Link className={legalA} to="/privacy">
          Privacy Policy
        </Link>
        .
      </p>
      <p className={legalP}>
        <strong>Marketing:</strong> We may send marketing materials to you using various communication channels,
        including without limitation, email, SMS/MMS text messages, push notifications, telephone calls, and direct
        mail. Users may also subscribe to Alert Emails or other notifications with information such as customized
        summaries of available opportunities. {brand} may send you current or past completed or available opportunities
        in accordance with applicable law.
      </p>

      <h2 className={legalH2}>6. Interest Advertised</h2>
      <p className={legalP}>
        {brand}’s clients (“Client”) are real estate investors and are the sellers of their interest in properties
        offered. The Client may hold legal title or may have an equitable interest in the property through a contract
        or assignment to purchase the property on a future date and may or may not hold legal title to the property at
        the time the property is sold to the User. In all transactions, Client is marketing and selling or assigning
        its legal or equitable interest in the property to the User to make a profit. User shall not access any
        property without being accompanied by a {brand} representative.
      </p>

      <h2 className={legalH2}>7. Property Condition</h2>
      <p className={legalP}>
        User is fully aware that purchases are made AS-IS. Due to the nature of the transaction, the seller will have
        no knowledge about the condition of the property and cannot provide its own Seller’s Property Disclosure form.
        Seller will provide to you the Seller’s Property Disclosure form if seller received the same from seller’s
        vendor. The condition of the property is SOLELY User’s responsibility to discover.
      </p>

      <h2 className={legalH2}>8. Non-Circumvention</h2>
      <p className={legalP}>
        The identities of any individual and/or entity made available through the Website or introduced to you by{" "}
        {brand} (“{brand} Contacts”) and any information relating to any real property made available through {brand}’s
        Website is confidential and proprietary. User and User’s agents, representatives, and assigns shall not use the
        content on the Website to discover additional information about the property including, but not limited to, the
        owner or address of the property and shall not, for a period of two (2) years, initiate, solicit, negotiate, or
        enter into a contract for real estate with any {brand} Contact or seek to by-pass, compete with, exploit, avoid
        or circumvent {brand} from any business opportunity by utilizing any {brand} Contacts, any content on, or
        derived from, the Website, or confidential or proprietary information obtained from {brand} or the Website to{" "}
        {brand}’s detriment.
      </p>
      <p className={legalP}>
        User agrees that any liability or claim arising out of or in connection with a BREACH OF ITS OBLIGATIONS under
        this section is difficult to estimate in light of any probable loss and difficulties of proof of loss and the
        inconvenience or nonfeasibility of otherwise obtaining an adequate remedy. Upon breach of this Section, User
        agrees that User shall be liable for an amount equal to TWENTY-FIVE THOUSAND DOLLARS ($25,000.00) per
        occurrence and that {brand} shall be entitled to recover all reasonable attorney fees and costs incurred as a
        result of User’s breach.
      </p>

      <h2 className={legalH2}>9. Non-Solicitation</h2>
      <p className={legalP}>
        {brand} has expended and continues to expend significant time and expense on its personnel and the loss of
        personnel would cause significant and irreparable harm to {brand}. User agrees NOT TO, for a period of two (2)
        years, directly or indirectly SOLICIT, hire, recruit, or attempt to solicit, hire, or recruit, any {brand}{" "}
        personnel.
      </p>

      <h2 className={legalH2}>10. Use of the Services; Restrictions</h2>
      <p className={legalP}>
        As long as you comply with these Terms of Use, we grant you a non-exclusive, limited, revocable, personal,
        non-transferable license to use the Services. Except as expressly stated herein, these Terms of Use do not
        provide you with a license to use, reproduce, distribute, display or provide access to any portion of the
        Services on third-party web sites or otherwise. User acknowledges that User is using Services and purchasing
        the Property for a BUSINESS PURPOSE. You will not occupy the Property and are not purchasing the Property for
        personal, family, household, or consumer purposes.
      </p>

      <h2 className={legalH2}>11. Prohibited Use</h2>
      <p className={legalP}>
        You may use the Services provided by {brand} only for lawful purposes and in accordance with these Terms of
        Use. BY USING THE SERVICES, YOU AGREE NOT TO:
      </p>
      <ul className={legalUl}>
        <li>use the Services in any way that violates any federal, state, local, or international law or regulation;</li>
        <li>
          spam or distribute malware, or transmit or cause to be transmitted any viruses, worms, Trojan horses, time
          bombs, cancel bots, pyramid schemes or any other harmful, damaging or destructive programs or content;
        </li>
        <li>
          reproduce, modify, distribute, display or otherwise provide access to, create derivative works from,
          decompile, disassemble, or reverse engineer any portion of the Services, except as explicitly permitted by{" "}
          {brand};
        </li>
        <li>
          automatedly crawl or query the Services for any purpose or by any means (including, without limitation,
          screen and database scraping, spiders, robots, crawlers and any other automated activity with the purpose of
          obtaining information from the Services) unless you have received prior express written permission from{" "}
          {brand};
        </li>
        <li>
          offer or sell any product or service in direct competition with any property or Service currently offered by{" "}
          {brand} or solicit any current customer of {brand}, the result of which is that {brand}’s business with such
          customer is harmed;
        </li>
        <li>
          interfere with, or compromise the system integrity or security of the Services, or otherwise bypass any
          measures we may use to prevent or restrict access to the Services;
        </li>
        <li>access or use any of the Services to develop competitive products or services; or</li>
        <li>attempt to, or permit or encourage any third party to, do any of the above.</li>
      </ul>

      <h2 className={legalH2}>12. Intellectual Property Rights</h2>
      <p className={legalP}>
        The Website and its entire contents, features, and functionality (including but not limited to all information,
        software, text, displays, images, video, and audio, and the design, selection, and arrangement thereof) are
        owned by {brand}, its licensors, or other provider of such material, and are protected by United States and
        international copyright, trademark, patent, trade secret, and other intellectual property or proprietary rights
        laws. These Terms of Use permit you to use the Website for your own use and that of any entity you
        control/manage for real estate investing purposes. You must not reproduce, distribute, modify, create
        derivative works of, publicly display, publicly perform, republish, download, store, or transmit any of the
        material on our Website, except as outlined in this Terms of Use.
      </p>

      <h2 className={legalH2}>13. Disputes</h2>
      <p className={legalP}>
        Any dispute, claim, or controversy that arises out of or is related to your use of the Website or these Terms
        of Use (“Claim”) including, but not limited to, the arbitrability of any such Claims, shall be determined
        exclusively by submitting such Claims to binding arbitration by a single arbitrator under the Federal
        Arbitration Act (“FAA”). Claims include all disputes, whether based on tort, contract, statute, regulation,
        ordinance, or code, in equity, or otherwise, except provisional remedies including, but not limited to,
        injunctive relief from a court of law. Arbitration shall proceed under the then-current rules for commercial
        disputes with the American Arbitration Association (“AAA”) and shall occur in the State of {state}. Judgment
        upon the award may be entered in any court having jurisdiction and the award may be vacated or modified only on
        the grounds provided by the FAA or other applicable law. Any up-front fees payable to arbitrator shall be
        divided equally between the Parties unless otherwise agreed upon by the Parties or provided by the AAA rules
        and each Party shall be responsible for its own costs, fees, and expenses, including attorneys’ fees, regardless
        of which Party prevails, unless such dispute arises from a claim that is deemed to be baseless or frivolous.
        THE PARTIES FURTHER AGREE TO IRREVOCABLY WAIVE THEIR RIGHT TO A TRIAL BY JURY FOR ANY AND ALL CLAIMS AND THAT
        NEITHER PARTY WILL ASSERT AND, EACH SPECIFICALLY WAIVES THE RIGHT TO ASSERT, CLASS OR COLLECTIVE ACTION CLAIMS
        AGAINST THE OTHER IN ARBITRATION OR OTHERWISE.
      </p>

      <h2 className={legalH2}>14. Indemnification</h2>
      <p className={legalP}>
        You agree to defend, indemnify and hold harmless {brand}, its affiliates, licensors and service providers, and
        its and their respective officers, directors, employees, contractors, agents, licensors, suppliers, successors
        and assigns from and against any claims, liabilities, damages, judgments, awards, losses, costs, expenses or
        fees (including reasonable attorneys’ fees) arising out of or relating to: (i) your violation of these Terms of
        Use or any use of the Website or its content which is not expressly authorized in these Terms of Use; and (ii)
        your violations of federal, state or local law including, but not limited to, the Federal Telephone Consumer
        Protection Act and CAN-SPAM Act. {brand} reserves the right, at their own expense, to assume the exclusive
        defense and control of any matter otherwise subject to indemnification by you, and in that case, you agree to
        cooperate with {brand}’s defense of that claim.
      </p>

      <h2 className={legalH2}>15. Limitation of Liability / Exclusive Remedy</h2>
      <p className={legalP}>
        TO THE MAXIMUM EXTENT PERMITTED BY APPLICABLE LAW, IN NO EVENT WILL {brand.toUpperCase()} OR ANY OF THEIR
        AGENTS, AFFILIATES, EMPLOYEES, DIRECTORS, OFFICERS OR REPRESENTATIVES BE LIABLE FOR ANY INDIRECT, CONSEQUENTIAL,
        SPECIAL, INCIDENTAL, OR PUNITIVE DAMAGES (INCLUDING DAMAGES FOR LOSS OF PROFITS, GOODWILL, OR ANY OTHER
        INTANGIBLE LOSS) ARISING OUT OF, BASED ON, OR RESULTING FROM THESE TERMS OF USE OR YOUR USE OR ACCESS, OR
        INABILITY TO USE OR ACCESS, THE SERVICES WHETHER BASED ON: (A) BREACH OF CONTRACT; (B) BREACH OF WARRANTY; (C)
        NEGLIGENCE; OR (D) ANY OTHER CAUSE OF ACTION. {brand.toUpperCase()} ASSUMES NO LIABILITY OR RESPONSIBILITY FOR
        ANY (I) ERRORS, MISTAKES, OR INACCURACIES OF THE INFORMATION ON THE WEBSITE; (II) ANY UNAUTHORIZED ACCESS TO OR
        USE OF OUR SECURE SERVERS AND/OR ANY AND ALL PERSONAL INFORMATION STORED THEREIN; (III) ANY INTERRUPTION OR
        CESSATION OF TRANSMISSION TO OR FROM THE SERVICES; (IV) ANY BUGS, VIRUSES, TROJAN HORSES, OR THE LIKE THAT MAY
        BE TRANSMITTED TO OR THROUGH OUR SERVICES BY ANY THIRD PARTY; (V) ANY ERRORS OR OMISSIONS IN ANY INFORMATION ON
        THE WEBSITE OR FOR ANY LOSS OR DAMAGE INCURRED AS A RESULT OF THE USE OF SUCH INFORMATION; OR (VI) USER
        INFORMATION OR THE DEFAMATORY, OFFENSIVE, OR ILLEGAL CONDUCT OF USER OR ANY THIRD PARTY. THE AGGREGATE
        LIABILITY OF {brand.toUpperCase()} AND ANY OF OUR AFFILIATES TO YOU FOR ALL CLAIMS ARISING OUT OF OR RELATING TO
        THE USE OF, OR INABILITY TO USE, ANY PORTION OF THE SERVICES OR OTHERWISE UNDER THESE TERMS OF USE, WHETHER
        UNDER CONTRACT, TORT, OR OTHERWISE, IS LIMITED TO $100.
      </p>

      <h2 className={legalH2}>16. Choice of Law</h2>
      <p className={legalP}>
        These Terms of Use are governed by the laws of the State of {state}, without giving effect to its conflict of
        laws provisions.
      </p>

      <h2 className={legalH2}>17. Privacy Policy</h2>
      <p className={legalP}>
        {brand} will collect, use, store, and disclose personal information in accordance with our Privacy Policy.
        Please consult our{" "}
        <Link className={legalA} to="/privacy">
          Privacy Policy
        </Link>{" "}
        for more information.
      </p>

      <h2 className={legalH2}>18. External Links</h2>
      <p className={legalP}>
        The Services include links to third-party products, services, and websites, as well as materials provided by
        third parties, and may include functionality that allows for the distribution of your User Materials or your
        personal information (collectively, your “User Information”) to third parties not under our control (each, a
        “Third-Party Provider”). Third-Party Providers are solely responsible for their services. You are responsible
        for your use and submission of User Information to any third party, and your dealings or business conducted
        with any third party arising in connection with the Services are solely between you and such third party. Your
        use of third-party sites, services, or products may be subject to associated third-party terms of use and
        privacy policies or other agreements, which you are solely responsible for complying with. We do not endorse,
        and take no responsibility for such products, services, web sites, and materials, or a Third-Party Provider’s
        use of your User Information. By using a tool that allows for User Information to be transferred, you agree
        that we may transfer the applicable User Information or other information to the applicable third-parties,
        which are not under our control. If you submit a contact form or otherwise indicate your interest in contacting
        a Third-Party Provider, you may receive telemarketing calls from the Third-Party Provider using the contact
        information you provided. Third-Party Providers may keep your contact information and any other information
        received by the Third-Party Provider in processing a contact or other request form. We are not responsible for
        any damages or costs of any type arising out of or in any way connected with your dealings with Third-Party
        Providers.
      </p>

      <h2 className={legalH2}>19. Severability</h2>
      <p className={legalP}>
        If any provision of the Terms of Use is found by a court of competent jurisdiction or arbitrator to be illegal,
        void, or unenforceable, the unenforceable provision will be modified so as to render it enforceable and
        effective to the maximum extent possible in order to affect the intention of the provision.
      </p>

      <h2 className={legalH2}>20. License Disclosures</h2>
      <p className={legalP}>
        Certain market activity may be conducted by licensed real estate professionals. Where a license number is
        required to be disclosed, that information is available upon request or as displayed on the applicable listing.
        Contact us using the information below for current license details.
      </p>

      <h2 className={legalH2}>21. Your Responsibility for Equipment and Related Costs</h2>
      <p className={legalP}>
        You are responsible for obtaining and maintaining all telephone, mobile, computer hardware, Internet access
        services and other equipment or services needed to access and use our Services, and all costs and fees
        associated with Internet access or long-distance charges incurred with regard to your access and use of our
        Services.
      </p>

      <h2 className={legalH2}>22. Changes to Terms of Use</h2>
      <p className={legalP}>
        These Terms of Use are complete and effective at the time you begin use of the Service. We reserve the right to
        revise these Terms of Use in our sole discretion and without notice to you. In the event that any
        inconsistencies exist between these Terms of Use and any future published terms or understandings, the last
        published terms of use shall control.
      </p>
      <p className={legalP}>
        Your continued use of the Website following the posting of revised Terms of Use means that you accept and agree
        to any changes. You are expected to check this page frequently so you are aware of any changes, as they are
        binding on you.
      </p>
      <p className={legalP}>
        <strong>ANY RIGHTS NOT EXPRESSLY GRANTED HEREIN ARE RESERVED BY {brand.toUpperCase()}.</strong>
      </p>

      <h2 className={legalH2}>23. Contact Information</h2>
      <p className={legalP}>
        If you have any questions or comments about this Terms of Use or {brand}’s privacy practices, wish to opt out
        of certain services, or to submit a data privacy request, please contact us:
      </p>
      <ul className={legalUl}>
        <li>
          Email us at{" "}
          <a className={legalA} href={`mailto:${email}`}>
            {email}
          </a>
          .
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
    </LegalArticle>
  );
}
