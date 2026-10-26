import { compile, type CompilerOptions } from '@vue/compiler-dom';
import * as Vue from 'vue';
import { registerRuntimeCompiler, type Component, type RenderFunction } from 'vue';
import { Button, ButtonLink, CopyButton } from '@plexui/vue/components/Button';
import {
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@plexui/vue/components/Dialog';
import { PlexUIProvider } from '@plexui/vue/components/PlexUIProvider';
import { TextLink } from '@plexui/vue/components/TextLink';
import {
  Animate,
  AnimateLayout,
  AnimateLayoutGroup,
  SlotTransitionGroup,
  TransitionGroup,
} from '@plexui/vue/components/Transition';
import * as Icons from '@plexui/vue/components/Icon';

// The `vue` package resolves to the runtime-only build, so preview templates
// are compiled here, the way Vue's full build does it. The code a page shows
// is the template that runs.
type CompiledRender = RenderFunction & { _rc?: boolean };

const renderCache = new Map<string, CompiledRender>();

function compileToFunction(template: string | HTMLElement, options?: CompilerOptions): CompiledRender {
  const source = typeof template === 'string' ? template : template.innerHTML;
  const cached = renderCache.get(source);
  if (cached) return cached;

  const { code } = compile(source, {
    hoistStatic: true,
    ...options,
    onError: (error) => console.error(`[VuePreview] ${error.message}`),
  });
  // Same as Vue's full build: the compiled code reads helpers off `Vue`
  const render: CompiledRender = new Function('Vue', code)(Vue);
  render._rc = true;
  renderCache.set(source, render);
  return render;
}

registerRuntimeCompiler(compileToFunction as Parameters<typeof registerRuntimeCompiler>[0]);

const components: Record<string, Component> = {
  Animate,
  AnimateLayout,
  AnimateLayoutGroup,
  Button,
  ButtonLink,
  CopyButton,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  PlexUIProvider,
  SlotTransitionGroup,
  TextLink,
  TransitionGroup,
};

// Icons whose names clash with a component (Card, Menu, Sidebar, ...) are
// also registered as `<Name>Icon`; the component keeps the bare name.
const icons: Record<string, Component> = {};
for (const [name, icon] of Object.entries(Icons as Record<string, Component>)) {
  icons[name in components ? `${name}Icon` : name] = icon;
}

/** Everything a preview template can use without importing it. */
export const vueComponents: Record<string, Component> = { ...icons, ...components };
