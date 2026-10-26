'use client';

import { ButtonLink } from '@plexui/ui/components/Button';

import { ClaudeLogo, CodexLogo } from './AiLogos';

export function Hero() {
  return (
    <section
      data-reveal
      data-visible="true"
      className="relative flex flex-col items-center px-6 pt-16 pb-14 sm:pt-24 sm:pb-18 md:pt-32 md:pb-24"
    >
      <div className="mx-auto flex w-full max-w-4xl flex-col items-center text-center">
        {/* Eyebrow */}
        <p className="text-xs font-medium tracking-[0.1em] uppercase text-fd-muted-foreground">
          AI-native design system
        </p>

        {/* Headline */}
        <h1 className="mt-5 text-4xl font-semibold leading-[1.1] tracking-[-0.05em] text-fd-foreground md:text-5xl">
          The design system
          <br className="hidden sm:block" />
          {' '}your AI agent gets&nbsp;right
        </h1>

        {/* Subtitle */}
        <p className="mt-6 max-w-[42rem] text-lg leading-7 text-fd-muted-foreground">
          React and Vue components that Claude and Codex build with correctly.
          Design tokens, a 9-size scale, dark mode, an MCP server and a registry
          they follow. Start with the system, then make it yours.
        </p>

        {/* CTA */}
        <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
          <ButtonLink
            href="/components"
            color="primary"
            variant="solid"
            size="lg"
            pill
          >
            Explore components
          </ButtonLink>
        </div>

        {/* AI tool wordmarks */}
        <div className="mt-16 flex flex-wrap items-center justify-center gap-x-10 gap-y-6 text-fd-foreground sm:mt-20 sm:gap-x-12">
          <ClaudeLogo />
          <CodexLogo />
        </div>
      </div>
    </section>
  );
}
