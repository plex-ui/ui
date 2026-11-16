'use client';

import { useState } from 'react';
import { Separator } from '@plexui/ui/components/Separator';
import { controlsTableStyle, DemoControlBoolean, Segments } from './ButtonDemos';

const DETAILS = [
  ['Version', '0.9.0'],
  ['Published', '2 days ago'],
  ['Bundle', '48 kB'],
  ['License', 'MIT'],
] as const;

/**
 * The Overview, with every setting of a separator (row 33: one example per content, owner 11.11): the horizontal
 * rows of a list and the vertical strip of the same details were four examples of one divider.
 */
export function SeparatorOverviewDemo() {
  const [orientation, setOrientation] = useState<'horizontal' | 'vertical'>('horizontal');
  const [decorative, setDecorative] = useState(true);
  const vertical = orientation === 'vertical';

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="orientation" options={['horizontal', 'vertical'] as const} value={orientation} onChange={setOrientation} />
        <DemoControlBoolean name="decorative" value={decorative} onChange={setDecorative} />
      </div>
      <div data-demo-stage className="flex-1 flex items-center justify-center py-12 px-4 w-full">
        <div
          style={{
            display: 'flex',
            flexDirection: vertical ? 'row' : 'column',
            alignItems: vertical ? 'center' : undefined,
            gap: vertical ? 16 : 8,
            width: vertical ? undefined : '100%',
            maxWidth: 384,
            fontSize: 'var(--font-text-sm-size)',
            lineHeight: 'var(--font-text-sm-line-height)',
          }}
        >
          {DETAILS.map(([term, value], i) => (
            <div key={term} style={{ display: 'contents' }}>
              {i > 0 && <Separator orientation={orientation} decorative={decorative} />}
              <dl
                style={{
                  display: 'flex',
                  flexDirection: vertical ? 'column' : 'row',
                  justifyContent: 'space-between',
                  gap: vertical ? 2 : undefined,
                  margin: 0,
                  lineHeight: vertical ? 1.2 : undefined,
                }}
              >
                <dt style={{ fontWeight: vertical ? 500 : undefined }}>{term}</dt>
                <dd style={{ margin: 0, color: 'var(--color-text-tertiary)' }}>{value}</dd>
              </dl>
            </div>
          ))}
        </div>
      </div>
    </>
  );
}
