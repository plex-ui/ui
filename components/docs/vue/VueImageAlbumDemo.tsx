'use client';

import { markRaw } from 'vue';
import { usePhoneViewport, usePreviewEmbed } from '../PreviewEmbed';
import { VueDemo } from './VueDemo';
import { ImageAlbumEditor } from './ImageAlbumEditor';

export function VueImageAlbumDemo() {
    const phonePreview = usePreviewEmbed() !== null;
    const phoneHost = usePhoneViewport() && !phonePreview;
    return (
        <VueDemo
            template={
                '<component :is="ImageAlbumEditor" v-model:dialog="dialog" :surface="surface" :phone-preview="phonePreview" :phone-host="phoneHost" />'
            }
            stageClassName="w-full"
            state={{ ImageAlbumEditor: markRaw(ImageAlbumEditor) }}
            context={{ phonePreview, phoneHost }}
            controls={[
                { name: 'dialog', type: 'boolean', default: false },
                {
                    name: 'surface',
                    phoneOnly: true,
                    type: 'select',
                    options: [
                        { value: 'grouped', label: 'Grouped' },
                        { value: 'plain', label: 'Plain' },
                    ],
                    default: 'grouped',
                },
            ]}
        />
    );
}
