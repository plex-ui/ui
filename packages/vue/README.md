# @plexui/vue

Plex UI components for Vue 3. Every component of [`@plexui/ui`](../ui) has a Vue counterpart with the same names, props, defaults and rendered markup, and the styling comes from [`@plexui/styles`](../styles), the same CSS modules the React components use. Behaviour comes from [Reka UI](https://reka-ui.com) (the Vue lineage of Radix, which `@plexui/ui` uses), corrected to Radix's behaviour where they differ. Automated tests render each component in both frameworks and compare the DOM and the interactions.

Docs: [plexui.com/docs/vue](https://plexui.com/docs/vue) and every component page's **Vue** tab ([plexui.com/vue/components](https://plexui.com/vue/components)).

## Install

```bash
npm install @plexui/vue @plexui/styles
```

Requires Vue 3.5+ and Tailwind 4. Install `@plexui/styles` next to it: your stylesheet and Vite config import it directly.

```css
/* main.css */
@layer theme, base, components, utilities;

@import "tailwindcss";
@import "@plexui/styles/css";
@source "../node_modules/@plexui/vue";
```

```ts
// vite.config.ts
import vue from "@vitejs/plugin-vue"
import plexui from "@plexui/styles/vite"
import { defineConfig } from "vite"

export default defineConfig({ plugins: [vue(), plexui()] })
```

Components import their CSS modules by bare specifier, so build with a bundler that handles CSS modules (Vite, Nuxt, webpack). For SSR, bundle the package: `ssr.noExternal: ["@plexui/vue", "@plexui/styles"]` in Vite, `build.transpile: ["@plexui/vue"]` in Nuxt.

## Use

```vue
<script setup lang="ts">
import { ref } from "vue"
import { Button } from "@plexui/vue/components/Button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@plexui/vue/components/Dialog"

const open = ref(false)
</script>

<template>
  <Dialog v-model:open="open">
    <DialogTrigger>
      <Button color="primary">Open dialog</Button>
    </DialogTrigger>
    <DialogContent>
      <DialogHeader>
        <DialogTitle>Unsaved changes</DialogTitle>
        <DialogDescription>Save before leaving?</DialogDescription>
      </DialogHeader>
    </DialogContent>
  </Dialog>
</template>
```

## From React to Vue

- `className` is `class`, on the same element.
- Controlled values use `v-model:value` (a `value` prop and an `update:value` event); other controlled props work the same way, e.g. `v-model:open`.
- `onX` callbacks are `@x` listeners; ReactNode props are slots.
- Compound parts are flat named exports: `DialogTrigger`, not `Dialog.Trigger`.
- Icons have the same names (`@plexui/vue/components/Icon`); hooks are composables (`@plexui/vue/composables/<name>`).
- In templates, use `PlexTransitionGroup` for Plex's `TransitionGroup` (Vue reserves `<TransitionGroup>`).

## License

MIT
