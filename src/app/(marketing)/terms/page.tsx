import type { Metadata } from "next";

export const metadata: Metadata = { title: "Terms of Service" };

export default function TermsPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Terms of Service</h1>
      <p className="mt-3 text-sm text-ink-muted">Last updated: November 2026</p>

      <div className="prose-content mt-8">
        <p>
          These Terms govern your use of Everlink. By creating an account or using the service, you agree to these
          Terms, our <a href="/privacy">Privacy Policy</a> and our{" "}
          <a href="/community-guidelines">Community Guidelines</a>.
        </p>

        <h2>1. Eligibility</h2>
        <p>
          You must be at least 13 years old to use Everlink, or older if required by the digital consent laws of your
          country. If you are a minor, you represent that you have permission from a parent or guardian. You may not use
          Everlink if you have been previously suspended for serious violations.
        </p>

        <h2>2. Your account</h2>
        <ul>
          <li>Provide accurate registration information and keep it current.</li>
          <li>Keep your password secure and do not share your session or account.</li>
          <li>You are responsible for activity performed through your account.</li>
          <li>Notify us promptly if you believe your account has been compromised.</li>
        </ul>

        <h2>3. Content you create</h2>
        <p>
          You retain ownership of the content you post. You grant Everlink a non-exclusive, worldwide, royalty-free
          license to host, display, reproduce and distribute your content solely to operate and improve the service.
          You represent that you own or have the necessary rights to everything you upload.
        </p>
        <p>
          You are responsible for your content and its consequences. We may remove content that violates these Terms or
          our Community Guidelines.
        </p>

        <h2>4. Acceptable use</h2>
        <p>You agree not to:</p>
        <ul>
          <li>Violate any law or the rights of others.</li>
          <li>Harass, threaten, defame or impersonate others.</li>
          <li>Post sexual content involving minors, or any content that exploits children.</li>
          <li>Distribute malware, phishing links or spam.</li>
          <li>Scrape, crawl or automate access without written permission.</li>
          <li>Attempt to bypass rate limits, authentication, authorization or moderation.</li>
          <li>Probe, scan or test the vulnerability of the service without authorization.</li>
          <li>Interfere with the operation of the service or other users&apos; access.</li>
        </ul>

        <h2>5. Messaging, live rooms and consent</h2>
        <p>
          Voice and video require mutual consent. Do not record or redistribute another person&apos;s audio, video or
          private messages without their permission. Hosts may remove participants, and you may leave any room or
          conversation at any time. Blocking prevents direct contact where the product supports it.
        </p>

        <h2>6. Moderation and enforcement</h2>
        <p>
          We may warn, restrict, suspend or terminate accounts, remove content, or suspend communities to enforce these
          Terms or protect users. Moderation decisions are recorded. You can appeal through the contact form. Repeat or
          severe violations may result in permanent removal.
        </p>

        <h2>7. Privacy</h2>
        <p>
          Our collection and use of personal data is described in the <a href="/privacy">Privacy Policy</a>. You can
          export or delete your data from Settings.
        </p>

        <h2>8. Intellectual property</h2>
        <p>
          Everlink&apos;s name, logo, design system and software are protected by intellectual property laws. You may not
          copy, modify or distribute them without permission, except as allowed by applicable law.
        </p>

        <h2>9. Third-party services</h2>
        <p>
          Some features can use third-party providers (email delivery, translation, storage, media). Their terms may
          apply. Everlink is not responsible for third-party services it does not control.
        </p>

        <h2>10. Disclaimers and limitation of liability</h2>
        <p>
          Everlink is provided &ldquo;as is&rdquo; and &ldquo;as available&rdquo;. To the maximum extent permitted by law, we disclaim
          warranties of merchantability, fitness for a particular purpose and non-infringement. We do not guarantee
          uninterrupted or error-free service. Our aggregate liability arising from your use of the service will not
          exceed the greater of amounts you paid us in the preceding twelve months or USD 100.
        </p>

        <h2>11. Termination</h2>
        <p>
          You may delete your account at any time in Settings. We may suspend or terminate access for violations of
          these Terms. Provisions that by their nature should survive termination (such as liability limits and
          governing law) will survive.
        </p>

        <h2>12. Changes</h2>
        <p>
          We may update these Terms. If changes are material, we will provide notice in the product. Continued use after
          changes become effective means you accept the updated Terms.
        </p>

        <h2>13. Contact</h2>
        <p>
          Questions about these Terms? Use the <a href="/contact">contact form</a>.
        </p>
      </div>
    </div>
  );
}
