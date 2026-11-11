'use client';

import { useState } from 'react';
import { Accordion } from '@plexui/ui/components/Accordion';
import { Card } from '@plexui/ui/components/Card';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { controlsTableStyle, DemoControlBoolean, DemoControlRow } from './ButtonDemos';
import { PhoneScreen } from './PhoneScreen';

/* ============================================================
   Overview — shipping / returns / support FAQ, with the variants of an Accordion as its settings (owner 11.11):
   one or several items open, a single accordion's collapsible, and the accordion inside a Card
   ============================================================ */

const TYPES = ['single', 'multiple'] as const;

export function AccordionOverviewDemo() {
  const [type, setType] = useState<(typeof TYPES)[number]>('single');
  const [collapsible, setCollapsible] = useState(true);
  const [card, setCard] = useState(false);
  const [returnsDisabled, setReturnsDisabled] = useState(false);
  const items = (
    <>
      <Accordion.Item value="shipping">
        <Accordion.Trigger>What are your shipping options?</Accordion.Trigger>
        <Accordion.Content>
          We offer standard (5–7 business days), express (2–3 days), and
          overnight shipping. Free standard shipping on orders over $50.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="returns" disabled={returnsDisabled}>
        <Accordion.Trigger>What is your return policy?</Accordion.Trigger>
        <Accordion.Content>
          Returns are accepted within 30 days of delivery. Items must be unused
          and in original packaging. Refunds are processed within 5–7 business
          days of receipt.
        </Accordion.Content>
      </Accordion.Item>
      <Accordion.Item value="support">
        <Accordion.Trigger>How can I contact customer support?</Accordion.Trigger>
        <Accordion.Content>
          Reach us by email, live chat, or phone Monday through Friday, 9am–6pm
          ET. Weekend tickets are handled within 24 hours.
        </Accordion.Content>
      </Accordion.Item>
    </>
  );
  const style = { width: '100%', maxWidth: 384 };
  // Another type is another accordion, and so is a single one that turns collapsible or not (without collapsible one
  // item is always open): its open items start again from the default, as the Vue demo mounts again
  const accordion = type === 'single' ? (
    <Accordion key={`single-${collapsible}`} type="single" collapsible={collapsible} defaultValue="shipping" style={style}>{items}</Accordion>
  ) : (
    <Accordion key="multiple" type="multiple" defaultValue={['shipping']} style={style}>{items}</Accordion>
  );
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="type">
          <SegmentedControl<(typeof TYPES)[number]> value={type} onChange={setType} aria-label="type" size="xs">
            {TYPES.map((option) => <SegmentedControl.Option key={option} value={option}>{option}</SegmentedControl.Option>)}
          </SegmentedControl>
        </DemoControlRow>
        {/* Only one open item can close it: several open items always close */}
        {type === 'single' && <DemoControlBoolean name="collapsible" value={collapsible} onChange={setCollapsible} />}
        <DemoControlBoolean name="card" value={card} onChange={setCard} />
        <DemoControlBoolean name="returnsDisabled" value={returnsDisabled} onChange={setReturnsDisabled} />
      </div>
      <div data-demo-stage className="py-10 w-full flex justify-center">
        {/* On a phone a Card is itself a section of the grouped list */}
        <PhoneScreen section={!card}>
          {card ? (
            <Card style={style}>
              <Card.Header>
                <Card.Title>Orders & returns</Card.Title>
                <Card.Description>Shipping, returns, and support at a glance.</Card.Description>
              </Card.Header>
              <Card.Content>{accordion}</Card.Content>
            </Card>
          ) : accordion}
        </PhoneScreen>
      </div>
    </>
  );
}
