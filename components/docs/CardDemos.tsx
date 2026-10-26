'use client';

import { useState } from 'react';
import { Card } from '@plexui/ui/components/Card';
import { Button } from '@plexui/ui/components/Button';
import { Input } from '@plexui/ui/components/Input';
import { Field } from '@plexui/ui/components/Field';
import { Label } from '@plexui/ui/components/Label';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { TextLink } from '@plexui/ui/components/TextLink';
import { EmptyMessage } from '@plexui/ui/components/EmptyMessage';
import { LoadingIndicator } from '@plexui/ui/components/Indicator';
import { Check, UserAdd } from '@plexui/ui/components/Icon';
import { PaymentMethodForm } from './_shared/PaymentMethodForm';

/* ============================================================
   Overview — hello-world Card used as the first demo
   ============================================================ */

export function CardOverviewDemo() {
  return (
    <Card style={{ maxWidth: 380 }}>
      <Card.Header>
        <Card.Title>Project activity</Card.Title>
        <Card.Description>
          Your team opened 12 issues and closed 8 pull requests over the last 7 days.
        </Card.Description>
      </Card.Header>
      <Card.Footer>
        <Button color="primary" variant="solid" size="sm" pill={false}>
          View report
        </Button>
        <Button color="secondary" variant="outline" size="sm" pill={false}>
          Dismiss
        </Button>
      </Card.Footer>
    </Card>
  );
}

/* ============================================================
   Login — classic shadcn example
   ============================================================ */

export function CardLoginDemo() {
  return (
    <Card style={{ maxWidth: 380 }}>
      <Card.Header>
        <Card.Title>Log in to your account</Card.Title>
        <Card.Description>
          Enter your email below to log in to your account.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="Email">
            <Input type="email" placeholder="you@example.com" />
          </Field>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                gap: 8,
              }}
            >
              <Label htmlFor="card-login-password">Password</Label>
              <TextLink href="#" primary>
                Forgot your password?
              </TextLink>
            </div>
            <Input id="card-login-password" type="password" />
          </div>
        </div>
      </Card.Content>
      <Card.Footer
        style={{ flexDirection: 'column', alignItems: 'stretch', gap: 12 }}
      >
        <Button color="primary" variant="solid" block pill={false}>
          Log in
        </Button>
        {/* Description sits flush under a title by default; here it follows a button */}
        <Card.Description className="text-center" style={{ margin: 0 }}>
          Don&apos;t have an account?{' '}
          <TextLink href="#" primary>
            Sign up
          </TextLink>
        </Card.Description>
      </Card.Footer>
    </Card>
  );
}

/* ============================================================
   Create project — form with name + region
   ============================================================ */

export function CardCreateProjectDemo() {
  return (
    <Card style={{ maxWidth: 380 }}>
      <Card.Header>
        <Card.Title>Create project</Card.Title>
        <Card.Description>
          Deploy a new project in one-click with sensible defaults.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>
          <Field label="Name">
            <Input placeholder="billing-service" />
          </Field>
          <Field
            label="Region"
            description="Where your functions and database will live."
          >
            <Input placeholder="us-east-1" />
          </Field>
        </div>
      </Card.Content>
      <Card.Footer style={{ justifyContent: 'flex-end' }}>
        <Button color="secondary" variant="outline" size="sm" pill={false}>
          Cancel
        </Button>
        <Button color="primary" variant="solid" size="sm" pill={false}>
          Deploy
        </Button>
      </Card.Footer>
    </Card>
  );
}

/* ============================================================
   Payment Method — card-details form
   ============================================================ */

export function CardPaymentMethodDemo() {
  return (
    <Card style={{ maxWidth: 420 }}>
      <PaymentMethodForm />
    </Card>
  );
}

/* ============================================================
   No Team Members — empty state
   ============================================================ */

export function CardNoTeamMembersDemo() {
  return (
    <Card style={{ maxWidth: 380, padding: 24 }}>
      <EmptyMessage>
        <EmptyMessage.Icon>
          <UserAdd />
        </EmptyMessage.Icon>
        <EmptyMessage.Title>No team members</EmptyMessage.Title>
        <EmptyMessage.Description>
          Invite your team to collaborate on this project.
        </EmptyMessage.Description>
        <EmptyMessage.ActionRow>
          <Button color="primary" variant="solid" size="sm" pill={false}>
            Invite members
          </Button>
        </EmptyMessage.ActionRow>
      </EmptyMessage>
    </Card>
  );
}

/* ============================================================
   Survey — "How did you hear about us?"
   ============================================================ */

export function CardSurveyDemo() {
  const [source, setSource] = useState<string>('social');

  return (
    <Card style={{ maxWidth: 380 }}>
      <Card.Header>
        <Card.Title>How did you hear about us?</Card.Title>
        <Card.Description>
          Select the option that best describes how you heard about us.
        </Card.Description>
      </Card.Header>
      <Card.Content>
        <RadioGroup value={source} onChange={setSource} direction="col">
          <RadioGroup.Item value="social" block>
            Social Media
          </RadioGroup.Item>
          <RadioGroup.Item value="search" block>
            Search Engine
          </RadioGroup.Item>
          <RadioGroup.Item value="referral" block>
            Referral
          </RadioGroup.Item>
          <RadioGroup.Item value="other" block>
            Other
          </RadioGroup.Item>
        </RadioGroup>
      </Card.Content>
      <Card.Footer>
        <Button color="primary" variant="solid" block pill={false}>
          Submit
        </Button>
      </Card.Footer>
    </Card>
  );
}

/* ============================================================
   Processing your request — loading state
   ============================================================ */

export function CardProcessingDemo() {
  return (
    <Card style={{ maxWidth: 380, padding: 24 }}>
      <EmptyMessage>
        <div style={{ marginBottom: 12, color: 'var(--color-text-tertiary)' }}>
          <LoadingIndicator size={28} />
        </div>
        <EmptyMessage.Title>Processing your request</EmptyMessage.Title>
        <EmptyMessage.Description>
          Please wait while we process your request. Do not refresh the page.
        </EmptyMessage.Description>
        <EmptyMessage.ActionRow>
          <Button color="secondary" variant="outline" size="sm" pill={false}>
            Cancel
          </Button>
        </EmptyMessage.ActionRow>
      </EmptyMessage>
    </Card>
  );
}

/* ============================================================
   Pricing — highlighted plan with features + CTA
   ============================================================ */

export function CardPricingDemo() {
  return (
    <div
      style={{
        display: 'grid',
        gap: 16,
        gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
        maxWidth: 720,
      }}
    >
      {[
        {
          name: 'Starter',
          price: '$0',
          highlighted: false,
          features: ['1 project', 'Community support', 'Plex UI core'],
        },
        {
          name: 'Pro',
          price: '$19',
          highlighted: true,
          features: [
            'Unlimited projects',
            'Priority support',
            'All Figma kits',
            'Early components',
          ],
        },
      ].map((plan) => (
        <Card key={plan.name} variant={plan.highlighted ? 'solid' : 'outline'}>
          <Card.Header>
            <Card.Title>{plan.name}</Card.Title>
            <Card.Description>
              <span
                style={{
                  fontSize: 28,
                  fontWeight: 600,
                  color: 'var(--color-text)',
                }}
              >
                {plan.price}
              </span>
              <span style={{ marginLeft: 4 }}>/ month</span>
            </Card.Description>
          </Card.Header>
          <Card.Content>
            <ul
              style={{
                listStyle: 'none',
                padding: 0,
                margin: 0,
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
              }}
            >
              {plan.features.map((f) => (
                <li
                  key={f}
                  style={{ display: 'flex', alignItems: 'center', gap: 8 }}
                >
                  <Check
                    style={{
                      width: 16,
                      height: 16,
                      color: 'var(--color-text-success-soft)',
                    }}
                  />
                  {f}
                </li>
              ))}
            </ul>
          </Card.Content>
          <Card.Footer style={{ marginTop: 'auto', paddingTop: 4 }}>
            <Button
              color={plan.highlighted ? 'primary' : 'secondary'}
              variant={plan.highlighted ? 'solid' : 'outline'}
              block
              pill={false}
            >
              Choose {plan.name}
            </Button>
          </Card.Footer>
        </Card>
      ))}
    </div>
  );
}
