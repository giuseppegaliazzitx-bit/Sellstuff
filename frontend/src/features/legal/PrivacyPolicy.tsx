import { Link } from "react-router-dom";
import { useConfig } from "../../shared/config";

function siteHref(domain: string) {
  if (domain.startsWith("http://") || domain.startsWith("https://")) return domain;
  const host = domain || "localhost";
  return host === "localhost" || host.startsWith("127.") || host.startsWith("localhost:")
    ? `http://${host}`
    : `https://${host}`;
}

export function PrivacyPolicy() {
  const cfg = useConfig();
  const brand = cfg.footer_legal_name || cfg.brand_name;
  const host = cfg.domain || "localhost";
  const href = siteHref(host);
  const email = cfg.support_email || `privacy@${host}`;
  const address = cfg.mailing_address;

  return (
    <article className="mx-auto max-w-3xl px-4 py-16 text-left text-base leading-[1.5] text-neutral-800">
      <h1 className="text-3xl font-semibold tracking-tight">Privacy Policy</h1>
      <p className="mt-4">Last modified: August 27, 2026</p>

      <h2 className="mt-8 text-xl font-semibold">Overview</h2>
      <p className="mt-3">
        {brand} (<strong>“{brand}”</strong> or <strong>“Company”</strong> or <strong>“We”</strong>) values your
        privacy. This policy describes the privacy practices of {brand} and types of information we may collect from
        you or that you may provide when you visit our website{" "}
        <a className="text-gold underline" href={href}>
          {host}
        </a>{" "}
        (our <strong>“Website”</strong>), or email or text us, and how we collect, use, maintain, protect, and disclose
        that information.
      </p>
      <p className="mt-3">This policy applies to:</p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          All products and services owned and operated by {brand}, including content, features, data, and software
          available on the Website and other websites and applications that we operate.
        </li>
        <li>Information we collect on the Website.</li>
        <li>Information we collect through email, text, and other electronic messages between you and our Website.</li>
        <li>
          Information we collect when you interact with our advertising and applications through our Website and/or
          other third-party websites.
        </li>
      </ul>
      <p className="mt-3">It does not apply to information collected by:</p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>Us offline or through any other means.</li>
        <li>
          Any outside third parties, including through any application or content (including advertising) that may link
          to or be accessible from or on the Website.
        </li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Children’s Privacy – Children Under the Age of 18</h2>
      <p className="mt-3">
        Our Website is not intended for children under 18 years of age. We do not knowingly collect personal information
        from children under 18. If you are under 18, do not use or provide any information on our Website on or through
        any of its features or provide any information about yourself to us, including your name, address, telephone
        number, email address, or any screen name or user name you may use. If we learn we have collected or received
        personal information from a child under 18 without verification of parental consent, we will delete that
        information. If you believe we might have any information from or about a child under 18, please contact us at{" "}
        <a className="text-gold underline" href={`mailto:${email}`}>
          {email}
        </a>
        .
      </p>

      <h2 className="mt-8 text-xl font-semibold">Information We Collect About You and How We Collect It</h2>
      <p className="mt-3">
        <strong>Types of Information We Collect.</strong> We collect personal information about you in various ways,
        such as:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          Directly from you when you provide it to us. For example, when you fill out a webform; inquire about our
          services and products; create an account with us; communicate with us via comments, direct message, email,
          SMS message, or telephone; or respond to one of our surveys.
        </li>
        <li>Automatically as you navigate through our Website.</li>
        <li>From third parties, for example, our business partners and affiliated entities.</li>
      </ul>
      <p className="mt-3">
        <strong>Information You Provide to Us.</strong> The information we collect on or through our Website may
        include:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          Information that you provide by filling in forms on our Website, such as name, postal address, email address,
          telephone number, or other identifier. This includes information provided at the time of registering to use
          our Website, subscribing to our services, requesting information about our services or products, submitting
          an employment application, participating in marketing, or requesting further services. We may also ask you
          for information when you report a problem with our Website.
        </li>
        <li>Records and copies of your correspondence (including email addresses), if you contact us.</li>
        <li>Your search queries on our Website.</li>
      </ul>
      <p className="mt-3">
        <strong>Information We Collect Through Automatic Data Collection Technologies.</strong>
      </p>
      <p className="mt-3">
        When you use our Website or open our emails, we may obtain certain information by automated means, such as
        cookies, pixel tags, server or device logs and other technologies. A “cookie” is a text file that websites send
        to a visitor’s device to uniquely identify the visitor’s browser or to store information or settings in the
        browser. A “pixel tag” (also known as a web beacon), which is a type of technology that is often used in
        combination with cookies, is placed on a website or within an email to track certain activity, such as views of
        a website or when an email is opened. These technologies help us (1) remember your information so you do not
        have to re-enter it; (2) track and understand how you use and interact with the Website; (3) tailor the Website
        around your preferences; (4) measure the usability of the Website and the effectiveness of our communications;
        (5) authenticate your identity, protect against fraud and provide our products and services; and (6) otherwise
        manage and enhance our products and services, and help ensure they are working properly.
      </p>
      <p className="mt-3">
        We may use these automated technologies on the Website to collect information about your device, browsing
        actions, and usage patterns. We obtain information about your device and web browser in this manner such as
        your device IP address, general location information, unique device identifiers, device type and model, device
        characteristics and settings, browser settings and characteristics, operating system type and version, language
        and country preferences, battery and signal strength, usage statistics, referring emails and web addresses, and
        other application details. We also may obtain information about your interactions with our Website, such as
        pages visited, links clicked, features used, dates and times of usage, session information, and other
        information about your use of our Website.
      </p>
      <p className="mt-3">
        Your browser may tell you how to be notified about certain types of automated collection technologies and how
        to restrict or disable them. Please note, however, that without these technologies, you may not be able to use
        all of the features of the Website. For mobile devices, you can manage how your device and browser share
        certain device data by adjusting the privacy and security settings on your mobile device.
      </p>

      <h2 className="mt-8 text-xl font-semibold">How We Use Your Information</h2>
      <p className="mt-3">
        We may use information that we collect about you or that you provide to us, including any personal information:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>To present our Website and its contents to you.</li>
        <li>To advertise investment opportunities.</li>
        <li>To present offers, goods, and services that may interest you.</li>
        <li>To do market research.</li>
        <li>To provide you with information, products, or services that you request from us.</li>
        <li>To fulfill any other purpose for which you provide the information.</li>
        <li>To carry out our obligations and enforce our rights arising from any contracts entered into between you and us.</li>
        <li>In connection with any dispute including prosecuting or defending against claims in court or any other forum.</li>
        <li>To notify you about changes to our Website or any products or services we offer or provide through such platforms.</li>
        <li>To allow you to participate in interactive features on our Website.</li>
        <li>In any other way we may describe when you provide the information.</li>
        <li>For any other purpose with your consent.</li>
        <li>To inform you about our own and third-parties’ goods and services that may be of interest to you.</li>
      </ul>
      <p className="mt-3">
        We may also use your information to contact you about goods and services that may be of interest to you or in
        other ways for which we provide specific notice at the time of collection. For more information, see{" "}
        <a className="text-gold underline" href="#choices">
          Choices About How We Use and Disclose Your Information
        </a>
        .
      </p>
      <p className="mt-3">
        <strong>Third-Party Analytics Services</strong>
      </p>
      <p className="mt-3">
        We may use third-party analytics services on the Website, such as Google Analytics. The providers of these
        analytics services use technologies such as cookies and web beacons to help us analyze your use of the Website.
        The information collected through these means may be disclosed to or collected directly by these services. To
        learn more about Google Analytics, please visit{" "}
        <a
          className="text-gold underline"
          href="https://www.google.com/policies/privacy/partners/"
          target="_blank"
          rel="noreferrer"
        >
          www.google.com/policies/privacy/partners/
        </a>
        .
      </p>
      <p className="mt-3">
        <strong>Interest-Based Advertising</strong>
      </p>
      <p className="mt-3">
        You may see our ads on other websites because we use third-party ad services on our Website. Through these ad
        services, we can tailor our messaging to individuals considering demographic data, inferred interests and
        browsing context. These ad services track information about your online activities over time and across
        third-party websites and apps by collecting information through automated means, including through the use of
        cookies, web server logs, web beacons and other similar technologies. These ad services may collect data about
        your visits to websites and apps that participate in these services, such as the pages or ads you view and the
        actions you take on the websites or apps. This data collection takes place both on our Website and on
        third-party websites and apps that participate in these ad services. These ad services use this information to
        show you ads that may be tailored to your individual interests.
      </p>
      <p className="mt-3">
        To learn how to opt out of interest-based advertising in the U.S., please visit{" "}
        <a className="text-gold underline" href="https://www.aboutads.info/choices" target="_blank" rel="noreferrer">
          www.aboutads.info/choices
        </a>
        ,{" "}
        <a
          className="text-gold underline"
          href="https://www.networkadvertising.org/choices/"
          target="_blank"
          rel="noreferrer"
        >
          www.networkadvertising.org/choices/
        </a>
        , and{" "}
        <a className="text-gold underline" href="https://preferences-mgr.truste.com/" target="_blank" rel="noreferrer">
          https://preferences-mgr.truste.com/
        </a>
        .
      </p>

      <h2 className="mt-8 text-xl font-semibold">Disclosure of Your Information</h2>
      <p className="mt-3">
        We may disclose personal information that we collect, or you provide as described in this privacy policy:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>To our subsidiaries, affiliates, and commonly owned entities.</li>
        <li>
          To contractors, service providers, industry trade associations and other third parties we use to support our
          business.
        </li>
        <li>
          To a buyer or other successor in the event of a merger, divestiture, restructuring, reorganization,
          dissolution, or other sale or transfer of some or all of {brand}’s assets, whether as a going concern or as
          part of bankruptcy, liquidation, or similar proceeding, in which personal information held by {brand} about
          our Website users is among the assets transferred.
        </li>
        <li>To fulfill the purpose for which you provide the information.</li>
        <li>For any other purpose disclosed by us when you provide the information.</li>
        <li>With your consent.</li>
      </ul>
      <p className="mt-3">We may also disclose your personal information:</p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          To comply with any court order, law, or legal process, including to respond to any government or regulatory
          request.
        </li>
        <li>
          To enforce or apply our policies and procedures, Terms of Use, the terms of this Policy, or any other
          agreements with us.
        </li>
        <li>
          If we believe disclosure is necessary or appropriate to protect the rights, property, or safety of {brand},
          our clients, or other third parties. This includes exchanging information with other companies and
          organizations for the purposes of fraud protection and credit risk reduction.
        </li>
      </ul>

      <h2 id="choices" className="mt-8 text-xl font-semibold">
        Choices About How We Use and Disclose Your Information
      </h2>
      <p className="mt-3">
        We strive to provide you with choices regarding the personal information you provide to us. We have created
        mechanisms to provide you with the following control over your information:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong>Tracking Technologies and Advertising.</strong> You can set your browser to refuse all or some
          browser cookies, or to alert you when cookies are being sent. If you disable or refuse cookies, please note
          that some parts of this site may then be inaccessible or not function properly.
        </li>
        <li>
          <strong>Promotional Offers from the Company and other Communications.</strong> We may provide notifications
          to you that are required by law or that are for promotional, marketing, or other business-related purposes.
          Subject to applicable law, we may provide such notifications to you via email, SMS/MMS message, hard copy, or
          through conspicuous posting on our Website. We reserve the right to determine the form and means of providing
          notifications to you.
        </li>
        <li>
          <strong>Targeted Advertising.</strong> We may permit third-party online advertising networks to collect
          information about your use of our Services over time so that they may display ads that may be relevant to
          your interests on our Services as well as on other websites or applications. Typically, the information
          collected for this purpose is collected through cookies or similar tracking technologies. The only way to
          completely opt out of the collection of any information through cookies or other tracking technology is to
          actively manage the settings on your browser or mobile device. Please refer to your mobile device or
          browser’s technical information for instructions on how to delete and disable cookies and other
          tracking/recording tools. Depending on your type of device, it may not be possible to delete or disable
          tracking mechanisms on your mobile device. Disabling cookies and/or other tracking tools may prevent {brand}{" "}
          or its business partners from tracking your browser’s activities in relation to the Website, and for use in
          targeted advertising activities by third parties, but if you choose to refuse cookies or other similar tools
          from our Services, some functionalities or features of the Website might not work properly, may be slower, or
          may be unavailable.
        </li>
      </ul>

      <h2 className="mt-8 text-xl font-semibold">Promotional Communications / Opt-In and Opt-Out</h2>
      <p className="mt-3">
        From time to time, with your express consent and/or as permitted by state and federal laws, {brand} may send
        you promotional communications via SMS/MMS message, push notifications, electronic mail, and/or telephone
        including information about special offers, updates about investment opportunities, and other
        solicitation/advertising materials. If you provide your personal information through any of our registration
        forms on our Website, or otherwise, you may request that we stop sending you marketing communications if you
        no longer desire to be contacted by us.
      </p>
      <p className="mt-3">
        You do not need to create an account with us to exercise your opt-out rights. We will only use personal
        information provided in an opt-out request to review and comply with the request.
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          <strong>Text Messages.</strong> You may choose to subscribe or opt-in to marketing SMS/MMS messaging from{" "}
          {brand}. You will only receive promotional text messages if you expressly consent or choose to opt in to
          receive such messages. Please note that no purchase is necessary to receive such messages; standard message
          and data rates may apply. You may text “STOP” in response to any marketing texts you receive from us to opt
          out or unsubscribe from SMS/MMS messaging.
        </li>
        <li>
          <strong>Email Messages.</strong> We may send you emails containing newsletters, promotions, and special
          offers. If you do not want to receive such email messages, you can stop receiving promotional email
          communications from us by clicking on the “unsubscribe” link provided in such communications or sending us
          an email with your request to{" "}
          <a className="text-gold underline" href={`mailto:${email}`}>
            {email}
          </a>
          . We make reasonable efforts to promptly process all unsubscribe requests.
        </li>
        <li>
          <strong>Services-Related Informational Messages.</strong> We also may use your Personal Information to send
          you services-related informational SMS/MMS messages and emails (e.g., account verification, changes/updates
          to features of our services, technical and security notices). You may not opt out of such services-related
          emails.
        </li>
        <li>
          <strong>Third-Party Advertising.</strong> If you do not want us to share your personal information with
          unaffiliated or non-agent third parties for promotional purposes, you can opt-out by sending us an email with
          your request to{" "}
          <a className="text-gold underline" href={`mailto:${email}`}>
            {email}
          </a>
          .
        </li>
      </ul>
      <p className="mt-3">
        If you have any questions about opting out of the collection of cookies and other tracking/recording tools, you
        can contact us directly at{" "}
        <a className="text-gold underline" href={`mailto:${email}`}>
          {email}
        </a>
        .
      </p>
      <p className="mt-3">
        To learn more about cookies, clear gifs/web beacons and related technologies, you also may wish to visit{" "}
        <a className="text-gold underline" href="https://www.allaboutcookies.org/" target="_blank" rel="noreferrer">
          https://www.allaboutcookies.org
        </a>{" "}
        and/or the Network Advertising Initiative’s online resources, located at{" "}
        <a className="text-gold underline" href="https://www.networkadvertising.org/" target="_blank" rel="noreferrer">
          https://www.networkadvertising.org
        </a>
        .
      </p>

      <h2 className="mt-8 text-xl font-semibold">‘Do Not Track’</h2>
      <p className="mt-3">Our Services do not respond to Do-Not-Track signals from your browser at this time.</p>

      <h2 className="mt-8 text-xl font-semibold">Data Security</h2>
      <p className="mt-3">
        We have implemented safeguard measures designed to secure your personal information from accidental loss and
        from unauthorized access, loss, misuse, alteration, and disclosure.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Privacy Rights for California Residents</h2>
      <p className="mt-3">
        California Residents and consumers have certain privacy rights under the California Consumer Privacy Act of
        2018. We have prepared a supplemental{" "}
        <Link className="text-gold underline" to="/privacy-ca">
          Privacy Policy for California Residents
        </Link>{" "}
        in compliance with the CCPA, which can be viewed by clicking the{" "}
        <Link className="text-gold underline" to="/privacy-ca">
          link
        </Link>
        . You may also visit our{" "}
        <Link className="text-gold underline" to="/do-not-sell">
          Do Not Sell My Personal Information
        </Link>{" "}
        page.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Links to Third-Party Services and Features</h2>
      <p className="mt-3">
        For your convenience and information, the Website may provide links to other online services (such as websites
        or social media platforms), and may include third-party features such as apps, tools, widgets and plug-ins.
        These online services and third-party features may operate independently from us. The privacy practices of the
        relevant third parties, including details on the information they may collect about you, are subject to the
        privacy statements of these parties, which we strongly suggest you review. To the extent any linked online
        services or third-party features are not owned or controlled by {brand}, we are not responsible for these third
        parties’ information practices.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Changes to Our Privacy Policy</h2>
      <p className="mt-3">
        It is our policy to post any changes we make to our privacy policy on this webpage. If we make material changes
        to how we treat our users’ personal information, we will notify you through a notice posted on the Website home
        page. The date the privacy policy was last revised is identified at the top of the page.
      </p>

      <h2 className="mt-8 text-xl font-semibold">Contact Us</h2>
      <p className="mt-3">
        If you have any questions or comments about this policy or {brand}’s privacy practices, wish to opt out of
        certain services, or to submit a data privacy request, please contact us:
      </p>
      <ul className="mt-3 list-disc space-y-2 pl-6">
        <li>
          Email us at{" "}
          <a className="text-gold underline" href={`mailto:${email}`}>
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

      <Link to="/" className="mt-10 inline-block text-sm text-gold">
        Back
      </Link>
    </article>
  );
}
