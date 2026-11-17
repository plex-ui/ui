import defaultMdxComponents from 'fumadocs-ui/mdx';
import { MdxLink } from '@/components/layout/MdxLink';
import { Accordions, Accordion } from 'fumadocs-ui/components/accordion';
import { Callout } from 'fumadocs-ui/components/callout';
import { Children, isValidElement, type ReactElement, type ReactNode } from 'react';
import type { MDXComponents } from 'mdx/types';
import { CodeBlock as PlexCodeBlock } from '@plexui/ui/components/CodeBlock';
import { Colors } from '@/components/docs/Colors';
import { ComponentCard } from '@/components/docs/ComponentCard';
import { ComponentPreview } from '@/components/docs/ComponentPreview';
import { ComponentSource } from '@/components/docs/ComponentSource';
import { DesignTokens } from '@/components/docs/DesignTokens';
import { PropsTable } from '@/components/docs/PropsTable';
import { UsageBlock } from '@/components/docs/UsageBlock';

/**
 * Recursively walk a React node tree and concatenate the text content of
 * every leaf string/number node. We need this to recover the raw code
 * out of an MDX `<pre><code>` element after Fumadocs has run its rehype
 * pipeline. With Shiki disabled, `code.children` is just the source as
 * a single string, but we still walk recursively so the override stays
 * resilient if a future plugin wraps tokens in spans.
 */
function extractText(node: ReactNode): string {
  if (node == null || typeof node === 'boolean') return '';
  if (typeof node === 'string') return node;
  if (typeof node === 'number') return String(node);
  if (Array.isArray(node)) return node.map(extractText).join('');
  if (isValidElement(node)) {
    const props = (node as ReactElement<{ children?: ReactNode }>).props;
    return extractText(props.children);
  }
  return '';
}

function findLanguage(node: ReactNode): string | undefined {
  if (isValidElement(node)) {
    const el = node as ReactElement<{
      className?: string;
      children?: ReactNode;
    }>;
    const className = el.props.className ?? '';
    const match = className.match(/language-(\S+)/);
    if (match) return match[1];
    return findLanguage(el.props.children);
  }
  if (Array.isArray(node)) {
    for (const child of node) {
      const found = findLanguage(child);
      if (found) return found;
    }
  }
  return undefined;
}

/**
 * Replaces Fumadocs's default Shiki-rendered `<pre>` with Plex UI's
 * `CodeBlock`. Effect: every triple-backtick block in MDX picks up the
 * same Prism palette + Plex copy button as the inline component
 * snippets driven by `<UsageBlock>` / `<ComponentPreview>`, so the
 * docs site only ships one code-block aesthetic instead of two. Pairs
 * with `rehypeCodeOptions: false` in `source.config.ts`, which skips
 * the Shiki pipeline so the children we receive here are raw text.
 */
function PreCodeBlock({ children }: { children: ReactNode }) {
  const code = Children.toArray(children).find(isValidElement) ?? children;
  const language = findLanguage(code);
  // Trailing newlines from the MDX → AST conversion add an empty last
  // line inside Plex's CodeBlock; trim them so the rendered block is
  // tight against its bottom padding like the inline component
  // snippets are.
  const text = extractText(code).replace(/\n+$/, '');
  // `not-prose` shields the code from Tailwind's `prose` typography
  // (used by Fumadocs's article body). Without it, prose-* utilities
  // can leak into Prism token spans — e.g. quoted strings get the
  // <q> rendering, property names pick up `font-weight`/underlines,
  // and inline `code` spacing is added between tokens. Mirrors how
  // <UsageBlock> already wraps Plex CodeBlock.
  //
  // `not-prose` also strips the default `prose pre` vertical margin,
  // so add an explicit `my-4` so adjacent paragraphs keep the same
  // breathing room they had with Fumadocs's old Shiki block.
  return (
    <div className="not-prose my-4">
      <PlexCodeBlock language={language}>{text}</PlexCodeBlock>
    </div>
  );
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    a: MdxLink,
    pre: PreCodeBlock,
    Accordions,
    Accordion,
    Callout,
    DesignTokens,
    Colors,
    ComponentCard,
    ComponentPreview,
    ComponentSource,
    PropsTable,
    UsageBlock,
    ...components,
  } as MDXComponents;
}
