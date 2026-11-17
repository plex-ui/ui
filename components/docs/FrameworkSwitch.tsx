'use client';

import { useRouter } from 'next/navigation';
import { PreviewViewportControl } from './PreviewViewport';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import styles from './FrameworkSwitch.module.css';

/** The official marks, as the frameworks draw them, in their colors; on a desktop the switch greys the one not chosen.
 * The atom is react.dev's, its orbits 1.5 instead of 1 so that at 16-20px they weigh as the kit's icons beside it. */
function ReactMark() {
  return (
    <svg className={styles.ReactMark} viewBox="-10.5 -9.45 21 18.9" aria-hidden="true">
      <circle r="2" fill="currentColor" />
      <g fill="none" stroke="currentColor" strokeWidth="1.5">
        <ellipse rx="10" ry="4.5" />
        <ellipse rx="10" ry="4.5" transform="rotate(60)" />
        <ellipse rx="10" ry="4.5" transform="rotate(120)" />
      </g>
    </svg>
  );
}

function VueMark() {
  return (
    <svg className={styles.VueMark} viewBox="0 0 261.76 226.69" aria-hidden="true">
      <path d="M161.096.001l-30.225 52.351L100.647.001H-.005l130.877 226.688L261.749.001z" fill="#41b883" />
      <path d="M161.096.001l-30.225 52.351L100.647.001H52.346l78.526 136.01L209.398.001z" fill="#34495e" />
    </svg>
  );
}

const FRAMEWORKS = [
  { id: 'react', label: 'React', base: '/components', mark: <ReactMark /> },
  { id: 'vue', label: 'Vue', base: '/vue/components', mark: <VueMark /> },
] as const;

type Framework = (typeof FRAMEWORKS)[number]['id'];

const hrefFor = (framework: Framework, slug: string, hrefs?: Record<Framework, string>) =>
  hrefs ? hrefs[framework] : `${FRAMEWORKS.find(({ id }) => id === framework)!.base}/${slug}`;

/**
 * React / Vue between the two pages of the same component, and Desktop / Phone for all its examples: two pill
 * segments of one size, as every switch of the docs (owner 12.11, «мы везде pill используем»). The marks come from
 * the owner's reference, animate-ui.com (plan 178 phase 8).
 */
export function FrameworkSwitch({
  framework,
  slug = '',
  hrefs,
}: {
  framework: Framework;
  slug?: string;
  /** The two pages of a docs page with no examples, such as Hooks and Composables: no Desktop / Phone switch */
  hrefs?: Record<Framework, string>;
}) {
  const router = useRouter();

  // Prefetch the other framework's page only when the switch is pointed at,
  // focused or touched: on Vercel each prefetch of a prerendered page is an ISR read.
  const prefetchOther = () => {
    for (const { id } of FRAMEWORKS) {
      if (id !== framework) router.prefetch(hrefFor(id, slug, hrefs));
    }
  };

  return (
    <div
      className="mb-6 flex items-center justify-between gap-4"
      onPointerEnter={prefetchOther}
      onFocusCapture={prefetchOther}
      onTouchStartCapture={prefetchOther}
    >
      <SegmentedControl<Framework>
        value={framework}
        onChange={(next) => router.push(hrefFor(next, slug, hrefs))}
        aria-label="Framework"
        size="sm"
        pill
        className={styles.Switch}
      >
        {FRAMEWORKS.map(({ id, label, mark }) => (
          <SegmentedControl.Option key={id} value={id} icon={mark}>
            {label}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
      {!hrefs && <PreviewViewportControl />}
    </div>
  );
}
