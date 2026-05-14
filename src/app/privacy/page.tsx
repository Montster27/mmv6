import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — MMV Studios",
  description:
    "Privacy Policy for MMV Studios apps: Many More Versions of You (MMV), CBT-I Coach, and GeekBread.",
};

const EFFECTIVE_DATE = "May 14, 2026";
const COMPANY = "MMV Studios";
const CONTACT_EMAIL = "privacy@mmvstudios.com";

export default function PrivacyPage() {
  return (
    <div className="font-[var(--font-inter)] bg-[#f8fafb] text-[#191c1d] antialiased">
      {/* Header */}
      <header className="bg-[#003061] text-white sticky top-0 z-50">
        <div className="flex justify-between items-center w-full px-8 py-5 max-w-screen-2xl mx-auto">
          <a href="/" className="text-2xl font-bold tracking-tighter text-white">
            MMV
          </a>
          <span className="text-sm text-[#93b6f1] tracking-widest uppercase">
            Privacy Policy
          </span>
        </div>
      </header>

      <main className="max-w-3xl mx-auto px-8 py-20">
        {/* Title block */}
        <div className="mb-14">
          <h1 className="text-4xl font-black text-[#003061] mb-3">Privacy Policy</h1>
          <p className="text-[#41474f]">
            Effective date: <strong>{EFFECTIVE_DATE}</strong>
          </p>
        </div>

        <Section>
          <p>
            {COMPANY} (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the following
            applications and websites (collectively, the &quot;Services&quot;):
          </p>
          <ul className="mt-4 space-y-2 list-none pl-0">
            <AppPill name="Many More Versions of You (MMV)" platform="Web &amp; iOS" />
            <AppPill name="CBT-I Coach" platform="Web &amp; iOS" />
            <AppPill name="GeekBread" platform="Web &amp; iOS" />
          </ul>
          <p className="mt-4">
            This Policy explains how we collect, use, and protect your information
            across all three apps. Where practices differ by app, we call that out
            explicitly.
          </p>
        </Section>

        <Divider />

        {/* 1. Information we collect */}
        <Section title="1. Information We Collect">
          <p className="mb-4">
            The information we collect depends on which app you use and how you interact
            with it.
          </p>

          <SubHeading>All Services</SubHeading>
          <ul className="list-disc pl-6 space-y-1 text-[#41474f]">
            <li>Account information (email address, username, password hash)</li>
            <li>Device and browser information (OS version, browser type, screen size)</li>
            <li>Usage data (features used, session duration, error logs)</li>
            <li>IP address and general location (country/region level)</li>
          </ul>

          <SubHeading className="mt-6">Many More Versions of You (MMV)</SubHeading>
          <ul className="list-disc pl-6 space-y-1 text-[#41474f]">
            <li>Game progress, storylet choices, and play history</li>
            <li>In-game preferences and settings</li>
            <li>Optional feedback or survey responses</li>
          </ul>

          <SubHeading className="mt-6">CBT-I Coach</SubHeading>
          <p className="text-[#41474f] mb-2">
            CBT-I Coach helps you practice Cognitive Behavioral Therapy for Insomnia.
            Because this app involves health-related inputs, we collect additional data:
          </p>
          <ul className="list-disc pl-6 space-y-1 text-[#41474f]">
            <li>Sleep diary entries (bedtime, wake time, time in bed, time asleep)</li>
            <li>Sleep quality and mood ratings</li>
            <li>Symptom check-in responses</li>
            <li>Therapy module completion progress</li>
          </ul>
          <p className="mt-3 text-[#41474f]">
            <strong>This data is sensitive.</strong> We treat CBT-I sleep and mood data
            as health information and apply stricter access controls and retention limits
            to it (see Section 4).
          </p>

          <SubHeading className="mt-6">GeekBread</SubHeading>
          <ul className="list-disc pl-6 space-y-1 text-[#41474f]">
            <li>Saved recipes and cookbook collections</li>
            <li>Optional dietary preferences or tags you add to recipes</li>
            <li>Search history within the app (stored locally by default)</li>
          </ul>
        </Section>

        <Divider />

        {/* 2. How we use your information */}
        <Section title="2. How We Use Your Information">
          <ul className="list-disc pl-6 space-y-2 text-[#41474f]">
            <li>To provide, maintain, and improve the Services</li>
            <li>To personalize your experience (game progress, recipe recommendations)</li>
            <li>
              For CBT-I Coach: to calculate sleep efficiency scores and progress metrics
              that appear in the app for your benefit
            </li>
            <li>To send transactional emails (account confirmation, password reset)</li>
            <li>
              To send product update emails, if you opt in (you may opt out at any time)
            </li>
            <li>To detect, investigate, and prevent fraud or abuse</li>
            <li>To comply with legal obligations</li>
          </ul>
          <p className="mt-4 text-[#41474f]">
            We do not sell your personal information. We do not use your CBT-I health
            data for advertising purposes.
          </p>
        </Section>

        <Divider />

        {/* 3. Sharing */}
        <Section title="3. Sharing Your Information">
          <p className="mb-4 text-[#41474f]">
            We share your information only in the following limited circumstances:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#41474f]">
            <li>
              <strong>Service providers:</strong> Third-party vendors that help us operate
              the Services (cloud hosting, analytics, email delivery). They are
              contractually prohibited from using your data for any other purpose.
            </li>
            <li>
              <strong>Legal requirements:</strong> When required by law, court order, or
              to protect the rights, property, or safety of {COMPANY}, our users, or the
              public.
            </li>
            <li>
              <strong>Business transfers:</strong> If {COMPANY} is acquired or merges with
              another entity, your information may transfer as part of that transaction.
              We will notify you before your data is subject to a materially different
              privacy policy.
            </li>
          </ul>
          <p className="mt-4 text-[#41474f]">
            We do <strong>not</strong> share CBT-I health data with insurers, employers,
            advertisers, or data brokers.
          </p>
        </Section>

        <Divider />

        {/* 4. Data retention */}
        <Section title="4. Data Retention">
          <ul className="list-disc pl-6 space-y-2 text-[#41474f]">
            <li>
              <strong>Account data:</strong> Retained while your account is active and for
              up to 90 days after deletion, to allow recovery and complete our legal
              obligations.
            </li>
            <li>
              <strong>CBT-I sleep &amp; mood data:</strong> Retained for 12 months from
              the date of entry, then automatically purged. You may delete individual
              entries or all CBT-I data at any time from the app&apos;s Settings screen.
            </li>
            <li>
              <strong>MMV game progress:</strong> Retained for the life of your account.
              Deleted when you close your account.
            </li>
            <li>
              <strong>GeekBread recipes and collections:</strong> Retained for the life of
              your account. Exported or deleted on request.
            </li>
            <li>
              <strong>Usage and analytics data:</strong> Retained in aggregate,
              anonymized form for up to 24 months.
            </li>
          </ul>
        </Section>

        <Divider />

        {/* 5. iOS & App Store */}
        <Section title="5. iOS and Apple App Store">
          <p className="mb-4 text-[#41474f]">
            Our iOS apps follow Apple&apos;s App Store privacy requirements. Where
            applicable, we request only the permissions the app needs:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#41474f]">
            <li>
              <strong>CBT-I Coach:</strong> May request notifications to send optional
              sleep diary reminders. You can disable these in iOS Settings at any time.
            </li>
            <li>
              <strong>MMV &amp; GeekBread:</strong> No special system permissions are
              required.
            </li>
          </ul>
          <p className="mt-4 text-[#41474f]">
            Data collected through our iOS apps is governed by this Policy. Apple&apos;s
            own privacy practices are described in the{" "}
            <a
              href="https://www.apple.com/legal/privacy/"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#004A77] underline"
            >
              Apple Privacy Policy
            </a>
            .
          </p>
        </Section>

        <Divider />

        {/* 6. Cookies */}
        <Section title="6. Cookies and Tracking">
          <p className="text-[#41474f]">
            Our web apps use cookies and similar technologies to keep you signed in and
            to understand how people use the Services. We use:
          </p>
          <ul className="list-disc pl-6 space-y-2 mt-3 text-[#41474f]">
            <li>
              <strong>Essential cookies:</strong> Required for authentication and security.
              Cannot be disabled without breaking core functionality.
            </li>
            <li>
              <strong>Analytics cookies:</strong> Help us understand feature usage in
              aggregate. You may opt out via your browser&apos;s Do Not Track setting or by
              contacting us.
            </li>
          </ul>
          <p className="mt-3 text-[#41474f]">
            We do not use advertising cookies or cross-site tracking cookies.
          </p>
        </Section>

        <Divider />

        {/* 7. Your rights */}
        <Section title="7. Your Rights">
          <p className="mb-4 text-[#41474f]">
            Depending on where you live, you may have the right to:
          </p>
          <ul className="list-disc pl-6 space-y-2 text-[#41474f]">
            <li>Access the personal data we hold about you</li>
            <li>Correct inaccurate data</li>
            <li>Request deletion of your data (&quot;right to be forgotten&quot;)</li>
            <li>Export your data in a portable format</li>
            <li>Opt out of non-essential communications</li>
            <li>
              Lodge a complaint with your local data protection authority (EU/UK residents)
            </li>
          </ul>
          <p className="mt-4 text-[#41474f]">
            To exercise any of these rights, email us at{" "}
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[#004A77] underline"
            >
              {CONTACT_EMAIL}
            </a>
            . We will respond within 30 days.
          </p>
        </Section>

        <Divider />

        {/* 8. Children */}
        <Section title="8. Children's Privacy">
          <p className="text-[#41474f]">
            Our Services are not directed to children under the age of 13 (or 16 in the
            EU). We do not knowingly collect personal information from children. If you
            believe we have inadvertently collected information from a child, please
            contact us and we will delete it promptly.
          </p>
        </Section>

        <Divider />

        {/* 9. Security */}
        <Section title="9. Security">
          <p className="text-[#41474f]">
            We use industry-standard measures to protect your data, including encryption
            in transit (TLS) and at rest, role-based access controls, and regular security
            reviews. No method of transmission over the Internet is 100% secure, and we
            cannot guarantee absolute security. CBT-I health data is stored with additional
            access restrictions and is not accessible to {COMPANY} employees except to
            resolve support requests you initiate.
          </p>
        </Section>

        <Divider />

        {/* 10. Changes */}
        <Section title="10. Changes to This Policy">
          <p className="text-[#41474f]">
            We may update this Policy from time to time. When we do, we will revise the
            effective date at the top of this page. For material changes, we will notify
            you by email or with an in-app notice at least 14 days before the change takes
            effect.
          </p>
        </Section>

        <Divider />

        {/* 11. Contact */}
        <Section title="11. Contact Us">
          <p className="text-[#41474f]">
            Questions, concerns, or requests about this Policy or your data:
          </p>
          <div className="mt-4 bg-[#f2f4f5] rounded-xl p-6 inline-block">
            <p className="font-bold text-[#003061]">{COMPANY}</p>
            <a
              href={`mailto:${CONTACT_EMAIL}`}
              className="text-[#004A77] underline"
            >
              {CONTACT_EMAIL}
            </a>
          </div>
        </Section>
      </main>

      {/* Footer */}
      <footer className="bg-[#f2f4f5] mt-12">
        <div className="flex flex-col md:flex-row justify-between items-center w-full px-12 py-10 gap-6 max-w-screen-2xl mx-auto">
          <a href="/" className="text-xl font-black text-[#003061]">
            MMV
          </a>
          <div className="flex flex-wrap justify-center gap-8">
            <a
              className="text-[#40484c] tracking-wider hover:text-[#003061] underline decoration-2 min-h-[44px] flex items-center"
              href="/#survey"
            >
              Join the List
            </a>
            <a
              className="text-[#003061] font-semibold tracking-wider underline decoration-2 min-h-[44px] flex items-center"
              href="/privacy"
              aria-current="page"
            >
              Privacy Policy
            </a>
          </div>
          <div className="text-[#40484c] tracking-wider text-center md:text-right">
            &copy; 2025 MMV Studios. All rights reserved.
          </div>
        </div>
      </footer>
    </div>
  );
}

// ── Local components ────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="mb-10">
      {title && (
        <h2 className="text-xl font-bold text-[#003061] mb-4">{title}</h2>
      )}
      {children}
    </section>
  );
}

function SubHeading({
  children,
  className = "",
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <h3 className={`text-base font-semibold text-[#191c1d] mt-4 mb-2 ${className}`}>
      {children}
    </h3>
  );
}

function Divider() {
  return <hr className="border-[#dde1e2] my-10" />;
}

function AppPill({ name, platform }: { name: string; platform: string }) {
  return (
    <li className="flex items-center gap-3">
      <span className="inline-block bg-[#003061] text-white text-xs font-bold px-3 py-1 rounded-full">
        {platform}
      </span>
      <span className="font-medium">{name}</span>
    </li>
  );
}
