'use client';

import { useState } from 'react';
import { Button } from '@plexui/ui/components/Button';
import { Card } from '@plexui/ui/components/Card';
import { DotsHorizontal } from '@plexui/ui/components/Icon';
import { DemoControlBoolean, Segments, controlsTableStyle } from './ButtonDemos';
import { PhoneScreen } from './PhoneScreen';

const VARIANTS = ['outline', 'solid', 'ghost'] as const;
const SIZES = ['sm', 'md', 'lg'] as const;
const FOOTERS = ['none', 'one', 'two'] as const;

/**
 * The Overview, with every setting of a card: its look (variant, size), its parts (description, action, content,
 * footer) and a card that is a link. The page once showed whole screens built in cards (log in, create a project,
 * payment, pricing…); those are screens, not settings of a card, and the log-in one repeated Forms: Auth (owner
 * 16.11). A link card holds no buttons of its own (a button in a link is two controls in one), so the action and the
 * footer are offered without a link. On a phone an outline card is a section of the grouped list.
 */
export function CardOverviewDemo() {
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('outline');
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [description, setDescription] = useState(true);
  const [content, setContent] = useState(false);
  const [footer, setFooter] = useState<(typeof FOOTERS)[number]>('two');
  const [action, setAction] = useState(false);
  const [link, setLink] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANTS} value={variant} onChange={setVariant} />
        <Segments name="size" options={SIZES} value={size} onChange={setSize} />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <DemoControlBoolean name="content" value={content} onChange={setContent} />
        {!link && <Segments name="footer" options={FOOTERS} value={footer} onChange={setFooter} />}
        {!link && <DemoControlBoolean name="action" value={action} onChange={setAction} />}
        <DemoControlBoolean name="href" value={link} onChange={setLink} />
      </div>
      <div data-demo-stage className="py-10 w-full flex justify-center">
        <PhoneScreen>
          <Card variant={variant} size={size} href={link ? '#overview' : undefined} style={{ width: '100%', maxWidth: 380 }}>
            <Card.Header>
              <Card.Title>Project activity</Card.Title>
              {description && (
                <Card.Description>Your team opened 12 issues and closed 8 pull requests over the last 7 days.</Card.Description>
              )}
              {action && !link && (
                <Card.Action>
                  <Button color="secondary" variant="ghost" size="sm" uniform aria-label="More">
                    <DotsHorizontal />
                  </Button>
                </Card.Action>
              )}
            </Card.Header>
            {content && <Card.Content>Most of the work landed on Tuesday, in the release branch.</Card.Content>}
            {footer !== 'none' && !link && (
              <Card.Footer>
                <Button color="primary" variant="solid" size="sm" pill={false}>View report</Button>
                {footer === 'two' && <Button color="secondary" variant="outline" size="sm" pill={false}>Dismiss</Button>}
              </Card.Footer>
            )}
          </Card>
        </PhoneScreen>
      </div>
    </>
  );
}
