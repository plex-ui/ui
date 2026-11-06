'use client';

import { useEffect, useId, useRef, useState, type FormEvent } from 'react';
import { Button, NavigationButton } from '@plexui/ui/components/Button';
import { Dialog } from '@plexui/ui/components/Dialog';
import { Field } from '@plexui/ui/components/Field';
import { FieldError } from '@plexui/ui/components/FieldError';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import { FileUpload } from '@plexui/ui/components/FileUpload';
import { ImageSquare } from '@plexui/ui/components/Icon';
import { Image } from '@plexui/ui/components/Image';
import { Input } from '@plexui/ui/components/Input';
import { Page } from '@plexui/ui/components/Page';
import { Toolbar } from '@plexui/ui/components/Toolbar';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { useDialogStagePresence } from './useDialogStagePresence';
import s from './ImageAlbumDemo.module.css';

export type ImageAlbumEditorProps = {
    dialog?: boolean;
    surface?: 'plain' | 'grouped';
    phonePreview?: boolean;
    phoneHost?: boolean;
    onDialogChange?: (open: boolean) => void;
};

type AlbumDraft = { name: string; photo: File | null };
const emptyAlbum = (): AlbumDraft => ({ name: '', photo: null });
const emptyPickerValue: File[] = [];

/** A local draft only. Done stores the sample; Cancel restores its last saved state. */
export function ImageAlbumEditor({
    dialog = false,
    surface = 'grouped',
    phonePreview = false,
    phoneHost = false,
    onDialogChange,
}: ImageAlbumEditorProps) {
    const wide = useBreakpoint('md');
    const phone = phonePreview || phoneHost || !wide;
    const [draft, setDraft] = useState(emptyAlbum);
    const saved = useRef<AlbumDraft>(emptyAlbum());
    const [photoUrl, setPhotoUrl] = useState<{ file: File; url: string } | null>(null);
    const ownedPhotoUrl = useRef<typeof photoUrl>(null);
    const [failedPhoto, setFailedPhoto] = useState<File | null>(null);
    const [photoError, setPhotoError] = useState('');
    const [nameError, setNameError] = useState('');
    const [status, setStatus] = useState('');
    const nameInput = useRef<HTMLInputElement>(null);
    const heading = useRef<HTMLDivElement>(null);
    const id = useId();
    const formId = `album-${id}`;
    const nameErrorId = `${formId}-name-error`;
    const { open: dialogOpen, present: dialogPresent, onOpenAutoFocus: onDialogScopeOpen, onCloseAutoFocus: onDialogScopeClose, pageRef: bindPage } = useDialogStagePresence(dialog, !phoneHost);
    const showDialog = dialogPresent;

    // File selection and Cancel own resource changes; rendering only reads them.
    const previewPhoto = (file: File | null) => {
        if (ownedPhotoUrl.current?.file === file) return;
        if (ownedPhotoUrl.current) URL.revokeObjectURL(ownedPhotoUrl.current.url);
        const next = file ? { file, url: URL.createObjectURL(file) } : null;
        ownedPhotoUrl.current = next;
        setPhotoUrl(next);
    };
    useEffect(() => () => {
        if (ownedPhotoUrl.current) URL.revokeObjectURL(ownedPhotoUrl.current.url);
    }, []);

    const visibleUrl = photoUrl && photoUrl.file === draft.photo ? photoUrl.url : undefined;
    const placeholderLabel = !draft.photo
        ? 'No album photo'
        : failedPhoto === draft.photo
          ? 'Photo preview unavailable'
          : 'Loading album photo';
    const finish = () => {
        if (!phonePreview && dialog) onDialogChange?.(false);
    };
    const cancel = () => {
        previewPhoto(saved.current.photo);
        setDraft({ ...saved.current });
        setNameError('');
        setPhotoError('');
        setFailedPhoto(null);
        setStatus('Changes canceled.');
        finish();
    };
    const save = (event: FormEvent<HTMLFormElement>) => {
        event.preventDefault();
        event.stopPropagation();
        if (!draft.name.trim()) {
            setNameError('Enter an album name.');
            nameInput.current?.focus({ preventScroll: true });
            return;
        }
        if (draft.photo && failedPhoto === draft.photo) return;
        saved.current = { ...draft };
        setPhotoError('');
        setStatus('Album saved.');
        finish();
    };
    const closeButton = (
        <NavigationButton action="close" aria-label="Cancel album changes" onClick={cancel} />
    );
    const doneButton = (
        <NavigationButton action="confirm" type="submit" form={formId} aria-label="Save album" />
    );
    // The phone bar of the screen and of the Sheet: Cancel, the title and Save.
    const bar = (
        <Toolbar>
            <Toolbar.Leading>{closeButton}</Toolbar.Leading>
            <Toolbar.Title>New Album</Toolbar.Title>
            <Toolbar.Trailing>{doneButton}</Toolbar.Trailing>
        </Toolbar>
    );
    const desktopActions = (
        <>
            <Button type="button" color="secondary" variant="outline" onClick={cancel}>
                Cancel
            </Button>
            <Button type="submit" form={formId} color="primary">Save</Button>
        </>
    );
    const nameControl = (
        <Input
            ref={nameInput}
            aria-label={phone ? 'Album Name' : undefined}
            placeholder="Album Name"
            value={draft.name}
            variant={phone ? 'ghost' : undefined}
            size={phone ? '3xl' : undefined}
            className={phone ? s.Name : undefined}
            aria-describedby={phone && nameError ? nameErrorId : undefined}
            invalid={!!nameError}
            onChange={(event) => {
                setDraft((current) => ({ ...current, name: event.target.value }));
                setNameError('');
            }}
            onClear={() => {
                setDraft((current) => ({ ...current, name: '' }));
                setNameError('');
            }}
        />
    );
    const form = (
        <form id={formId} className={s.Form} data-preview-keyboard={phone ? 'text' : undefined} onSubmit={save} noValidate>
            <div className={phone ? s.Photo : `${s.Photo} ${s.DesktopPhoto}`}>
                <div className={s.Cover} data-album-cover>
                    {visibleUrl && failedPhoto !== draft.photo ? (
                        <Image
                            src={visibleUrl}
                            alt="Album cover preview"
                            className={s.Image}
                            onError={() => {
                                setFailedPhoto(draft.photo);
                                setPhotoError(
                                    'This image could not be displayed. Choose another photo.',
                                );
                            }}
                        />
                    ) : (
                        <ImageSquare aria-label={placeholderLabel} aria-hidden={false} role="img" />
                    )}
                </div>
                <FileUpload
                    className={phone ? s.Picker : undefined}
                    label={draft.photo ? 'Change photo' : 'Add Photos'}
                    accept="image/jpeg,image/png,image/webp,image/gif"
                    maxFiles={1}
                    maxSize={10 * 1024 * 1024}
                    value={emptyPickerValue}
                    errorMessage={photoError || undefined}
                    onFileReject={(_file, reason) => setPhotoError(reason)}
                    onValueChange={(files) => {
                        const photo = files[0];
                        if (!photo) return;
                        previewPhoto(photo);
                        setDraft((current) => ({ ...current, photo }));
                        setPhotoError('');
                        setFailedPhoto(null);
                        setStatus('Photo selected.');
                    }}
                />
            </div>
            {phone ? (
                <FieldGroup aria-label="Album details" className={s.Details}>
                    <div data-row>
                        {nameControl}
                        {nameError && (
                            <FieldError id={nameErrorId} className={s.NameError}>
                                {nameError}
                            </FieldError>
                        )}
                    </div>
                </FieldGroup>
            ) : (
                <Field label="Album Name" errorMessage={nameError || undefined}>
                    {nameControl}
                </Field>
            )}
            {!phone && !showDialog && <div className={s.DesktopActions}>{desktopActions}</div>}
            <span role="status" className="sr-only">
                {status}
            </span>
        </form>
    );

    return (
        <div data-demo-stage className={s.Stage}>
            {showDialog ? (
                <Dialog
                    open={dialogOpen}
                    onOpenChange={(open) => {
                        if (!open) cancel();
                    }}
                >
                    <Dialog.Content
                        mobileVariant="sheet"
                        surface={surface}
                        showClose
                        width={480}
                        className={s.Sheet}
                        onCloseAutoFocus={onDialogScopeClose}
                        onOpenAutoFocus={(event) => { onDialogScopeOpen(event);
                            event.preventDefault();
                            if (!phonePreview) heading.current?.focus({ preventScroll: true });
                        }}
                    >
                        {phone && bar}
                        <Dialog.Header>
                            <div ref={heading} tabIndex={-1}>
                                <Dialog.Title>New Album</Dialog.Title>
                            </div>
                            <Dialog.Description className="sr-only">
                                Choose a cover photo and name. Save keeps this sample, and Cancel
                                discards unsaved changes.
                            </Dialog.Description>
                        </Dialog.Header>
                        <Dialog.Body>{form}</Dialog.Body>
                        {!phone && <Dialog.Footer>{desktopActions}</Dialog.Footer>}
                    </Dialog.Content>
                </Dialog>
            ) : phone ? (
                <Page ref={bindPage} tabIndex={-1} role="region" aria-label="New Album" surface={surface} className={s.Screen}>
                    {bar}
                    <Page.Content className={s.Content}>{form}</Page.Content>
                </Page>
            ) : (
                <div ref={bindPage} tabIndex={-1} role="region" aria-label="New Album" className={s.Desktop}>
                    <FieldGroup title="New Album" description="Choose a cover photo and name.">
                        {form}
                    </FieldGroup>
                </div>
            )}
        </div>
    );
}
