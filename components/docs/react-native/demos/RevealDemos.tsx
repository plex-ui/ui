import { useState } from 'react';
import { Button, Card, Reveal, Text } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlSelect, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const TIMINGS = ['stagger', 'one by one'] as const;
const ORDERS = ['in order', 'reversed'] as const;
const ITEMS = [
  { title: 'Sleep', text: 'Within your usual range.' },
  { title: 'Steps', text: 'About the same as last week.' },
  { title: 'Heart rate', text: 'A little lower than your average.' },
] as const;

/**
 * The Overview: results coming in one after another on a grouped screen. `timing` one by one gives each 500 ms, the
 * next starting as the one before ends; `order` reversed brings the last first; Replay plays them again.
 */
export const Overview = docsDemo(function Overview() {
  const [timing, setTiming] = useState<(typeof TIMINGS)[number]>('stagger');
  const [order, setOrder] = useState<(typeof ORDERS)[number]>('in order');
  const [run, setRun] = useState(0);
  const [done, setDone] = useState(false);
  const sequential = timing === 'one by one';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="timing" options={TIMINGS} value={timing} onChange={setTiming} />
        <DemoControlSelect name="order" options={ORDERS} value={order} onChange={setOrder} />
      </div>
      <RNScreen grouped minHeight={420}>
        <View style={{ gap: 16 }}>
          <Reveal
            key={`${timing}-${order}-${run}`}
            gap={12}
            order={order === 'reversed' ? [2, 1, 0] : undefined}
            stagger={sequential ? 500 : 50}
            duration={sequential ? 500 : undefined}
            onDone={() => setDone(true)}
          >
            {ITEMS.map((item) => (
              <Card key={item.title}>
                <Card.Header>
                  <Card.Title>{item.title}</Card.Title>
                  <Card.Description>{item.text}</Card.Description>
                </Card.Header>
              </Card>
            ))}
          </Reveal>
          <Button
            color="secondary"
            variant="soft"
            onPress={() => {
              setDone(false);
              setRun((n) => n + 1);
            }}
          >
            Replay
          </Button>
          <Text variant="footnote" align="center" color="secondary">
            {done ? 'All in' : 'Coming in…'}
          </Text>
        </View>
      </RNScreen>
    </>
  );
});
