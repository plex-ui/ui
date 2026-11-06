export const RESEND_WAIT_SECONDS = 30;

/** A demo checks completeness only; the server must validate the actual code. */
export function isVerificationCodeReady(mode: string, value: string): boolean {
    return mode === 'per-digit' ? /^\d{6}$/.test(value) : /^[a-z0-9]+$/i.test(value.trim());
}

export interface VerificationAttempt {
    start: (mode: string, value: string) => boolean;
    isPending: () => boolean;
    edit: (value: string) => void;
    setPending: (pending: boolean) => void;
    reset: () => void;
}

/** Completion is an input event, not an effect of rendering a filled code. */
export function createVerificationAttempt(): VerificationAttempt {
    let pending = false;
    let completedCode: string | null = null;
    return {
        isPending: () => pending,
        start(mode, value) {
            if (pending || !isVerificationCodeReady(mode, value)) return false;
            if (mode === 'per-digit' && completedCode === value) return false;
            pending = true;
            if (mode === 'per-digit') completedCode = value;
            return true;
        },
        edit(value) {
            if (!pending && value !== completedCode) completedCode = null;
        },
        setPending(value) {
            pending = value;
        },
        reset() {
            pending = false;
            completedCode = null;
        },
    };
}

/** Each mounted preview owns its timer. A deadline avoids drift in background tabs. */
export function startResendCountdown(
    onTick: (seconds: number) => void,
    onComplete: () => void,
): () => void {
    const deadline = Date.now() + RESEND_WAIT_SECONDS * 1000;
    onTick(RESEND_WAIT_SECONDS);
    const timer = setInterval(() => {
        const remaining = Math.max(0, Math.ceil((deadline - Date.now()) / 1000));
        onTick(remaining);
        if (remaining === 0) {
            clearInterval(timer);
            onComplete();
        }
    }, 1000);
    return () => clearInterval(timer);
}
