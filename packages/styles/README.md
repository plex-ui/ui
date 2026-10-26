# @plexui/styles

The framework-agnostic CSS layer of [Plex UI](https://plexui.com): design tokens, globals and the CSS module of every component. `@plexui/ui` (React) and `@plexui/vue` render their components with these same files, so both frameworks share one styling contract.

React apps get this package through `@plexui/ui` and keep importing `@plexui/ui/css`. Install it directly when you use Plex UI from another framework.

```bash
npm install @plexui/styles tailwindcss
```

```css
@import "tailwindcss";
@import "@plexui/styles/css";
```

## Exports

| Path | Contents |
| --- | --- |
| `@plexui/styles/css` | Tokens, resets and globals in one stylesheet |
| `@plexui/styles/styles/<file>.css` | Individual token tiers, for example `variables-semantic.css` |
| `@plexui/styles/components/<Dir>/<File>.module.css` | Component CSS modules (class names are scoped by your bundler) |
| `@plexui/styles/vite` | Vite plugin that pins the cascade-layer order |
| `@plexui/styles/types` | Shared prop types: `ControlSize`, `SemanticColors`, `Variants`, ... |
| `@plexui/styles/postcss` | The PostCSS pipeline used to build this package (install its plugins yourself) |

## License

MIT
