'use client';

import { useState } from 'react';
import { CodeBlock, CollapsibleCodeBlock } from '@plexui/ui/components/CodeBlock';
import { DemoControlBoolean, DemoControlSelect, Segments, controlsTableStyle } from './ButtonDemos';
import { CODE_BLOCK_LANGUAGES, CODE_BLOCK_LANGUAGE_SAMPLES } from './CodeBlockSamples';

const COLLAPSED_HEIGHTS = ['60', '140'] as const;
const MAX_EXPANDED_HEIGHTS = ['none', '200'] as const;

/**
 * The Overview, one code block with every setting: what the page's examples once showed one by one (Collapsible,
 * Expanded by default, Custom collapsed height, Max expanded height, Without copy button, Supported languages) are its
 * settings (owner 11.11: «в первом примере можно сразу показать все со всеми настройками»). `collapsible` is not a
 * prop: it swaps `CodeBlock` for `CollapsibleCodeBlock`, whose settings show with it, and `collapsedHeight` only while
 * the block starts collapsed. A block reads `defaultExpanded` once, so the block mounts again when a setting it reads
 * on mount changes (and folds again, as the setting asks). A setting that is not offered gives its default, as the Vue
 * demo's hidden controls do. A code block has no phone presentation of its own: on a phone it is the same block.
 */
export function CodeBlockOverviewDemo() {
  const [language, setLanguage] = useState<(typeof CODE_BLOCK_LANGUAGES)[number]>('javascript');
  const [collapsible, setCollapsible] = useState(false);
  const [shownDefaultExpanded, setDefaultExpanded] = useState(false);
  const [shownCollapsedHeight, setCollapsedHeight] = useState<(typeof COLLAPSED_HEIGHTS)[number]>('140');
  const [shownMaxExpandedHeight, setMaxExpandedHeight] = useState<(typeof MAX_EXPANDED_HEIGHTS)[number]>('none');
  const [shownCopyable, setCopyable] = useState(true);
  const defaultExpanded = collapsible && shownDefaultExpanded;
  const collapsedHeight = collapsible && !defaultExpanded ? Number(shownCollapsedHeight) : 140;
  const maxExpandedHeight = collapsible && shownMaxExpandedHeight !== 'none' ? Number(shownMaxExpandedHeight) : undefined;
  const copyable = !collapsible || shownCopyable;
  const code = CODE_BLOCK_LANGUAGE_SAMPLES[language];
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="language" options={CODE_BLOCK_LANGUAGES} value={language} onChange={setLanguage} />
        <DemoControlBoolean name="collapsible" value={collapsible} onChange={setCollapsible} />
        {collapsible && <DemoControlBoolean name="defaultExpanded" value={shownDefaultExpanded} onChange={setDefaultExpanded} />}
        {collapsible && !defaultExpanded && (
          <Segments name="collapsedHeight" options={COLLAPSED_HEIGHTS} value={shownCollapsedHeight} onChange={setCollapsedHeight} />
        )}
        {collapsible && (
          <Segments name="maxExpandedHeight" options={MAX_EXPANDED_HEIGHTS} value={shownMaxExpandedHeight} onChange={setMaxExpandedHeight} />
        )}
        {collapsible && <DemoControlBoolean name="copyable" value={shownCopyable} onChange={setCopyable} />}
      </div>
      <div data-demo-stage className="flex-1 flex flex-col justify-center w-full p-6">
        {collapsible ? (
          <CollapsibleCodeBlock
            key={language + defaultExpanded + collapsedHeight}
            language={language}
            defaultExpanded={defaultExpanded}
            collapsedHeight={collapsedHeight}
            maxExpandedHeight={maxExpandedHeight}
            copyable={copyable}
          >
            {code}
          </CollapsibleCodeBlock>
        ) : (
          <CodeBlock language={language}>{code}</CodeBlock>
        )}
      </div>
    </>
  );
}
