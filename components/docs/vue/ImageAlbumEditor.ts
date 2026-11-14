import { defineComponent, h, ref, shallowRef, useId as vueId, watch, type PropType } from 'vue';
import { Button, NavigationButton } from '@plexui/vue/components/Button';
import {
    Dialog,
    DialogBody,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogFooter,
    DialogTitle,
} from '@plexui/vue/components/Dialog';
import { Field } from '@plexui/vue/components/Field';
import { FieldError } from '@plexui/vue/components/FieldError';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { FileUpload } from '@plexui/vue/components/FileUpload';
import { ImageSquare } from '@plexui/vue/components/Icon';
import { Image } from '@plexui/vue/components/Image';
import { Input } from '@plexui/vue/components/Input';
import { Page, PageContent } from '@plexui/vue/components/Page';
import { Toolbar, ToolbarLeading, ToolbarTitle, ToolbarTrailing } from '@plexui/vue/components/Toolbar';
import { useBreakpoint as breakpoint } from '@plexui/vue/composables/useBreakpoints';
import { useDialogStagePresence as createDialogStagePresence } from './useDialogStagePresence';
import s from '../ImageAlbumDemo.module.css';

type AlbumDraft = { name: string; photo: File | null };
type InputHandle = { focus: () => void };
const emptyAlbum = (): AlbumDraft => ({ name: '', photo: null });
const emptyPickerValue: File[] = [];

/** The component owns its draft above the Page/Dialog presentation branch. */
export const ImageAlbumEditor = defineComponent({
    name: 'ImageAlbumEditor',
    props: {
        dialog: { type: Boolean, default: false },
        surface: { type: String as PropType<'plain' | 'grouped'>, default: 'grouped' },
        phonePreview: { type: Boolean, default: false },
        phoneHost: { type: Boolean, default: false },
    },
    emits: { 'update:dialog': (open: boolean) => typeof open === 'boolean' },
    setup(props, { emit }) {
        const wide = breakpoint('md');
        const phone = () => props.phonePreview || props.phoneHost || !wide.value;
        const draft = shallowRef<AlbumDraft>(emptyAlbum());
        let saved = emptyAlbum();
        const photoUrl = shallowRef<{ file: File; url: string } | null>(null);
        const failedPhoto = shallowRef<File | null>(null);
        const photoError = ref('');
        const nameError = ref('');
        const status = ref('');
        const nameInput = ref<InputHandle | null>(null);
        const heading = ref<HTMLDivElement | null>(null);
        const formId = `album-${vueId()}`;
        const nameErrorId = `${formId}-name-error`;
        const presence = createDialogStagePresence(() => props.dialog, () => !props.phoneHost);

        watch(
            () => draft.value.photo,
            (file, _previous, onCleanup) => {
                if (!file) {
                    photoUrl.value = null;
                    return;
                }
                const url = URL.createObjectURL(file);
                photoUrl.value = { file, url };
                onCleanup(() => URL.revokeObjectURL(url));
            },
        );

        const finish = () => {
            if (!props.phonePreview && props.dialog) emit('update:dialog', false);
        };
        const cancel = () => {
            draft.value = { ...saved };
            nameError.value = '';
            photoError.value = '';
            failedPhoto.value = null;
            status.value = 'Changes canceled.';
            finish();
        };
        const save = (event: Event) => {
            event.preventDefault();
            event.stopPropagation();
            if (!draft.value.name.trim()) {
                nameError.value = 'Enter an album name.';
                nameInput.value?.focus();
                return;
            }
            if (draft.value.photo && failedPhoto.value === draft.value.photo) return;
            saved = { ...draft.value };
            photoError.value = '';
            status.value = 'Album saved.';
            finish();
        };
        // The phone bar of the screen and of the Sheet: Cancel, the title and Save.
        const bar = () => h(Toolbar, null, () => [
            h(ToolbarLeading, null, closeButton),
            h(ToolbarTitle, null, () => 'New Album'),
            h(ToolbarTrailing, null, doneButton),
        ]);
        const closeButton = () => h(NavigationButton, {
            action: 'close', 'aria-label': 'Cancel album changes', onClick: cancel,
        });
        const doneButton = () => h(NavigationButton, {
            action: 'confirm', type: 'submit', form: formId, 'aria-label': 'Save album',
        });
        const desktopActions = () => [
            h(Button, { type: 'button', color: 'secondary', variant: 'outline', onClick: cancel }, () => 'Cancel'),
            h(Button, { type: 'submit', form: formId, color: 'primary' }, () => 'Save'),
        ];
        const nameControl = () => h(Input, {
            ref: nameInput,
            'aria-label': phone() ? 'Album Name' : undefined,
            placeholder: 'Album Name',
            value: draft.value.name,
            variant: phone() ? 'ghost' : undefined,
            size: phone() ? '3xl' : undefined,
            class: phone() ? s.Name : undefined,
            invalid: !!nameError.value,
            'aria-describedby': phone() && nameError.value ? nameErrorId : undefined,
            'onUpdate:value': (name: string) => {
                draft.value = { ...draft.value, name };
                nameError.value = '';
            },
            onClear: () => {
                draft.value = { ...draft.value, name: '' };
                nameError.value = '';
            },
        });
        const form = () => {
            const file = draft.value.photo;
            const url = photoUrl.value?.file === file ? photoUrl.value?.url : undefined;
            const placeholderLabel = !file
                ? 'No album photo'
                : failedPhoto.value === file
                  ? 'Photo preview unavailable'
                  : 'Loading album photo';
            return h('form', { id: formId, class: s.Form, 'data-preview-keyboard': phone() ? 'text' : undefined, onSubmit: save, novalidate: true }, [
                h('div', { class: [s.Photo, !phone() && s.DesktopPhoto] }, [
                    h('div', { class: s.Cover, 'data-album-cover': '' }, [
                        url && failedPhoto.value !== file
                            ? h(Image, {
                                  src: url,
                                  alt: 'Album cover preview',
                                  class: s.Image,
                                  onError: () => {
                                      failedPhoto.value = file;
                                      photoError.value =
                                          'This image could not be displayed. Choose another photo.';
                                  },
                              })
                            : h(ImageSquare, {
                                  'aria-label': placeholderLabel,
                                  'aria-hidden': false,
                                  role: 'img',
                              }),
                    ]),
                    h(FileUpload, {
                        class: phone() ? s.Picker : undefined,
                        label: file ? 'Change photo' : 'Add Photos',
                        accept: 'image/jpeg,image/png,image/webp,image/gif',
                        maxFiles: 1,
                        maxSize: 10 * 1024 * 1024,
                        value: emptyPickerValue,
                        errorMessage: photoError.value || undefined,
                        onFileReject: (_file: File, reason: string) => {
                            photoError.value = reason;
                        },
                        'onUpdate:value': (files: File[]) => {
                            const photo = files[0];
                            if (!photo) return;
                            draft.value = { ...draft.value, photo };
                            failedPhoto.value = null;
                            photoError.value = '';
                            status.value = 'Photo selected.';
                        },
                    }),
                ]),
                phone()
                    ? h(FieldGroup, { 'aria-label': 'Album details', class: s.Details }, () =>
                          h('div', { 'data-row': '' }, [
                              nameControl(),
                              nameError.value && h(FieldError, { id: nameErrorId, class: s.NameError }, () => nameError.value),
                          ]),
                      )
                    : h(Field, { label: 'Album Name', errorMessage: nameError.value || undefined }, nameControl),
                !phone() && !presence.present.value && h('div', { class: s.DesktopActions }, desktopActions()),
                h('span', { role: 'status', class: 'sr-only' }, status.value),
            ]);
        };

        return () =>
            h(
                'div',
                { 'data-demo-stage': '', class: s.Stage },
                presence.present.value
                    ? h(
                          Dialog,
                          {
                              open: presence.open.value,
                              'onUpdate:open': (open: boolean) => {
                                  if (!open) cancel();
                              },
                          },
                          () =>
                              h(
                                  DialogContent,
                                  {
                                      mobileVariant: 'sheet',
                                      surface: props.surface,
                                      showClose: true,
                                      width: 480,
                                      class: s.Sheet,
                                      onCloseAutoFocus: presence.onCloseAutoFocus,
                                      onOpenAutoFocus: (event: Event) => { presence.onOpenAutoFocus(event);
                                          event.preventDefault();
                                          if (!props.phonePreview)
                                              heading.value?.focus({ preventScroll: true });
                                      },
                                  },
                                  () => [
                                      phone() && bar(),
                                      h(DialogHeader, null, () => [
                                          h('div', { ref: heading, tabindex: -1 }, [
                                              h(DialogTitle, null, () => 'New Album'),
                                          ]),
                                          h(
                                              DialogDescription,
                                              { class: 'sr-only' },
                                              () =>
                                                  'Choose a cover photo and name. Save keeps this sample, and Cancel discards unsaved changes.',
                                          ),
                                      ]),
                                      h(DialogBody, null, form),
                                      !phone() && h(DialogFooter, null, desktopActions),
                                  ],
                              ),
                      )
                    : phone() ? h(Page, { ref: presence.pageRef, tabindex: -1, role: 'region', 'aria-label': 'New Album', surface: props.surface, class: s.Screen }, () => [
                          bar(),
                          h(PageContent, { class: s.Content }, form),
                      ]) : h('div', { ref: presence.pageRef, tabindex: -1, role: 'region', 'aria-label': 'New Album', class: s.Desktop }, [
                          h(FieldGroup, { title: 'New Album', description: 'Choose a cover photo and name.', bodyClass: s.DesktopBody }, form),
                      ]),
            );
    },
});
