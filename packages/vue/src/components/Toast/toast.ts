import clsx from "clsx"
import { toast as sonnerToast, type ExternalToast, type ToastClasses } from "vue-sonner"

// vue-sonner's `toast`, with a toast's own `descriptionClass` (sonner
// `descriptionClassName`) applied: vue-sonner reads only the Toaster's, so the
// toast's goes into its `classes.description`. It then comes after the
// Toaster's description class in the class list, where sonner puts it before.

type ToastData = { descriptionClass?: string; classes?: ToastClasses }

const withDescriptionClass = <T extends ToastData | undefined>(data: T): T =>
  data?.descriptionClass
    ? { ...data, classes: { ...data.classes, description: clsx(data.descriptionClass, data.classes?.description) } }
    : data

type Message = Parameters<typeof sonnerToast>[0]

/** vue-sonner's options; `icon: null` leaves a typed toast's icon out, as sonner's React `icon: null` does. */
export type ToastOptions = Omit<ExternalToast, "icon"> & { icon?: ExternalToast["icon"] | null }
type Show = (message: Message, data?: ToastOptions) => string | number
type Typed = "success" | "info" | "warning" | "error" | "message" | "loading"
type PlexToast = Show & Omit<typeof sonnerToast, Typed> & Record<Typed, Show>

const withData =
  (show: (message: Message, data?: ExternalToast) => string | number): Show => (message, data) =>
    // The renderer reads a null icon as none; vue-sonner passes the option through as it is
    show(message, withDescriptionClass(data as ExternalToast | undefined))

export const toast: PlexToast = Object.assign(withData(sonnerToast), {
  ...sonnerToast,
  success: withData(sonnerToast.success),
  info: withData(sonnerToast.info),
  warning: withData(sonnerToast.warning),
  error: withData(sonnerToast.error),
  message: withData(sonnerToast.message),
  loading: withData(sonnerToast.loading),
  custom: ((component, data) => sonnerToast.custom(component, withDescriptionClass(data))) as typeof sonnerToast.custom,
  promise: ((promise, data) => sonnerToast.promise(promise, withDescriptionClass(data))) as typeof sonnerToast.promise,
})
