'use client';
import React, { useState } from 'react';
import { AuthInput } from './AuthInput';
import { AuthLegalNotice } from './AuthLegalNotice';
import { Button } from '@plexui/ui/components/Button';
import { AuthFormStage } from './AuthFormStage';
import authFieldsStyles from './AuthFields.module.css';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DemoControlRow, controlsTableStyle } from './ButtonDemos';
import { useDemoControlSync } from './PreviewEmbed';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';

// ---------------------------------------------------------------------------
// Brand logos — canonical SVGs from OpenAI's platform login page (viewBox
// 0 0 24 24, no fixed pixel size). The Button component auto-sizes any SVG
// child to `--button-icon-size`, which at size="3xl" resolves to 20px via
// the design tokens — matching OpenAI's reference exactly. Letting the
// component own the size also adds the canonical optical-alignment offset
// (-1px outward margin on first / last child), so we don't reproduce that
// styling here.
// ---------------------------------------------------------------------------

function GoogleLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M21.0461 12.2099C21.0461 11.5553 20.9874 10.9259 20.8783 10.3217H12.1846V13.8966H17.1524C16.9342 15.0462 16.2797 16.0197 15.2979 16.6742V18.9987H18.2937C20.0391 17.3875 21.0461 15.0211 21.0461 12.2099Z" fill="#4285F4" />
      <path d="M12.1844 21.2307C14.6767 21.2307 16.7662 20.4084 18.2935 18.9986L15.2977 16.6741C14.4753 17.2279 13.4264 17.5636 12.1844 17.5636C9.78441 17.5636 7.74525 15.944 7.01518 13.7622H3.94385V16.1454C5.46273 19.158 8.57602 21.2307 12.1844 21.2307Z" fill="#34A853" />
      <path d="M7.01516 13.7539C6.83054 13.2 6.72145 12.6126 6.72145 12C6.72145 11.3874 6.83054 10.8 7.01516 10.2462V7.86295H3.94382C3.31445 9.10491 2.95361 10.5063 2.95361 12C2.95361 13.4937 3.31445 14.8951 3.94382 16.1371L6.33544 14.2741L7.01516 13.7539Z" fill="#FBBC05" />
      <path d="M12.1844 6.44475C13.5439 6.44475 14.7522 6.91469 15.7173 7.82098L18.3606 5.17762C16.7578 3.68391 14.6767 2.76923 12.1844 2.76923C8.57602 2.76923 5.46273 4.84196 3.94385 7.86294L7.01518 10.2462C7.74525 8.06434 9.78441 6.44475 12.1844 6.44475Z" fill="#EA4335" />
    </svg>
  );
}

function AppleLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true" focusable="false">
      <path d="M20.0911 7.2368C19.3972 7.66168 18.8223 8.25568 18.4204 8.96321C18.0185 9.67075 17.8027 10.4687 17.7932 11.2823C17.7959 12.1981 18.0672 13.0929 18.5735 13.856C19.0798 14.6191 19.7988 15.2169 20.6415 15.5754C20.3093 16.6474 19.8176 17.6632 19.1829 18.5888C18.2748 19.8961 17.3253 21.2032 15.8805 21.2032C14.4358 21.2032 14.0642 20.3638 12.3992 20.3638C10.7755 20.3638 10.1976 21.2308 8.87662 21.2308C7.55564 21.2308 6.63382 20.0198 5.57424 18.5338C4.17461 16.452 3.4054 14.0106 3.35889 11.5024C3.35889 7.37443 6.04214 5.18665 8.68397 5.18665C10.0875 5.18665 11.2572 6.10847 12.1378 6.10847C12.9772 6.10847 14.2844 5.1315 15.8805 5.1315C16.7012 5.11032 17.5145 5.29127 18.2487 5.6584C18.983 6.02553 19.6157 6.56757 20.0911 7.2368ZM15.1238 3.38405C15.8274 2.55637 16.2257 1.51233 16.2521 0.426336C16.2533 0.28317 16.2395 0.140275 16.2108 0C15.0022 0.11806 13.8846 0.694096 13.0872 1.60995C12.3769 2.40465 11.9636 3.42081 11.9176 4.48573C11.9181 4.61524 11.932 4.74435 11.9589 4.87103C12.0542 4.88904 12.1509 4.89827 12.2479 4.89861C12.8049 4.85429 13.347 4.69717 13.8414 4.4368C14.3358 4.17644 14.7721 3.81826 15.1238 3.38405Z" />
    </svg>
  );
}

function MicrosoftLogo() {
  return (
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false">
      <path d="M3.25 3.25H11.25V11.25H3.25V3.25Z" fill="#F35325" />
      <path d="M12.75 3.25H20.75V11.25H12.75V3.25Z" fill="#81BC06" />
      <path d="M3.25 12.75H11.25V20.75H3.25V12.75Z" fill="#05A6F0" />
      <path d="M12.75 12.75H20.75V20.75H12.75V12.75Z" fill="#FFBA08" />
    </svg>
  );
}

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

function OAuthButton({
  icon,
  children,
  onClick,
}: {
  icon: React.ReactNode;
  children: React.ReactNode;
  onClick?: () => void;
}) {
  // Canonical Plex UI pattern: icon as a direct child of Button.
  // ButtonInner is `display: flex; gap: var(--button-gap)`, and the
  // component auto-sizes any SVG child to `--button-icon-size` (20px at
  // size="3xl"). No manual positioning required.
  return (
    <Button
      color="secondary"
      variant="outline"
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
          <OAuthButton icon={<GoogleLogo />}>Continue with Google</OAuthButton>
          <OAuthButton icon={<AppleLogo />}>Continue with Apple</OAuthButton>
          <OAuthButton icon={<MicrosoftLogo />}>Continue with Microsoft</OAuthButton>
          {logIn && <OAuthButton icon={<PhoneLogo />}>Continue with phone</OAuthButton>}
        </div>

        <FooterLinks />
      </div>
    </AuthFormStage>
    </>
  );
}
