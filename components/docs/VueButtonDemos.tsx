'use client';

import { useMemo, useState } from 'react';
import { DemoControlBoolean, controlsTableStyle } from './ButtonDemos';
import { VuePreview } from './VuePreview';

export const vueButtonLoadingTemplate = `<Button :loading="loading" size="xl" pill>
  <ArrowUp /> Click to load
</Button>`;

export function VueButtonLoadingDemo() {
  const [loading, setLoading] = useState(true);
  const props = useMemo(() => ({ loading }), [loading]);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
      </div>
      <div className="flex-1 flex items-center justify-center py-12 w-full" data-demo-stage>
        <VuePreview template={vueButtonLoadingTemplate} props={props} />
      </div>
    </>
  );
}
