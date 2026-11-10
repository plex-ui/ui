'use client';

import React, { useEffect, useId, useState } from 'react';
import { OTPInput } from '@plexui/ui/components/OTPInput';
import { AuthInput } from './AuthInput';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { RESEND_WAIT_SECONDS, createVerificationAttempt, isVerificationCodeReady, startResendCountdown } from './verificationCountdown';
import authFieldsStyles from './AuthFields.module.css';
import { Button } from '@plexui/ui/components/Button';
import { LoadingIndicator } from '@plexui/ui/components/Indicator';
import { AuthFormStage } from './AuthFormStage';
import { useDemoControlSync } from './PreviewEmbed';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';

const controlsTableStyle: React.CSSProperties = {
  background: 'var(--docs-surface-elevated)',
  width: '100%',
};

const controlRowStyle: React.CSSProperties = {
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'space-between',
  padding: '6px 16px 6px 8px',
  borderTop: '1px solid var(--color-fd-border)',
};

const controlLabelStyle: React.CSSProperties = {
  fontFamily: 'var(--font-mono, ui-monospace, monospace)',
  fontSize: '0.8125rem',
  padding: '2px 8px',
};

function DemoControlRow({ name, children }: { name: string; children: React.ReactNode }) {
  return (
    <div style={controlRowStyle}>
      <span style={controlLabelStyle}>{name}</span>
      <div style={{ display: 'flex', alignItems: 'center' }}>{children}</div>
    </div>
  );
}

function DemoControlBoolean({
  name,
  value,
  onChange,
}: {
  name: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  const controlId = useId();
  useDemoControlSync(name, value, onChange);

  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

type InputMode = 'per-digit' | 'text-field';
type OTPValuePreset = 'empty' | 'filled' | 'custom';

export function OTPInputOverviewDemo() {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const preset: OTPValuePreset = value === '' ? 'empty' : value === '488030' ? 'filled' : 'custom';
  const applyPreset = (next: OTPValuePreset) => {
    if (next !== 'custom') setValue(next === 'filled' ? '488030' : '');
  };
  useDemoControlSync('preset', preset, applyPreset);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="preset">
          <SegmentedControl<OTPValuePreset> value={preset} onChange={applyPreset} aria-label="preset" size="xs">
            <SegmentedControl.Option value="empty">Empty</SegmentedControl.Option>
            <SegmentedControl.Option value="filled">Filled</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="error" value={error} onChange={setError} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <div data-demo-stage className="py-10 flex justify-center">
        <OTPInput value={value} onChange={setValue} invalid={error}
          errorMessage={error ? 'Invalid verification code.' : undefined} disabled={disabled} />
      </div>
    </>
  );
}

export function OTPInputGroupedDemo() {
  const [value, setValue] = useState('');

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <OTPInput value={value} onChange={setValue} grouping={[3, 3]} />
    </div>
  );
}

type Channel = 'email' | 'phone';

// One verification screen for both channels: the channel only changes the copy.
const CHANNEL_COPY: Record<Channel, { title: string; description: string; resendLabel: string }> = {
  email: { title: 'Verify your email address', description: 'Enter the code sent to alex.johnson@example.com', resendLabel: 'Resend email' },
  phone: { title: 'Confirm phone', description: 'Enter the code sent to +1 555 123 4567', resendLabel: 'Resend code' },
};

export function OTPInputVerificationDemo({ initialChannel = 'email' }: { initialChannel?: Channel }) {
  const [channel, setChannel] = useState<Channel>(initialChannel);
  useDemoControlSync('channel', channel, setChannel);
  const { title, description, resendLabel } = CHANNEL_COPY[channel];
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const formId = useId();
  const [attempt] = useState(createVerificationAttempt);
  const [error, setError] = useState(false);
  const [cooldown, setCooldown] = useState(false);
  const [seconds, setSeconds] = useState(RESEND_WAIT_SECONDS);
  const [verifying, setVerifying] = useState(false);
  const [mode, setMode] = useState<InputMode>('per-digit');
  useDemoControlSync('input', mode, setMode);
  const [otpValue, setOtpValue] = useState('');
  const [code, setCode] = useState('');
  const ready = isVerificationCodeReady(mode, mode === 'per-digit' ? otpValue : code);
  const updateVerifying = (value: boolean) => {
    attempt.setPending(value);
    setVerifying(value);
  };
  const updateError = (value: boolean) => {
    setError(value);
    if (value) updateVerifying(false);
  };
  const editCode = (value: string) => {
    attempt.edit(value);
    setError(false);
  };
  const completeCode = (value: string) => {
    if (!attempt.start('per-digit', value)) return;
    setError(false);
    setVerifying(true);
  };

  useEffect(() => {
    if (!cooldown) return;
    return startResendCountdown(setSeconds, () => setCooldown(false));
  }, [cooldown]);

  const actions = mode === 'text-field' ? (
    <div className="w-full" data-verification-actions>
      <Button color="primary" size="3xl" type="submit" form={formId} pill block className="md:h-[3.25rem]"
        loading={verifying} disabled={!ready} aria-busy={verifying}>Continue</Button>
    </div>
  ) : undefined;

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="channel">
          <SegmentedControl<Channel> value={channel} onChange={setChannel} aria-label="channel" size="xs">
            <SegmentedControl.Option value="email">Email</SegmentedControl.Option>
            <SegmentedControl.Option value="phone">Phone</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="input">
          <SegmentedControl<InputMode> value={mode} onChange={setMode} aria-label="input type" size="xs">
            <SegmentedControl.Option value="per-digit">Per-digit</SegmentedControl.Option>
            <SegmentedControl.Option value="text-field">Text field</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="error" value={error} onChange={updateError} />
        <DemoControlBoolean name="cooldown" value={cooldown} onChange={setCooldown} />
        <DemoControlBoolean name="verifying" value={verifying} onChange={updateVerifying} />
        <ScreenPresentationControls {...presentation} />
      </div>
      <AuthFormStage keyboard="numeric" title={title} dialog={presentation.dialog}
        surface={presentation.surface} onDialogChange={presentation.setDialog} footer={actions}>
        <div className="w-[360px]">
          <div className="mb-6 text-center">
            <h3 data-auth-title className="text-2xl font-semibold tracking-tight">{title}</h3>
            <p data-auth-description className="text-secondary text-sm mt-1">{description}</p>
          </div>
          <form id={formId} className="flex flex-col gap-6" noValidate aria-busy={verifying}
            onSubmit={(event) => {
              event.preventDefault();
              if (mode === 'text-field' && attempt.start(mode, code)) {
                setError(false);
                setVerifying(true);
              }
            }}>
            <div className="flex flex-col gap-2" data-verification-code>
              {mode === 'per-digit' ? (
                <div className="flex justify-center">
                  <OTPInput value={otpValue} onChange={(value) => { editCode(value); setOtpValue(value); }}
                    onComplete={completeCode} invalid={error}
                    errorMessage={error ? 'Incorrect code' : undefined} disabled={verifying}
                    className={authFieldsStyles.Otp} />
                </div>
              ) : (
                <AuthInput label="Code" value={code} invalid={error}
                  errorMessage={error ? 'Incorrect code' : undefined} disabled={verifying}
                  onChange={(event) => { editCode(event.target.value); setCode(event.target.value); }} inputMode="numeric" />
              )}
              <div data-verification-resend className="flex h-11 items-center justify-center">
              {mode === 'per-digit' && verifying ? (
                <LoadingIndicator role="status" aria-label="Checking code" />
              ) : (
              <Button type="button" color="secondary" variant="ghost" size="xl"
                className="h-11 w-full font-normal" disabled={cooldown || verifying}
                onClick={() => {
                  if (cooldown || verifying || attempt.isPending()) return;
                  attempt.reset();
                  setError(false);
                  setCooldown(true);
                }}>
                {cooldown ? `${resendLabel} (${seconds}s)` : resendLabel}
              </Button>
              )}
              </div>
            </div>
            {wide && actions}
          </form>
        </div>
      </AuthFormStage>
    </>
  );
}
