'use client';

import { TextLink } from '@plexui/ui/components/TextLink';
import s from './AuthFields.module.css';

/** Demos show static legal text; applications may supply their own destinations. */
export function AuthLegalNotice({ termsHref, privacyHref }: {
  termsHref?: string;
  privacyHref?: string;
}) {
  return (
    <p className={s.LegalNotice}>
      <span className={s.LegalDocument}>
        {termsHref ? <TextLink href={termsHref} target="_blank" rel="noreferrer" className={s.LegalLink}>Terms of Use</TextLink> : <span className={s.LegalLink}>Terms of Use</span>}
      </span>
      <span className={s.LegalDocument}>
        <span aria-hidden="true" className={s.LegalSeparator}>{' | '}</span>
        {privacyHref ? <TextLink href={privacyHref} target="_blank" rel="noreferrer" className={s.LegalLink}>Privacy Policy</TextLink> : <span className={s.LegalLink}>Privacy Policy</span>}
      </span>
    </p>
  );
}
