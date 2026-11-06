import { splitPhoneCountryName } from './phoneCountryName';
import s from './CountryLabel.module.css';

/** Visual fragments shorten the middle; assistive technology gets one unbroken value. */
export function PhoneCountryLabel({ label, dialCode }: { label: string; dialCode?: string }) {
  const { start, end } = splitPhoneCountryName(label);
  return (
    <span className={s.TriggerLabel}>
      <span className="sr-only">{`${label}${dialCode ? ` (${dialCode})` : ''}`}</span>
      <span className={s.TriggerName} aria-hidden="true">
        <span className={s.TriggerStart}>{start}</span>
        <span className={s.TriggerEnd}>{end}</span>
      </span>
      {dialCode && <span className={s.TriggerDialCode} aria-hidden="true">{` (${dialCode})`}</span>}
    </span>
  );
}
