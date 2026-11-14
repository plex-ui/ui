'use client';

import { useId, useState } from 'react';
import { Alert } from '@plexui/ui/components/Alert';
import { Button } from '@plexui/ui/components/Button';
import { Field } from '@plexui/ui/components/Field';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { AuthInput } from './AuthInput';
import { AuthFields } from './AuthFields';
import { RadioGroup } from '@plexui/ui/components/RadioGroup';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { AuthFormStage } from './AuthFormStage';
import { controlsTableStyle } from './ButtonDemos';
import { VueFormExampleDemo } from './vue/VueFormExamplesDemos';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';

type StorageRegion = '' | 'eu' | 'us';

export const STORAGE_REGIONS = [
  { value: 'eu', label: 'European Union (EU)' },
  { value: 'us', label: 'United States (US)' },
] as const;
export const PASSWORD_HINT = 'Your password must be at least 8 characters, include a number, an uppercase letter and a lowercase letter.';

type PasswordValidationErrors = { password?: string; confirmation?: string };

export function passwordErrors(password: string, confirmation: string): PasswordValidationErrors {
  return {
    password: !password ? 'Enter a password.' : !/^(?=.*[a-z])(?=.*[A-Z])(?=.*\d).{8,}$/.test(password) ? 'Password does not meet the requirements.' : undefined,
    confirmation: !confirmation ? 'Confirm your password.' : confirmation !== password ? 'Passwords do not match.' : undefined,
  };
}

export function CreatePasswordDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const formId = useId();
  const [password, setPassword] = useState('');
  const [confirmation, setConfirmation] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const [completed, setCompleted] = useState(false);
  const errors: PasswordValidationErrors = submitted ? passwordErrors(password, confirmation) : {};
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (completed) return;
    setSubmitted(true);
    const invalid = passwordErrors(password, confirmation);
    if (invalid.password || invalid.confirmation) return;
    setCompleted(true);
    setSubmitted(false);
    setPassword('');
    setConfirmation('');
  };
  const action = completed ? (
    <Button color="primary" size="3xl" pill block onClick={() => setCompleted(false)}>Start over</Button>
  ) : (
    <Button color="primary" size="3xl" type="submit" form={formId} pill block>Continue</Button>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <ScreenPresentationControls {...presentation} />
      </div>
      <AuthFormStage title="Create Password" surface={presentation.surface} dialog={presentation.dialog} onDialogChange={presentation.setDialog} footer={action}>
        <div className="w-full min-w-0">
          <div className="mb-6 text-center">
            <h3 data-auth-title className="text-2xl font-semibold tracking-tight">Create Password</h3>
          </div>
          <form id={formId} className="flex flex-col gap-6 [--field-group-gap:13px]" noValidate onSubmit={submit}>
            <AuthFields className="flex flex-col gap-2" footer={<span id={`${formId}-password-hint`}>{PASSWORD_HINT}</span>}>
              <AuthInput label="Password" type="password"
                value={password} autoComplete="off" allowAutofillExtensions={false} disabled={completed}
                aria-describedby={!wide ? `${formId}-password-hint` : undefined}
                onChange={(event) => { setPassword(event.target.value); setSubmitted(false); }}
                invalid={!!errors.password} errorMessage={errors.password} />
              <AuthInput label="Confirm Password" type="password"
                value={confirmation} autoComplete="off" allowAutofillExtensions={false} disabled={completed}
                onChange={(event) => { setConfirmation(event.target.value); setSubmitted(false); }}
                invalid={!!errors.confirmation} errorMessage={errors.confirmation} description={wide ? PASSWORD_HINT : undefined}
                aria-describedby={!wide ? `${formId}-password-hint` : undefined} />
            </AuthFields>
            {completed && <div role="status"><Alert color="success" variant="soft" title="Preview complete"
              description="Password validated. No account was created." /></div>}
            {wide && action}
          </form>
        </div>
      </AuthFormStage>
    </>
  );
}

export function StorageLocationDemo() {
  const presentation = useScreenPresentation();
  const wide = useBreakpoint('md');
  const formId = useId();
  const [region, setRegion] = useState<StorageRegion>('');
  const [completed, setCompleted] = useState(false);
  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (region && !completed) setCompleted(true);
  };
  const action = completed ? (
    <Button color="primary" size="3xl" pill block onClick={() => { setRegion(''); setCompleted(false); }}>Start over</Button>
  ) : (
    <Button color="primary" size="3xl" type="submit" form={formId} pill block disabled={!region}>Continue</Button>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <ScreenPresentationControls {...presentation} />
      </div>
      <AuthFormStage title="Choose Storage Location" surface={presentation.surface} dialog={presentation.dialog} onDialogChange={presentation.setDialog} footer={action}>
        <div className="w-full min-w-0">
          <div className="mb-6 text-center">
            <h3 data-auth-title className="text-2xl font-semibold tracking-tight">Choose Storage Location</h3>
            <p data-auth-description className="text-secondary text-sm mt-2">Select where your documents will be stored. This cannot be changed later.</p>
          </div>
          <form id={formId} className="flex flex-col gap-6 [--field-group-gap:13px]" noValidate onSubmit={submit}>
            <RadioGroup name={`${formId}-storage-region`} aria-label="Storage location" value={region} disabled={completed} direction="col"
              onChange={(value: StorageRegion) => setRegion(value)} className="w-full">
              <FieldGroup className="w-full">
                {STORAGE_REGIONS.map((option) => <Field key={option.value} row label={option.label}>
                  <RadioGroup.Item value={option.value} />
                </Field>)}
              </FieldGroup>
            </RadioGroup>
            {completed && <div role="status"><Alert color="success" variant="soft" title="Preview complete"
              description={`Selected storage location: ${STORAGE_REGIONS.find((option) => option.value === region)?.label}. No account was created.`} /></div>}
            {wide && action}
          </form>
        </div>
      </AuthFormStage>
    </>
  );
}

export function VueCreatePasswordDemo({ template }: { template: string }) {
  return <VueFormExampleDemo auth template={template}
    state={{ password: '', confirmation: '', submitted: false, completed: false, passwordErrors, passwordHint: PASSWORD_HINT }} />;
}

export function VueStorageLocationDemo({ template }: { template: string }) {
  return <VueFormExampleDemo auth template={template}
    state={{ region: '', completed: false, storageRegions: STORAGE_REGIONS }} />;
}
