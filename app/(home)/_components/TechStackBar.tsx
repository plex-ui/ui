const stack = [
  { name: 'Radix UI', url: 'https://radix-ui.com' },
  { name: 'Reka UI', url: 'https://reka-ui.com' },
  { name: 'Tailwind CSS 4', url: 'https://tailwindcss.com' },
  { name: 'React 19', url: 'https://react.dev' },
  { name: 'Vue 3', url: 'https://vuejs.org' },
  { name: 'TypeScript', url: 'https://typescriptlang.org' },
];

export function TechStackBar() {
  return (
    <div data-reveal className="px-6 py-8">
      <p className="mb-4 text-center text-xs font-medium tracking-wide text-fd-muted-foreground uppercase">
        Built on
      </p>
      <div className="flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
        {stack.map(({ name, url }) => (
          <a
            key={name}
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-sm font-medium text-fd-muted-foreground transition-colors hover:text-fd-foreground"
          >
            {name}
          </a>
        ))}
      </div>
    </div>
  );
}
