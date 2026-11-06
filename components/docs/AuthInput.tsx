'use client';

import { useId, useRef, useState, type ReactNode, type Ref } from 'react';
import clsx from 'clsx';
import { FieldError } from '@plexui/ui/components/FieldError';
import { FieldGroup } from '@plexui/ui/components/FieldGroup';
import {
    FloatingLabelInput,
    type FloatingLabelInputProps,
} from '@plexui/ui/components/FloatingLabelInput';
import { Eye, EyeOff } from '@plexui/ui/components/Icon';
import { Input } from '@plexui/ui/components/Input';
import { Label } from '@plexui/ui/components/Label';
import { useBreakpoint } from '@plexui/ui/hooks/useBreakpoints';
import { useAuthFields } from './AuthFields';
import s from './AuthFields.module.css';

export type AuthInputProps = Omit<FloatingLabelInputProps, 'multiline' | 'rows' | 'size'> & {
    ref?: Ref<HTMLInputElement>;
};

/** The native auth field has a placeholder and caret, without a floating label. */
export function AuthInput(props: AuthInputProps): ReactNode {
    const wide = useBreakpoint('md');
    const grouped = useAuthFields();
    const generatedId = useId();
    const [revealed, setRevealed] = useState(false);
    const revealedRef = useRef(false);

    const {
        label,
        description,
        errorMessage,
        invalid: invalidProp,
        className,
        labelPlacement,
        pill,
        revealable: revealableProp,
        onRevealedChange,
        id = `auth-input-${generatedId}`,
        type = 'text',
        disabled = false,
        endAdornment,
        allowAutofillExtensions = false,
        'aria-describedby': describedBy,
        'aria-invalid': ariaInvalid,
        ...inputProps
    } = props;
    if (wide) return <FloatingLabelInput {...props} labelPlacement={labelPlacement} pill={pill} />;

    const invalid = invalidProp ?? !!errorMessage;
    const errorId = errorMessage ? `${id}-error` : undefined;
    const descriptionId = description ? `${id}-description` : undefined;
    const revealable = revealableProp ?? (type === 'password' && !endAdornment);
    const toggle =
        revealable && !disabled ? (
            <Input.AdornmentButton
                className={s.Reveal}
                aria-label={revealed ? 'Hide' : 'Show'}
                aria-pressed={revealed}
                onPointerDown={(event) => {
                    if (event.button === 0) event.preventDefault();
                }}
                onClick={() => {
                    revealedRef.current = !revealedRef.current;
                    setRevealed(revealedRef.current);
                    onRevealedChange?.(revealedRef.current);
                }}
            >
                {revealed ? <EyeOff /> : <Eye />}
            </Input.AdornmentButton>
        ) : null;
    const row = (
        <div
            className={clsx(s.Row, grouped && className)}
            data-row={grouped ? undefined : ''}
            data-auth-input
        >
            <Label htmlFor={id} className="sr-only">
                {label}
            </Label>
            <Input
                {...inputProps}
                id={id}
                type={type === 'password' && revealed ? 'text' : type}
                disabled={disabled}
                invalid={invalid}
                allowAutofillExtensions={allowAutofillExtensions}
                placeholder={inputProps.placeholder ?? label}
                aria-invalid={ariaInvalid ?? (invalid || undefined)}
                aria-describedby={
                    [describedBy, errorId, descriptionId].filter(Boolean).join(' ') || undefined
                }
                variant="ghost"
                size="3xl"
                pill={false}
                className={s.Control}
                endAdornment={
                    endAdornment || toggle ? (
                        <>
                            {endAdornment}
                            {toggle}
                        </>
                    ) : undefined
                }
            />
            {errorMessage && (
                <FieldError id={errorId} className={s.Note}>
                    {errorMessage}
                </FieldError>
            )}
            {description && (
                <div id={descriptionId} className={clsx(s.Note, s.Description)}>
                    {description}
                </div>
            )}
        </div>
    );
    return grouped ? (
        row
    ) : (
        <FieldGroup className={clsx(s.Group, className)} bodyClassName={s.Body} data-auth-fields>
            {row}
        </FieldGroup>
    );
}
