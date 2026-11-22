'use client';

import dynamic from 'next/dynamic';
import { CodeBlock } from '@plexui/ui/components/CodeBlock';
import { useRNPreviewSettings } from './RNPreviewSettings';
import styles from './RNPreview.module.css';

// React Native runs in the browser only (react-native-web): the server sends an empty screen of the same height
const RNStage = dynamic(() => import('./RNStage'), { ssr: false, loading: () => null });

/**
 * A live React Native example: `demo` (`<file>/<export>` of ./demos) on a 393pt phone screen in the page's platform
 * and scheme, with its `code` under it.
 */
export function RNPreview({ demo, code, grouped, minHeight = 160 }: { demo: string; code?: string; grouped?: boolean; minHeight?: number }) {
  const { platform, scheme } = useRNPreviewSettings();
  return (
    <div className={styles.Wrapper} data-rn-preview={demo}>
      <div className={styles.Stage}>
        <div className={styles.Screen} style={{ minHeight }}>
          <RNStage demo={demo} platform={platform} scheme={scheme} grouped={grouped} minHeight={minHeight} />
        </div>
      </div>
      {code ? (
        <div className={styles.Code}>
          <CodeBlock language="tsx">{code}</CodeBlock>
        </div>
      ) : null}
    </div>
  );
}
