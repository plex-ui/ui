'use client';

import { Accordion } from '@plexui/ui/components/Accordion';
import { Card } from '@plexui/ui/components/Card';

/* ============================================================
   Overview — shipping / returns / support FAQ
   ============================================================ */

export function AccordionOverviewDemo() {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="shipping"
      style={{ width: '100%', maxWidth: 384 }}
    >
      <Accordion.Item value="shipping">
        <Accordion.Trigger>What are your shipping options?</Accordion.Trigger>
        <Accordion.Content>
          We offer standard (5–7 business days), express (2–3 days), and
          overnight shipping. Free standard shipping on orders over $50.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="returns">
        <Accordion.Trigger>What is your return policy?</Accordion.Trigger>
        <Accordion.Content>
          Returns are accepted within 30 days of delivery. Items must be unused
          and in original packaging. Refunds are processed within 5–7 business
          days of receipt.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="support">
        <Accordion.Trigger>How can I contact customer support?</Accordion.Trigger>
        <Accordion.Content>
          Reach us by email, live chat, or phone Monday through Friday, 9am–6pm
          ET. Weekend tickets are handled within 24 hours.
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

/* ============================================================
   Single — account / billing basics
   ============================================================ */

const singleItems = [
  {
    value: 'trial',
    trigger: 'How long is the free trial?',
    content:
      '14 days, no credit card required. At the end of the trial you can keep the free tier or upgrade to Pro; your projects stay in place either way.',
  },
  {
    value: 'plan',
    trigger: 'Can I change plans mid-cycle?',
    content:
      'Yes. Upgrades are prorated immediately; downgrades take effect at the next billing date. Invoices always reflect the exact span each plan was active.',
  },
  {
    value: 'invoices',
    trigger: 'Where can I find past invoices?',
    content:
      'Billing → Invoices in your workspace settings. Every PDF is archived for seven years and can be pulled via the Billing API.',
  },
];

export function AccordionSingleDemo() {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="trial"
      style={{ width: '100%', maxWidth: 384 }}
    >
      {singleItems.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Trigger>{item.trigger}</Accordion.Trigger>
          <Accordion.Content>{item.content}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

/* ============================================================
   Multiple — account settings, several open at once
   ============================================================ */

const multipleItems = [
  {
    value: 'notifications',
    trigger: 'Notification settings',
    content:
      'Pick which events trigger email, push, or in-app alerts. Release-blocker incidents always page the on-call regardless of quiet hours.',
  },
  {
    value: 'privacy',
    trigger: 'Privacy & security',
    content:
      'Turn on two-factor, review active sessions, and manage connected apps. Workspace admins can also enforce SSO and hardware-key policies org-wide.',
  },
  {
    value: 'billing',
    trigger: 'Billing & subscription',
    content:
      'View your current plan, payment method, and upcoming renewal. Seat changes apply immediately; the next invoice will include a prorated adjustment.',
  },
];

export function AccordionMultipleDemo() {
  return (
    <Accordion
      type="multiple"
      defaultValue={['notifications']}
      style={{ width: '100%', maxWidth: 384 }}
    >
      {multipleItems.map((item) => (
        <Accordion.Item key={item.value} value={item.value}>
          <Accordion.Trigger>{item.trigger}</Accordion.Trigger>
          <Accordion.Content>{item.content}</Accordion.Content>
        </Accordion.Item>
      ))}
    </Accordion>
  );
}

/* ============================================================
   Disabled — middle item not available on current plan
   ============================================================ */

export function AccordionDisabledDemo() {
  return (
    <Accordion
      type="single"
      collapsible
      defaultValue="history"
      style={{ width: '100%', maxWidth: 384 }}
    >
      <Accordion.Item value="history">
        <Accordion.Trigger>Can I see my usage history?</Accordion.Trigger>
        <Accordion.Content>
          Yes, the Activity tab logs every API call, deploy, and admin action
          for the last 90 days. Longer retention requires the Enterprise plan.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="audit" disabled>
        <Accordion.Trigger>Audit log export (Enterprise only)</Accordion.Trigger>
        <Accordion.Content>
          Upgrade to Enterprise to stream audit events to S3, Splunk, or your
          SIEM of choice.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="two-factor">
        <Accordion.Trigger>How do I enable two-factor auth?</Accordion.Trigger>
        <Accordion.Content>
          Settings → Security → Two-factor. You can use an authenticator app or
          a FIDO2 hardware key. Recovery codes are issued once at enrollment.
        </Accordion.Content>
      </Accordion.Item>
    </Accordion>
  );
}

/* ============================================================
   Card — Accordion composed inside Card
   ============================================================ */

const cardItems = [
  {
    value: 'plans',
    trigger: 'What subscription plans do you offer?',
    content:
      'Starter ($9/mo), Pro ($29/mo), and Enterprise (from $99/mo). Each tier raises seat, project, and API call limits; Enterprise adds SSO, audit log export, and a dedicated success manager.',
  },
  {
    value: 'billing',
    trigger: 'How does billing work?',
    content:
      'Billed at the start of each cycle. We accept all major cards, and ACH or invoice for annual Enterprise contracts. Every invoice is emailed and archived in Billing → Invoices.',
  },
  {
    value: 'cancel',
    trigger: 'How do I cancel my subscription?',
    content:
      'Cancel anytime from Billing → Plan. No cancellation fee. Access continues through the end of the current billing period, and projects stay read-only afterwards. Nothing is deleted.',
  },
];

export function AccordionCardDemo() {
  return (
    <Card style={{ width: '100%', maxWidth: 384 }}>
      <Card.Header>
        <Card.Title>Subscription & billing</Card.Title>
        <Card.Description>
          Common questions about plans, invoices, and cancellations.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <Accordion type="single" collapsible defaultValue="plans">
          {cardItems.map((item) => (
            <Accordion.Item key={item.value} value={item.value}>
              <Accordion.Trigger>{item.trigger}</Accordion.Trigger>
              <Accordion.Content>{item.content}</Accordion.Content>
            </Accordion.Item>
          ))}
        </Accordion>
      </Card.Content>
    </Card>
  );
}
