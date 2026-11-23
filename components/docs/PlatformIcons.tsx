import type { ReactNode } from 'react';

// The marks of the docs' preview switches: Tabler's outline Device Desktop, Brand Apple and Brand Android (owner 23.11;
// MIT), drawn in the text color at 1em with Tabler's 2px line, one set so the three weigh the same.
function Outline({ children }: { children: ReactNode }) {
  return (
    <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}
      strokeLinecap="round" strokeLinejoin="round" aria-hidden="true" focusable="false">
      {children}
    </svg>
  );
}

export function DesktopMark() {
  return (
    <Outline>
      <path d="M3 5a1 1 0 0 1 1 -1h16a1 1 0 0 1 1 1v10a1 1 0 0 1 -1 1h-16a1 1 0 0 1 -1 -1v-10" />
      <path d="M7 20h10" />
      <path d="M9 16v4" />
      <path d="M15 16v4" />
    </Outline>
  );
}

export function AppleMark() {
  return (
    <Outline>
      <path d="M8.286 7.008c-3.216 0 -4.286 3.23 -4.286 5.92c0 3.229 2.143 8.072 4.286 8.072c1.165 -.05 1.799 -.538 3.214 -.538c1.406 0 1.607 .538 3.214 .538s4.286 -3.229 4.286 -5.381c-.03 -.011 -2.649 -.434 -2.679 -3.23c-.02 -2.335 2.589 -3.179 2.679 -3.228c-1.096 -1.606 -3.162 -2.113 -3.75 -2.153c-1.535 -.12 -3.032 1.077 -3.75 1.077c-.729 0 -2.036 -1.077 -3.214 -1.077" />
      <path d="M12 4a2 2 0 0 0 2 -2a2 2 0 0 0 -2 2" />
    </Outline>
  );
}

export function AndroidMark() {
  return (
    <Outline>
      <path d="M4 10l0 6" />
      <path d="M20 10l0 6" />
      <path d="M7 9h10v8a1 1 0 0 1 -1 1h-8a1 1 0 0 1 -1 -1v-8a5 5 0 0 1 10 0" />
      <path d="M8 3l1 2" />
      <path d="M16 3l-1 2" />
      <path d="M9 18l0 3" />
      <path d="M15 18l0 3" />
    </Outline>
  );
}
