import { isValidElement, type ReactNode, type SVGProps } from 'react';
import { defineComponent, h, type VNodeChild } from 'vue';

// Docs-only stand-in: @plexui/vue does not ship icons yet, so the Vue
// previews reuse the React icon set. Plex icons are plain function
// components that return static <svg> markup, so their element tree is
// converted to Vue vnodes once, without rendering React.

// Plex icons render synchronously (no hooks, no async)
type SyncComponent<P = unknown> = (props: P) => ReactNode;

// SVG attributes React spells in camelCase that the DOM keeps in camelCase
const CAMEL_CASE_ATTRIBUTES = new Set(['viewBox', 'preserveAspectRatio']);

const toAttributeName = (prop: string) => {
  if (prop === 'className') return 'class';
  if (CAMEL_CASE_ATTRIBUTES.has(prop)) return prop;
  return prop.replace(/[A-Z]/g, (char) => `-${char.toLowerCase()}`);
};

const toVNode = (node: ReactNode): VNodeChild => {
  if (node == null || typeof node === 'boolean') return null;
  if (typeof node === 'string' || typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(toVNode);
  if (!isValidElement(node)) return null;

  const { children, ...props } = node.props as { children?: ReactNode };
  if (typeof node.type === 'function') {
    return toVNode((node.type as SyncComponent)(node.props));
  }
  if (typeof node.type !== 'string') return null;

  const attributes = Object.fromEntries(
    Object.entries(props).map(([prop, value]) => [toAttributeName(prop), value]),
  );
  return h(node.type, attributes, toVNode(children) as never);
};

export const vueIcon = (name: string, Icon: SyncComponent<SVGProps<SVGSVGElement>>) => {
  const tree = Icon({});
  return defineComponent({
    name,
    setup: () => () => toVNode(tree),
  });
};
