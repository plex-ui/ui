'use client';

import React, { useId, useState } from 'react';
import { OTPInput } from '@plexui/ui/components/OTPInput';
import { FloatingLabelInput } from '@plexui/ui/components/FloatingLabelInput';
import { Button } from '@plexui/ui/components/Button';
import { X } from '@plexui/ui/components/Icon';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { Switch } from '@plexui/ui/components/Switch';

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

  return (
    <div style={controlRowStyle}>
      <label htmlFor={controlId} style={controlLabelStyle}>{name}</label>
      <Switch id={controlId} checked={value} onCheckedChange={onChange} aria-label={name} />
    </div>
  );
}

function DialogShell({ children, width = 420 }: { children: React.ReactNode; width?: number }) {
  return (
    <div style={{ background: 'rgb(0 0 0 / 0.4)', margin: '-48px -24px', padding: '48px 24px', display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300, width: 'calc(100% + 48px)', marginLeft: '-24px', marginRight: '-24px', marginTop: '-48px', marginBottom: '-48px' }}>
      <div style={{ borderRadius: 'var(--radius-xl)', background: 'var(--color-surface-elevated)', boxShadow: 'var(--shadow-lg), var(--shadow-hairline)', width, maxWidth: 'calc(100% - 48px)', overflow: 'hidden' }}>
        <div style={{ display: 'flex', justifyContent: 'flex-end', padding: '10px 10px 0 16px' }}>
          <Button color="secondary" variant="ghost" size="lg" uniform aria-label="Close">
            <X />
          </Button>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 20, padding: '0 24px 40px' }}>
          {children}
        </div>
      </div>
    </div>
  );
}

type InputMode = 'per-digit' | 'text-field';

export function OTPInputOverviewDemo() {
  const [value, setValue] = useState('');

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <OTPInput value={value} onChange={setValue} />
    </div>
  );
}

export function OTPInputFilledDemo() {
  const [value, setValue] = useState('488030');

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <OTPInput value={value} onChange={setValue} />
    </div>
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

export function OTPInputErrorDemo() {
  const [value, setValue] = useState('48803');

  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <OTPInput
        value={value}
        onChange={setValue}
        invalid
        errorMessage="Invalid verification code."
      />
    </div>
  );
}

export function OTPInputDisabledDemo() {
  return (
    <div data-demo-stage className="py-10 flex justify-center">
      <OTPInput value="488030" disabled />
    </div>
  );
}

export function OTPInputCheckInboxErrorDemo() {
  const [inDialog, setInDialog] = useState(false);

  const formContent = (
    <div className="w-[360px]">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold tracking-tight">Check your inbox</h3>
        <p className="text-secondary text-sm mt-1">
          Enter the verification code we just sent to alex.johnson@example.com
        </p>
      </div>
      <div className="flex flex-col gap-3">
        <FloatingLabelInput
          label="Code"
          defaultValue="111111"
          inputMode="numeric"
          invalid
          errorMessage="Incorrect code"
        />
        <Button color="primary" size="3xl" type="button" pill className="w-full h-[3.25rem] mt-3">Continue</Button>
        <p className="text-base text-center mt-4">
          <button type="button" className="hover:underline cursor-pointer bg-transparent border-0 p-0">Resend email</button>
        </p>
      </div>
    </div>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="dialog" value={inDialog} onChange={setInDialog} />
      </div>
      <div data-demo-stage className="py-10 flex justify-center">
        {inDialog ? <DialogShell>{formContent}</DialogShell> : formContent}
      </div>
    </>
  );
}

export function OTPInputVerifyEmailDemo() {
  const [inDialog, setInDialog] = useState(false);
  const [mode, setMode] = useState<InputMode>('per-digit');
  const [otpValue, setOtpValue] = useState('');
  const [code, setCode] = useState('');

  const formContent = (
    <div className="w-[360px]">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold tracking-tight">Verify your email address</h3>
        <p className="text-secondary text-sm mt-1">Enter the code sent to alex.johnson@example.com</p>
      </div>
      {mode === 'per-digit' ? (
        <div className="flex flex-col items-center gap-3">
          <OTPInput value={otpValue} onChange={setOtpValue} />
          <button type="button" className="text-base hover:underline cursor-pointer mt-2 bg-transparent border-0 p-0">Resend email</button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
          }}
          noValidate
        >
          <FloatingLabelInput
            label="Code"
            value={code}
            onChange={(evt) => { setCode(evt.target.value); }}
            inputMode="numeric"
          />
          <Button color="primary" size="3xl" type="submit" pill className="w-full h-[3.25rem] mt-3">Continue</Button>
          <p className="text-base text-center mt-4">
            <button type="button" className="hover:underline cursor-pointer bg-transparent border-0 p-0">Resend email</button>
          </p>
        </form>
      )}
    </div>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="input">
          <SegmentedControl<InputMode>
            value={mode}
            onChange={setMode}
            aria-label="input type"
            size="xs"
          >
            <SegmentedControl.Option value="per-digit">Per-digit</SegmentedControl.Option>
            <SegmentedControl.Option value="text-field">Text field</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="dialog" value={inDialog} onChange={setInDialog} />
      </div>
      <div data-demo-stage className="py-10 flex justify-center">
        {inDialog ? <DialogShell>{formContent}</DialogShell> : formContent}
      </div>
    </>
  );
}

export function OTPInputConfirmPhoneDemo() {
  const [inDialog, setInDialog] = useState(false);
  const [mode, setMode] = useState<InputMode>('per-digit');
  const [otpValue, setOtpValue] = useState('');
  const [code, setCode] = useState('');

  const formContent = (
    <div className="w-[360px]">
      <div className="mb-6 text-center">
        <h3 className="text-2xl font-semibold tracking-tight">Confirm phone</h3>
        <p className="text-secondary text-sm mt-1">Enter the code sent to +1 555 123 4567</p>
      </div>
      {mode === 'per-digit' ? (
        <div className="flex flex-col items-center gap-3">
          <OTPInput value={otpValue} onChange={setOtpValue} />
          <button type="button" className="text-base hover:underline cursor-pointer mt-2 bg-transparent border-0 p-0">Resend code</button>
        </div>
      ) : (
        <form
          className="flex flex-col gap-3"
          onSubmit={(event) => {
            event.preventDefault();
          }}
          noValidate
        >
          <FloatingLabelInput
            label="Code"
            value={code}
            onChange={(evt) => { setCode(evt.target.value); }}
            inputMode="numeric"
          />
          <Button color="primary" size="3xl" type="submit" pill className="w-full h-[3.25rem] mt-3">Continue</Button>
          <p className="text-base text-center mt-4">
            <button type="button" className="hover:underline cursor-pointer bg-transparent border-0 p-0">Resend code</button>
          </p>
        </form>
      )}
    </div>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="input">
          <SegmentedControl<InputMode>
            value={mode}
            onChange={setMode}
            aria-label="input type"
            size="xs"
          >
            <SegmentedControl.Option value="per-digit">Per-digit</SegmentedControl.Option>
            <SegmentedControl.Option value="text-field">Text field</SegmentedControl.Option>
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="dialog" value={inDialog} onChange={setInDialog} />
      </div>
      <div data-demo-stage className="py-10 flex justify-center">
        {inDialog ? <DialogShell>{formContent}</DialogShell> : formContent}
      </div>
    </>
  );
}
