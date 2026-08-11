import type { ReactNode } from 'react';
import { Link } from 'react-router';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const LAST_UPDATED = '7 August 2026';
const CONTACT_EMAIL = 'hello@fleethq.com.au';

/**
 * Public legal pages linked from the signup consent checkbox. Without these
 * routes those links 404, so a customer is asked to accept terms they can't
 * read (audit H8). The content is FleetHQ's own operator agreement / privacy
 * statement — plain-language and Australian-law oriented (the product's home
 * jurisdiction) — not legal advice; operators should still take their own.
 */
function LegalLayout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <div className="min-h-screen bg-(--surface-1) px-4 py-10">
      <div className="mx-auto max-w-3xl">
        <Card>
          <CardHeader className="flex-col items-start gap-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            <p className="text-sm text-(--text-tertiary)">Last updated {LAST_UPDATED}</p>
          </CardHeader>
          <CardContent>
            <div className="space-y-6 text-sm leading-relaxed text-(--text-secondary)">{children}</div>
            <div className="mt-8 flex flex-wrap gap-4 border-t border-(--border) pt-6 text-sm">
              <Link to="/signup" className="text-accent-600 hover:underline">← Back to sign up</Link>
              <Link to="/terms" className="text-accent-600 hover:underline">Terms of Service</Link>
              <Link to="/privacy" className="text-accent-600 hover:underline">Privacy Policy</Link>
              <Link to="/contact" className="text-accent-600 hover:underline">Contact us</Link>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function Section({ heading, children }: { heading: string; children: ReactNode }) {
  return (
    <section className="space-y-2">
      <h2 className="text-base font-semibold text-(--text-primary)">{heading}</h2>
      {children}
    </section>
  );
}

export function TermsPage() {
  return (
    <LegalLayout title="Terms of Service">
      <p>
        These terms govern your use of FleetHQ (the “Service”). By creating an account or using the
        Service you agree to them on behalf of your organisation (the “Customer”).
      </p>
      <Section heading="1. The Service">
        <p>
          FleetHQ is a fleet, dispatch, workshop and compliance management platform provided on a
          subscription basis. We may add, change or remove features over time; where a change
          materially reduces core functionality you rely on, we will give reasonable notice.
        </p>
      </Section>
      <Section heading="2. Accounts and access">
        <p>
          You are responsible for your users’ accounts, for keeping credentials secure, and for all
          activity under your account. Each login is personal to one user and must not be shared. You
          must promptly disable access for anyone who should no longer have it.
        </p>
      </Section>
      <Section heading="3. Acceptable use">
        <p>
          You must not misuse the Service — including attempting to breach its security or access other
          organisations’ data, uploading unlawful content, or using it to breach transport, work-health-
          and-safety or privacy law. You are responsible for the accuracy of the operational and
          compliance records you enter.
        </p>
      </Section>
      <Section heading="4. Fees and billing">
        <p>
          Subscription fees are charged in advance for the plan and asset quantity you select, via our
          payment processor. Fees are exclusive of GST unless stated. Unless required by law, fees are
          non-refundable for partial periods. You can cancel at any time; access continues until the end
          of the paid period.
        </p>
      </Section>
      <Section heading="5. Your data and intellectual property">
        <p>
          You retain ownership of the data you put into the Service. You grant us a limited licence to
          host and process it solely to provide and support the Service. We own the Service software and
          our trademarks. Our handling of personal information is described in our{' '}
          <Link to="/privacy" className="text-accent-600 hover:underline">Privacy Policy</Link>.
        </p>
      </Section>
      <Section heading="6. Availability and support">
        <p>
          We aim to keep the Service available and to support it during Australian business hours, but we
          do not guarantee uninterrupted access. We may suspend access for maintenance or to protect the
          Service, and will try to minimise disruption.
        </p>
      </Section>
      <Section heading="7. Liability">
        <p>
          Nothing in these terms excludes rights you have under the Australian Consumer Law that cannot
          be excluded. Subject to that, the Service is provided “as is”, and to the extent permitted by
          law our total liability arising from the Service is limited to the fees you paid in the 12
          months before the event giving rise to the claim. We are not liable for indirect or
          consequential loss.
        </p>
      </Section>
      <Section heading="8. Term and termination">
        <p>
          Either party may end the subscription in line with the plan. We may suspend or terminate access
          for a material breach of these terms. On termination you may export your data for a reasonable
          period, after which we may delete it in line with our retention practices.
        </p>
      </Section>
      <Section heading="9. Governing law">
        <p>These terms are governed by the laws of Australia, and you submit to the courts of that jurisdiction.</p>
      </Section>
      <Section heading="10. Changes and contact">
        <p>
          We may update these terms; where changes are material we will give reasonable notice.
          Questions? Contact us at <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-600 hover:underline">{CONTACT_EMAIL}</a>{' '}
          or via the <Link to="/contact" className="text-accent-600 hover:underline">contact page</Link>.
        </p>
      </Section>
    </LegalLayout>
  );
}

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy Policy">
      <p>
        This policy explains how FleetHQ handles personal information, consistent with the Australian
        Privacy Principles (APPs) in the Privacy Act 1988 (Cth). “We” refers to the operator of FleetHQ;
        “you” to the customer organisation and its users.
      </p>
      <Section heading="1. What we collect">
        <p>
          Account and contact details (name, email, phone, role); operational data you enter (drivers,
          assets, jobs, inspections, compliance documents, locations); and technical data needed to run
          the Service securely (log and device information). Only provide personal information about
          others where you are entitled to.
        </p>
      </Section>
      <Section heading="2. How we use it">
        <p>
          To provide, secure, support and improve the Service, to process billing, and to meet legal
          obligations. We do not sell personal information, and we do not use your operational data for
          advertising.
        </p>
      </Section>
      <Section heading="3. Disclosure">
        <p>
          We disclose personal information to service providers who help us run the Service (for example
          hosting and payment processing) under confidentiality obligations, and where required by law.
          We do not otherwise disclose it without your consent.
        </p>
      </Section>
      <Section heading="4. Storage and security">
        <p>
          Data is protected by access controls, encryption in transit, and tenant isolation so one
          organisation cannot access another’s data. No system is perfectly secure, but we take
          reasonable steps to protect information and to detect and respond to incidents.
        </p>
      </Section>
      <Section heading="5. Access, correction and erasure">
        <p>
          Account administrators can access and correct their organisation’s records in-app, and can
          export or erase personal data (for example an operator’s contact details) through the
          administration tools. You can also ask us to help with an access or correction request.
        </p>
      </Section>
      <Section heading="6. Retention">
        <p>
          We keep personal information only as long as needed to provide the Service and to meet legal
          and record-keeping obligations (including transport and compliance record requirements), then
          delete or de-identify it.
        </p>
      </Section>
      <Section heading="7. Overseas and cookies">
        <p>
          Where data is processed outside Australia by our providers, we take reasonable steps to ensure
          it is handled consistently with the APPs. We use only the cookies needed to keep you signed in
          and to run the app.
        </p>
      </Section>
      <Section heading="8. Complaints and contact">
        <p>
          To make a privacy request or complaint, contact us at{' '}
          <a href={`mailto:${CONTACT_EMAIL}`} className="text-accent-600 hover:underline">{CONTACT_EMAIL}</a>. If you are
          not satisfied with our response, you may contact the Office of the Australian Information
          Commissioner (OAIC).
        </p>
      </Section>
    </LegalLayout>
  );
}
