'use client';

import { controlsTableStyle } from './ButtonDemos';
import { ImageAlbumEditor } from './ImageAlbumEditor';
import { usePhoneViewport, usePreviewEmbed } from './PreviewEmbed';
import { ScreenPresentationControls, useScreenPresentation } from './ScreenPresentationControls';

export function ImageAlbumDemo() {
    const presentation = useScreenPresentation();
    const phonePreview = usePreviewEmbed() !== null;
    const phoneHost = usePhoneViewport() && !phonePreview;
    return (
        <>
            <div data-demo-controls style={controlsTableStyle}>
                <ScreenPresentationControls {...presentation} />
            </div>
            <ImageAlbumEditor
                {...presentation}
                onDialogChange={presentation.setDialog}
                phonePreview={phonePreview}
                phoneHost={phoneHost}
            />
        </>
    );
}
