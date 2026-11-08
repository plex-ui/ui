export type SetupMethodId = 'email' | 'phone' | 'passkey' | 'security-key';

export type SetupMethod = {
  id: SetupMethodId;
  title: string;
  /** One line under the title when the rows show subtitles. */
  subtitle: string;
  /** The text of the step this row opens. */
  detail: string;
};

export type SetupChoicesLayout = 'grouped' | 'separate';

export const setupIntro = {
  title: 'Add a Sign-In Method',
  description: 'Add another way to sign in, so you can still reach this sample account if one method stops working.',
};

export const setupMethods: readonly SetupMethod[] = [
  { id: 'email', title: 'Email Address', subtitle: 'Get a sign-in link by email.', detail: 'Sign-in links go to an email address you can open on any device. In this preview no email is sent.' },
  { id: 'phone', title: 'Phone Number', subtitle: 'Get a code by text message.', detail: 'Codes arrive by text message on the phone you add. In this preview no message is sent.' },
  { id: 'passkey', title: 'Passkey', subtitle: 'Use your face, fingerprint or device PIN.', detail: 'A passkey stays on your devices and signs in with the screen lock you already use. In this preview nothing is created.' },
  { id: 'security-key', title: 'Security Key', subtitle: 'Use a USB or NFC key.', detail: 'A security key is a small device you plug in or hold near your phone. In this preview no key is registered.' },
];

export const aboutSignInMethods = {
  title: 'About Sign-In Methods',
  paragraphs: [
    'Each method is another way to prove that the account is yours. With two or more, losing one does not lock you out.',
    'You can remove a method at any time. The last method cannot be removed.',
  ],
};

