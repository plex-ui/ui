# @plexui/vue

Plex UI components for Vue 3. Behaviour comes from [Reka UI](https://reka-ui.com) (the Vue lineage of Radix, which `@plexui/ui` uses), and the styling comes from [`@plexui/styles`](../styles), the same CSS modules the React components use. Props, defaults and rendered markup mirror `@plexui/ui`, and automated tests compare the two DOMs.

**Status: proof of concept.** It ships `Button` and the `Dialog` family only.

```bash
npm install @plexui/vue @plexui/styles vue tailwindcss
```

```css
@import "tailwindcss";
@import "@plexui/styles/css";
```

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

Exports are flat (`DialogTrigger`, not `Dialog.Trigger`), and React's `className` is Vue's `class`. Component CSS modules are imported by bare specifier, so build with a bundler that handles CSS modules (Vite, Nuxt, webpack).

## License

MIT
