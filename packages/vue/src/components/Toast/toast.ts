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

const withData =
  (show: (message: Message, data?: ExternalToast) => string | number) => (message: Message, data?: ExternalToast) =>
    show(message, withDescriptionClass(data))

export const toast: typeof sonnerToast = Object.assign(withData(sonnerToast), {
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
