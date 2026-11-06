import { defineComponent, h, inject, ref, useId as vueId, type PropType } from 'vue';
import { FieldError } from '@plexui/vue/components/FieldError';
import { FieldGroup } from '@plexui/vue/components/FieldGroup';
import { FloatingLabelInput } from '@plexui/vue/components/FloatingLabelInput';
import { Eye, EyeOff } from '@plexui/vue/components/Icon';
import { Input, InputAdornmentButton } from '@plexui/vue/components/Input';
import { Label } from '@plexui/vue/components/Label';
import { authFieldsKey, authMobileKey } from './AuthFields';
import s from '../AuthFields.module.css';

type AuthControlHandle = { focus: () => void; input: HTMLInputElement | null };

/** The caller owns values; the same native listeners and ref work in either presentation. */
export const AuthInput = defineComponent({
    name: 'AuthInput',
    inheritAttrs: false,
    props: {
        mobile: { type: Boolean, default: undefined },
        label: { type: String, required: true },
        errorMessage: String,
        description: String,
        invalid: { type: Boolean, default: undefined },
        disabled: { type: Boolean, default: false },
        readOnly: { type: Boolean, default: false },
        readonly: { type: Boolean, default: false },
        revealable: { type: Boolean, default: undefined },
        allowAutofillExtensions: { type: Boolean, default: false },
        onClear: Function as PropType<() => void>,
        labelPlacement: { type: String as PropType<'border' | 'inside'>, default: 'border' },
        pill: { type: Boolean, default: true },
        id: String,
        name: String,
        type: { type: String, default: 'text' },
        value: { type: [String, Number] as PropType<string | number>, default: undefined },
        defaultValue: { type: [String, Number] as PropType<string | number>, default: undefined },
    },
    emits: {
        'update:value': (value: string) => typeof value === 'string',
        autofill: () => true,
        revealedChange: (value: boolean) => typeof value === 'boolean',
    },
    setup(props, { attrs, slots, emit, expose }) {
        const shellMobile = inject(authMobileKey, () => false);
        const inFields = inject(authFieldsKey, () => false);
        const control = ref<AuthControlHandle | null>(null);
        const revealed = ref(false);
        const generatedId = vueId();
        expose({
            focus: () => control.value?.focus(),
            get input() {
                return control.value?.input ?? null;
            },
        });

        return () => {
            const { mobile: explicitMobile, ...fieldProps } = props;
            const mobile = explicitMobile ?? shellMobile();
            if (!mobile) {
                return h(
                    FloatingLabelInput,
                    {
                        ...attrs,
                        ...fieldProps,
                        ref: control,
                        'onUpdate:value': (value: string) => emit('update:value', value),
                        onAutofill: () => emit('autofill'),
                        onRevealedChange: (value: boolean) => emit('revealedChange', value),
                    },
                    slots,
                );
            }

            const { class: className, ...nativeAttrs } = attrs;
            const id = props.id ?? `auth-input-${generatedId}`;
            const description = slots.description?.() ?? props.description;
            const errorId = props.errorMessage ? `${id}-error` : undefined;
            const descriptionId = description ? `${id}-description` : undefined;
            const invalid = props.invalid ?? !!props.errorMessage;
            const ariaInvalid = attrs['aria-invalid'];
            const explicitInvalid =
                typeof ariaInvalid === 'boolean' ||
                ariaInvalid === 'true' ||
                ariaInvalid === 'false' ||
                ariaInvalid === 'grammar' ||
                ariaInvalid === 'spelling'
                    ? ariaInvalid
                    : undefined;
            const revealable =
                props.revealable ?? (props.type === 'password' && !slots.endAdornment);
            const row = h(
                'div',
                {
                    class: [s.Row, inFields() ? className : undefined],
                    'data-row': inFields() ? undefined : '',
                    'data-auth-input': '',
                },
                [
                    h(Label, { for: id, class: 'sr-only' }, () => props.label),
                    h(
                        Input,
                        {
                            ...nativeAttrs,
                            ref: control,
                            id,
                            name: props.name,
                            ...(props.value === undefined ? {} : { value: props.value }),
                            ...(props.defaultValue === undefined
                                ? {}
                                : { defaultValue: props.defaultValue }),
                            type: props.type === 'password' && revealed.value ? 'text' : props.type,
                            disabled: props.disabled,
                            readOnly: props.readOnly || props.readonly,
                            invalid,
                            allowAutofillExtensions: props.allowAutofillExtensions,
                            onClear: props.onClear,
                            placeholder:
                                typeof attrs.placeholder === 'string'
                                    ? attrs.placeholder
                                    : props.label,
                            'aria-invalid': explicitInvalid ?? (invalid || undefined),
                            'aria-describedby':
                                [attrs['aria-describedby'], errorId, descriptionId]
                                    .filter(Boolean)
                                    .join(' ') || undefined,
                            variant: 'ghost',
                            size: '3xl',
                            pill: false,
                            class: s.Control,
                            'onUpdate:value': (value: string) => emit('update:value', value),
                            onAutofill: () => emit('autofill'),
                        },
                        {
                            startAdornment: slots.startAdornment,
                            endAdornment:
                                slots.endAdornment || (revealable && !props.disabled)
                                    ? () => [
                                          slots.endAdornment?.(),
                                          revealable && !props.disabled
                                              ? h(
                                                    InputAdornmentButton,
                                                    {
                                                        class: s.Reveal,
                                                        'aria-label': revealed.value
                                                            ? 'Hide'
                                                            : 'Show',
                                                        'aria-pressed': revealed.value,
                                                        onPointerdown: (event: PointerEvent) => {
                                                            if (event.button === 0)
                                                                event.preventDefault();
                                                        },
                                                        onClick: () => {
                                                            revealed.value = !revealed.value;
                                                            emit('revealedChange', revealed.value);
                                                        },
                                                    },
                                                    () => h(revealed.value ? EyeOff : Eye),
                                                )
                                              : null,
                                      ]
                                    : undefined,
                        },
                    ),
                    props.errorMessage
                        ? h(FieldError, { id: errorId, class: s.Note }, () => props.errorMessage)
                        : null,
                    description
                        ? h(
                              'div',
                              { id: descriptionId, class: [s.Note, s.Description] },
                              description,
                          )
                        : null,
                ],
            );
            return inFields()
                ? row
                : h(
                      FieldGroup,
                      {
                          class: [s.Group, className],
                          bodyClass: s.Body,
                          'data-auth-fields': '',
                      },
                      () => row,
                  );
        };
    },
});
