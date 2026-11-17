import type { Metadata } from "next";

export const metadata: Metadata = { title: "Privacy Policy" };

export default function PrivacyPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Privacy Policy</h1>
      <p className="mt-3 text-sm text-ink-muted">Last updated: November 2026</p>

      <div className="prose-content mt-8">
        <p>
          Everlink (&ldquo;we&rdquo;, &ldquo;us&rdquo;) provides a global social networking service. This policy explains what data we
          collect, why we collect it, how we protect it and the choices you have. It applies to the Everlink website and
          all related features.
        </p>

        <h2>1. Data we collect</h2>
        <h3>Account data</h3>
        <ul>
          <li>Username, display name, email address and password hash (we never store plaintext passwords).</li>
          <li>Date of birth, used to enforce minimum age requirements and age-aware matching.</li>
          <li>Optional profile information such as biography, country, languages, interests and profile images.</li>
        </ul>
        <h3>Content and activity</h3>
        <ul>
          <li>Posts, comments, reactions, messages, stories and community activity you create.</li>
          <li>Uploaded media and attachments.</li>
          <li>Follows, friendships, blocks and reports.</li>
        </ul>
        <h3>Technical data</h3>
        <ul>
          <li>Session identifiers, IP address and browser user agent for security and session management.</li>
          <li>Basic operational logs and audit records for administrative actions.</li>
        </ul>

        <h2>2. How we use data</h2>
        <ul>
          <li>To provide accounts, feeds, messaging, communities, discovery and live rooms.</li>
          <li>To protect users: abuse prevention, rate limiting, moderation and security alerts.</li>
          <li>To enforce age requirements and safety rules for random matching.</li>
          <li>To send essential emails such as verification and password reset links (when SMTP is configured).</li>
          <li>To understand aggregate usage through database-derived counts. We do not fabricate activity metrics.</li>
        </ul>

        <h2>3. Legal bases (where applicable)</h2>
        <p>
          Depending on your jurisdiction, we rely on contract necessity (providing the service), legitimate interests
          (safety, security, service improvement), consent (optional features such as translation providers and
          non-essential cookies) and legal obligations.
        </p>

        <h2>4. Sharing</h2>
        <p>
          We do not sell personal data. Data may be processed by infrastructure providers configured by the operator of
          this deployment, such as hosting, PostgreSQL, Redis, email delivery and translation providers.
          These processors only receive data necessary for their function. We may disclose data when legally required or
          to protect the safety of users.
        </p>

        <h2>5. International transfers</h2>
        <p>
          Everlink is a global service. Data may be processed in countries other than yours. Operators should use
          appropriate safeguards such as standard contractual clauses where required.
        </p>

        <h2>6. Retention</h2>
        <ul>
          <li>Account data is retained while your account is active.</li>
          <li>Stories expire automatically after 24 hours and are excluded from results server-side.</li>
          <li>Deleted posts and messages are soft-deleted immediately and removed from user-facing surfaces.</li>
          <li>Moderation and audit records may be retained to enforce safety policies and meet legal obligations.</li>
          <li>When you delete your account, your profile is anonymized, sessions are revoked and personal identifiers are removed.</li>
        </ul>

        <h2>7. Security</h2>
        <ul>
          <li>Passwords are hashed with Argon2id.</li>
          <li>Sessions use random tokens stored hashed in the database and delivered in HttpOnly, SameSite cookies.</li>
          <li>State-changing API requests validate origin and are rate limited.</li>
          <li>Uploads are validated by MIME type, size and file signature.</li>
          <li>Access to conversations is checked server-side on every request.</li>
          <li>Administrative actions require privileged roles and are recorded in audit logs.</li>
        </ul>

        <h2 id="cookies">8. Cookies and local storage</h2>
        <p>Everlink uses:</p>
        <ul>
          <li><strong className="text-ink">Essential cookies</strong> for authentication sessions. These cannot be disabled while signed in.</li>
          <li><strong className="text-ink">Local storage</strong> for your theme preference. This stays on your device.</li>
        </ul>
        <p>We do not use advertising cookies or third-party trackers in this application.</p>

        <h2>9. Your rights</h2>
        <p>
          Depending on where you live, you may have the right to access, correct, export, restrict or delete personal
          data, and to object to certain processing. In Everlink you can:
        </p>
        <ul>
          <li>Edit your profile and visibility settings in Settings.</li>
          <li>Export your data as JSON from Settings → Data.</li>
          <li>Delete your account from Settings → Data.</li>
          <li>Contact us to exercise other rights.</li>
        </ul>

        <h2>10. Children and age-appropriate experience</h2>
        <p>
          Everlink is not intended for children under 13. Where local law requires a higher age of digital consent, that
          age applies. Accounts identified as belonging to underage users are removed. Users under 18 receive stricter
          defaults: random matching is limited to peers close in age, and adults are never matched with minors.
        </p>

        <h2>11. Changes</h2>
        <p>
          We may update this policy as the service evolves. Material changes will be communicated through the platform.
          Continued use after an update constitutes acceptance.
        </p>

        <h2>12. Contact</h2>
        <p>
          Privacy questions or requests: use the <a href="/contact">contact form</a>. Include &ldquo;Privacy&rdquo; in the subject so
          your request reaches the right team.
        </p>
      </div>
    </div>
  );
}
