'use client';
import React, { useState } from 'react';
import { AuthInput } from './AuthInput';
import { AuthLegalNotice } from './AuthLegalNotice';
import { Button } from '@plexui/ui/components/Button';
import { AppleLogo, GoogleLogo, MicrosoftLogo } from '@plexui/ui/components/Icon';
import { AuthFormStage } from './AuthFormStage';
import authFieldsStyles from './AuthFields.module.css';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { useDemoControlSync } from './PreviewEmbed';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';

// ---------------------------------------------------------------------------
// Brand logos come from the kit's Icon set (AppleLogo, GoogleLogo,
// MicrosoftLogo). The Button sizes any SVG child to `--button-icon-size`,
// 20px at size="3xl". The phone glyph stays a helper of the example.
// ---------------------------------------------------------------------------

function PhoneLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M2 5.57143C2 3.59898 3.59898 2 5.57143 2H8.625C9.0287 2 9.39281 2.24274 9.54808 2.61538L11.4231 7.11538C11.5744 7.47863 11.4987 7.89686 11.2295 8.18394L9.82741 9.67954C10.9044 11.7563 12.2732 13.2047 14.3016 14.2842L15.7929 12.7929C16.0794 12.5064 16.5106 12.4211 16.8846 12.5769L21.3846 14.4519C21.7573 14.6072 22 14.9713 22 15.375V18.4286C22 20.401 20.401 22 18.4286 22C9.35532 22 2 14.6447 2 5.57143ZM5.57143 4C4.70355 4 4 4.70355 4 5.57143C4 13.5401 10.4599 20 18.4286 20C19.2964 20 20 19.2964 20 18.4286V16.0417L16.7336 14.6807L15.2071 16.2071C14.9098 16.5044 14.4582 16.584 14.0771 16.4062C11.0315 14.9849 9.12076 12.9271 7.71882 9.92289C7.54598 9.55251 7.61592 9.11423 7.89546 8.81606L9.32824 7.28777L7.95833 4H5.57143Z" />
    </svg>
  );
}

// ---------------------------------------------------------------------------
// Shared layout primitives
// ---------------------------------------------------------------------------

type Providers = 'outline' | 'primary';

function OAuthButton({
  icon,
  children,
  onClick,
  providers = 'outline',
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
  providers?: Providers;
}) {
  // Canonical Plex UI pattern: icon as a direct child of Button.
  // ButtonInner is `display: flex; gap: var(--button-gap)`, and the
  // component auto-sizes any SVG child to `--button-icon-size` (20px at
  // size="3xl"). No manual positioning required.
  return (
    <Button
      {...(providers === 'primary' ? { color: 'primary' as const } : { color: 'secondary' as const, variant: 'outline' as const })}
      size="3xl"
      type="button"
      pill
      block
      onClick={onClick}
      className="h-[3.25rem]"
    >
      {icon}
      {children}
    </Button>
  );
}

function OrDivider() {
  // OpenAI-style: two hairlines with OR centered between them. Flexbox
  // `items-center` guarantees the text baseline lines up with the hairline.
  // The label is bold and uses foreground (near-black) to match the reference.
  return (
    <div className="my-7 flex items-center gap-3" role="separator" aria-orientation="horizontal">
      <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-fd-border)]" />
      <span className="text-xs font-semibold uppercase tracking-wider text-fd-foreground select-none">
        OR
      </span>
      <span aria-hidden="true" className="h-px flex-1 bg-[var(--color-fd-border)]" />
    </div>
  );
}

function FooterLinks() {
  return <div className="mt-8"><AuthLegalNotice /></div>;
}

function CrossLink({
  prompt,
  label,
  onClick,
}: {
  prompt: string;
  label: string;
  onClick: () => void;
}) {
  // The "Don't have an account? Sign up" / "Already have an account? Log in"
  // link that sits between the Continue button and the OR divider.
  return (
    <p className={["text-base text-center mt-6", authFieldsStyles.CrossActionRow, authFieldsStyles.StandaloneCrossActionRow].join(" ")}>
      {prompt}{' '}
      <Button type="button" color="info" variant="ghost" onClick={onClick}
        className={[authFieldsStyles.TextAction, authFieldsStyles.OAuthTextAction].join(" ")}>
        {label}
      </Button>
    </p>
  );
}

// ---------------------------------------------------------------------------
// Log in or sign up — "Welcome back" / "Create an account"
// Email + Continue → cross-link to the other mode → OR → Google / Apple /
// Microsoft (and phone when logging in) → Terms / Privacy footer.
// Matches OpenAI Platform's /login and /signup pages; the mode control and
// the cross-link switch between them.
// ---------------------------------------------------------------------------

type AuthMode = 'log-in' | 'sign-up';

export function OAuthFormDemo({ initialMode = 'log-in' }: { initialMode?: AuthMode }) {
  const presentation = useScreenPresentation();
  const [mode, setMode] = useState<AuthMode>(initialMode);
  useDemoControlSync('mode', mode, setMode);
  const [providers, setProviders] = useState<Providers>('outline');
  useDemoControlSync('providers', providers, setProviders);
  const [email, setEmail] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const isEmailValid = /.+@.+\..+/.test(email);
  const showError = submitted && !isEmailValid;
  const logIn = mode === 'log-in';
  const title = logIn ? 'Welcome back' : 'Create an account';

  const handleSubmit = (evt: React.FormEvent<HTMLFormElement>) => {
    evt.preventDefault();
    setSubmitted(true);
  };

  return (
    <>
    <div data-demo-controls style={controlsTableStyle}>
      <DemoControlRow name="mode">
        <SegmentedControl<AuthMode> value={mode} onChange={setMode} aria-label="mode" size="xs">
          <SegmentedControl.Option value="log-in">Log in</SegmentedControl.Option>
          <SegmentedControl.Option value="sign-up">Sign up</SegmentedControl.Option>
        </SegmentedControl>
      </DemoControlRow>
      <DemoControlRow name="providers">
        <SegmentedControl<Providers> value={providers} onChange={setProviders} aria-label="providers" size="xs">
          <SegmentedControl.Option value="outline">Outline</SegmentedControl.Option>
          <SegmentedControl.Option value="primary">Primary</SegmentedControl.Option>
        </SegmentedControl>
      </DemoControlRow>
      <ScreenPresentationControls {...presentation} />
    </div>
    <AuthFormStage title={title} surface={presentation.surface} dialog={presentation.dialog} onDialogChange={presentation.setDialog}>
      <div className="w-[360px]">
        <div className="mb-8 text-center">
          <h3 data-auth-title className="text-3xl font-semibold tracking-tight leading-[1.1]">{title}</h3>
        </div>

        <form className="flex flex-col gap-3 [--field-group-gap:0px]" onSubmit={handleSubmit} noValidate>
          <AuthInput
            label="Email address"
            type="email"
            value={email}
            onChange={(evt) => {
              setEmail(evt.target.value);
              setSubmitted(false);
            }}
            invalid={showError}
            errorMessage={showError ? 'Email is not valid.' : undefined}
          />
          <Button color="primary" size="3xl" type="submit" pill block className="h-[3.25rem]">
            Continue
          </Button>
        </form>

        <CrossLink prompt={logIn ? "Don't have an account?" : 'Already have an account?'} label={logIn ? 'Sign up' : 'Log in'}
          onClick={() => setMode(logIn ? 'sign-up' : 'log-in')} />

        <OrDivider />

        <div className="flex flex-col gap-3 [--field-group-gap:0px]">
          <OAuthButton providers={providers} icon={<GoogleLogo />}>Continue with Google</OAuthButton>
          <OAuthButton providers={providers} icon={<AppleLogo />}>Continue with Apple</OAuthButton>
          <OAuthButton providers={providers} icon={<MicrosoftLogo />}>Continue with Microsoft</OAuthButton>
          {logIn && <OAuthButton providers={providers} icon={<PhoneLogo />}>Continue with phone</OAuthButton>}
        </div>

        <FooterLinks />
      </div>
    </AuthFormStage>
    </>
  );
}
