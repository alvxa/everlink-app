import type { Metadata } from "next";
import { ShieldCheck } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = { title: "Community Guidelines" };

export default function CommunityGuidelinesPage() {
  return (
    <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
      <Badge variant="mint" className="mb-4">
        <ShieldCheck className="h-3.5 w-3.5" /> Community
      </Badge>
      <h1 className="font-display text-4xl font-bold tracking-tight text-ink">Community Guidelines</h1>
      <p className="mt-3 text-sm text-ink-muted">Last updated: November 2026</p>

      <div className="prose-content mt-8">
        <p>
          Everlink connects people across countries, cultures and languages. These guidelines keep the platform safe
          and welcoming. They apply to profiles, posts, comments, messages, stories, live rooms, communities and every
          other interaction on Everlink.
        </p>

        <h2>1. Respect people and cultures</h2>
        <ul>
          <li>Do not harass, threaten, intimidate or repeatedly target other members.</li>
          <li>Do not post hateful content targeting people based on race, ethnicity, nationality, religion, disability, gender, sexual orientation or age.</li>
          <li>Respect cultural differences. Curiosity is welcome; mockery is not.</li>
        </ul>

        <h2>2. Keep everyone safe</h2>
        <ul>
          <li>No content that sexualizes minors. This is grounds for immediate removal and reporting to authorities where required.</li>
          <li>Do not encourage self-harm, suicide or eating disorders. If you are struggling, please contact local emergency services or a trusted adult.</li>
          <li>Do not share credible threats of violence or coordinate harm.</li>
          <li>Adults may not use random matching to contact minors. Our matching system enforces age bands.</li>
        </ul>

        <h2>3. Be honest</h2>
        <ul>
          <li>Do not impersonate other people or organizations.</li>
          <li>Do not run scams, phishing attempts, fraudulent giveaways or deceptive financial schemes.</li>
          <li>Do not manipulate engagement through fake accounts, bots or coordinated inauthentic behavior.</li>
        </ul>

        <h2>4. Share responsibly</h2>
        <ul>
          <li>Only upload media you have the right to share.</li>
          <li>Do not share another person&apos;s private information without consent.</li>
          <li>Do not post spam, mass mentions or repetitive promotional content.</li>
          <li>Mark sensitive content appropriately and use content warnings where relevant.</li>
        </ul>

        <h2>5. Use live rooms and messaging respectfully</h2>
        <ul>
          <li>Obtain consent before starting voice or video. You can leave any room at any time.</li>
          <li>Do not record or broadcast other participants without their knowledge and consent.</li>
          <li>Hosts may remove participants for violating these guidelines.</li>
        </ul>

        <h2>6. Reporting and blocking</h2>
        <p>
          Every post, comment, profile, message, story and live room includes a report option. Blocking is available from
          profiles and conversations. Reports are reviewed by moderators using documented workflows. You can appeal a
          moderation decision through the contact form.
        </p>

        <h2>7. Enforcement</h2>
        <p>Depending on severity and history, we may:</p>
        <ul>
          <li>Remove content and notify the author.</li>
          <li>Issue a warning and record a moderation action.</li>
          <li>Restrict features such as messaging, random matching or community creation.</li>
          <li>Suspend or deactivate an account.</li>
          <li>Suspend an entire community for systemic violations.</li>
          <li>Report illegal content to appropriate authorities.</li>
        </ul>
        <p>
          Moderation actions are logged. We aim to apply these guidelines consistently, but context matters and we
          review each case individually.
        </p>

        <h2>8. Age requirements</h2>
        <p>
          You must be at least 13 years old to use Everlink. If local law sets a higher minimum age for data consent,
          that age applies. Accounts found to belong to underage users may be removed.
        </p>

        <h2>Contact</h2>
        <p>
          Questions about these guidelines or a moderation decision? Use our{" "}
          <a href="/contact">contact form</a>. For urgent safety concerns, contact local emergency services first.
        </p>
      </div>
    </div>
  );
}
