'use client';

import { markRaw } from 'vue';
import { usePreviewEmbed } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';
import { SegmentedComposer } from './SegmentedComposer';

export function VueSegmentedComposerDemo() {
  const phonePreview = usePreviewEmbed() !== null;
  return <VueDemo
    template={'<component :is="SegmentedComposer" :surface="surface" :pinned-open="phonePreview" />'}
    state={{ SegmentedComposer: markRaw(SegmentedComposer) }}
    context={{ phonePreview }}
    stageClassName="w-full"
    controls={[{
      name: 'surface', phoneOnly: true, type: 'select', default: 'grouped',
      options: [{ value: 'grouped', label: 'Grouped' }, { value: 'plain', label: 'Plain' }],
    }]}
  />;
}
