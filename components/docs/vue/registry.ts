import { compile, type CompilerOptions } from '@vue/compiler-dom';
import * as Vue from 'vue';
import { registerRuntimeCompiler, type Component } from 'vue';
import { Button } from '@plexui/vue/components/Button';
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
import {
  ArrowRight,
  ArrowUp,
  Clear,
  CompareArrows,
  Delete,
  Mail,
  PlusLg,
} from '@plexui/ui/components/Icon';
import { vueIcon } from './reactIcon';

// The `vue` package resolves to the runtime-only build, so preview templates
// are compiled here, the way Vue's full build does it. The code a page shows
// is the template that runs.
const renderCache = new Map<string, ReturnType<typeof compileToFunction>>();

function compileToFunction(template: string | HTMLElement, options?: CompilerOptions) {
  const source = typeof template === 'string' ? template : template.innerHTML;
  const cached = renderCache.get(source);
  if (cached) return cached;

  const { code } = compile(source, {
    hoistStatic: true,
    ...options,
    onError: (error) => console.error(`[VuePreview] ${error.message}`),
  });
  // Same as Vue's full build: the compiled code reads helpers off `Vue`
  const render = new Function('Vue', code)(Vue);
  render._rc = true;
  renderCache.set(source, render);
  return render;
}

registerRuntimeCompiler(compileToFunction as Parameters<typeof registerRuntimeCompiler>[0]);

/** Everything a preview template can use without importing it. */
export const vueComponents: Record<string, Component> = {
  Button,
  Dialog,
  DialogClose,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  ArrowRight: vueIcon('ArrowRight', ArrowRight),
  ArrowUp: vueIcon('ArrowUp', ArrowUp),
  Clear: vueIcon('Clear', Clear),
  CompareArrows: vueIcon('CompareArrows', CompareArrows),
  Delete: vueIcon('Delete', Delete),
  Mail: vueIcon('Mail', Mail),
  PlusLg: vueIcon('PlusLg', PlusLg),
};
