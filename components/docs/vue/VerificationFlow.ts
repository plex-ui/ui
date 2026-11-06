import { defineComponent, onBeforeUnmount, ref, watch } from 'vue';
import { createVerificationAttempt, RESEND_WAIT_SECONDS, startResendCountdown } from '../verificationCountdown';

/** One preview owns its request guard and timer across Page/Dialog changes. */
export const VerificationFlow = defineComponent({
    name: 'VerificationFlow',
    props: {
        cooldown: { type: Boolean, default: false },
        verifying: { type: Boolean, default: false },
        error: { type: Boolean, default: false },
    },
    emits: {
        'update:cooldown': (value: boolean) => typeof value === 'boolean',
        'update:verifying': (value: boolean) => typeof value === 'boolean',
        'update:error': (value: boolean) => typeof value === 'boolean',
    },
    setup(props, { emit, slots }) {
        const seconds = ref(RESEND_WAIT_SECONDS);
        const attempt = createVerificationAttempt();
        let cancel: (() => void) | undefined;
        const setVerifying = (value: boolean) => {
            attempt.setPending(value);
            emit('update:verifying', value);
        };
        watch(() => props.verifying, (value) => attempt.setPending(value), { immediate: true, flush: 'sync' });
        watch(() => props.error, (value) => {
            if (value) setVerifying(false);
        }, { flush: 'sync' });
        watch(() => props.cooldown, (active) => {
            cancel?.();
            cancel = active ? startResendCountdown(
                (remaining) => { seconds.value = remaining; },
                () => emit('update:cooldown', false),
            ) : undefined;
        }, { immediate: true });
        onBeforeUnmount(() => cancel?.());

        const complete = (value: string) => {
            if (!attempt.start('per-digit', value)) return;
            emit('update:error', false);
            emit('update:verifying', true);
        };
        const edit = (value: string) => {
            attempt.edit(value);
            emit('update:error', false);
        };
        const submit = (mode: string, value: string) => {
            if (mode !== 'text-field' || !attempt.start(mode, value)) return;
            emit('update:error', false);
            emit('update:verifying', true);
        };
        const resend = () => {
            if (props.cooldown || props.verifying || attempt.isPending()) return;
            attempt.reset();
            emit('update:error', false);
            emit('update:cooldown', true);
        };
        return () => slots.default?.({ seconds: props.cooldown ? seconds.value : 0, complete, edit, submit, resend });
    },
});
