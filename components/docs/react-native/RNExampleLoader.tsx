'use client';

import { useEffect, useState, type ComponentType } from 'react';
import { demoModules } from './demos';
import { RNScreen, type RNScreenProps } from './RNScreen';

type Loaded = { demo: string; Demo: ComponentType & { docs?: true } } | { demo: string; error: Error };

/** Loads `<file>/<export>` of ./demos: a docs demo with its own controls renders as is, a bare one on a screen. */
export default function RNExampleLoader({ demo, ...screen }: Omit<RNScreenProps, 'children'> & { demo: string }) {
  const [loaded, setLoaded] = useState<Loaded | null>(null);
  useEffect(() => {
    const [file, name] = demo.split('/');
    let live = true;
    const load = demoModules[file];
    (load ? load() : Promise.reject(new Error(`No React Native demos named ${file}`)))
      .then((demos) => {
        const Demo = demos[name];
        if (!Demo) throw new Error(`No demo ${name} in ${file}`);
        if (live) setLoaded({ demo, Demo });
      })
      .catch((error: Error) => {
        if (live) setLoaded({ demo, error });
      });
    return () => {
      live = false;
    };
  }, [demo]);
  const current = loaded?.demo === demo ? loaded : null;
  if (!current) return <div data-demo-stage style={{ minHeight: screen.minHeight ?? 160 }} />;
  if ('error' in current) {
    return <pre data-demo-stage style={{ padding: 16, color: 'var(--color-text-danger)', whiteSpace: 'pre-wrap' }}>{current.error.message}</pre>;
  }
  const { Demo } = current;
  if (Demo.docs) return <Demo />;
  return (
    <RNScreen {...screen}>
      <Demo />
    </RNScreen>
  );
}
