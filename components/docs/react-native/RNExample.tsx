'use client';

import dynamic from 'next/dynamic';
import type { RNScreenProps } from './RNScreen';

type RNExampleProps = Omit<RNScreenProps, 'children'> & {
  /** `<file>/<export>`, an example of ./demos */
  demo: string;
};

// React Native runs in the browser only (react-native-web): the server sends the stage's place, empty
const Loader = dynamic(() => import('./RNExampleLoader'), {
  ssr: false,
  loading: () => <div data-demo-stage style={{ minHeight: 160 }} />,
});

/**
 * One React Native example inside a ComponentPreview, as a React page puts its demo there: the example's screen,
 * with its own settings when the demo brings them (`docsDemo`).
 */
export function RNExample(props: RNExampleProps) {
  return <Loader {...props} />;
}
