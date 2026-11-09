"use client"

import clsx from "clsx"
import { isValidElement, useCallback, useEffect, useLayoutEffect, useRef, useState, useSyncExternalStore, type CSSProperties, type ReactNode } from "react"
import { toast, useSonner, type Action, type ToastT, type ToasterProps } from "sonner"
import { CheckCircle, InfoCircle, Warning, XCircle } from "../Icon"
import { announcerStyle, documentDirection, offsetStyles, ToastLifecycle, type Position, type ToastEntry } from "./toastLifecycle"

const CloseIcon = () => <svg xmlns="http://www.w3.org/2000/svg" aria-hidden="true" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" /></svg>
const fallbackIcons = { success: <CheckCircle aria-hidden="true" />, error: <XCircle aria-hidden="true" />, warning: <Warning aria-hidden="true" />, info: <InfoCircle aria-hidden="true" /> }
const actionObject = (value: Action | ReactNode): value is Action => typeof value === "object" && value !== null && "label" in value
const content = (value: ToastT["title"]) => typeof value === "function" ? value() : value

function ToastItem({ entry, lifecycle, props, index, count }: { entry: ToastEntry<ToastT>; lifecycle: ToastLifecycle<ToastT>; props: ToasterProps; index: number; count: number }) {
  const node = useRef<HTMLLIElement>(null)
  const item = entry.toast
  const classes = props.toastOptions?.classNames
  const slot = (name: keyof NonNullable<typeof classes>) => clsx(classes?.[name], item.classNames?.[name])
  const position = lifecycle.position(entry)
  const [y, x] = position.split("-")
  const visible = index < (props.visibleToasts ?? 3)
  const disabled = item.dismissible === false || item.type === "loading"
  const type = item.type === "normal" || item.type === "default" ? undefined : item.type
  const iconKey = type && type in fallbackIcons ? type as keyof typeof fallbackIcons : undefined
  const icon = item.icon !== undefined ? item.icon : iconKey ? props.icons?.[iconKey] !== undefined ? props.icons[iconKey] : fallbackIcons[iconKey] : undefined
  const custom = Boolean(item.jsx)
  const alert = lifecycle.alertRole(entry, custom)
  // After every render: a new toast, or new words in one (a promise that settles), is read once
  useLayoutEffect(() => { if (node.current) lifecycle.speak(item.id, node.current, custom) })
  useLayoutEffect(() => {
    const element = node.current
    if (!element) return
    lifecycle.setNode(item.id, element)
    const measure = () => {
      const height = element.style.height
      element.style.height = "auto"
      lifecycle.measure(item.id, element.offsetHeight || element.getBoundingClientRect().height)
      element.style.height = height
    }
    measure()
    const observer = typeof ResizeObserver !== "undefined" ? new ResizeObserver(measure) : null
    observer?.observe(element)
    for (const child of element.children) observer?.observe(child)
    // A custom toast that changes its own words, without a new render here, is read again too
    const words = typeof MutationObserver !== "undefined" ? new MutationObserver(() => lifecycle.speak(item.id, element, Boolean(item.jsx))) : null
    words?.observe(element, { childList: true, characterData: true, subtree: true })
    return () => { observer?.disconnect(); words?.disconnect(); lifecycle.setNode(item.id, null) }
  }, [item, lifecycle])
  const actionButton = (kind: "action" | "cancel") => {
    const action = item[kind]
    if (isValidElement(action)) return action
    if (!actionObject(action)) return null
    return <button type="button" data-button="true" {...{ [`data-${kind}`]: "true" }} disabled={kind === "cancel" && disabled}
      className={slot(kind === "action" ? "actionButton" : "cancelButton")}
      style={kind === "action" ? item.actionButtonStyle ?? props.toastOptions?.actionButtonStyle : item.cancelButtonStyle ?? props.toastOptions?.cancelButtonStyle}
      onClick={(event) => {
        if (kind === "cancel" && disabled) return
        action.onClick(event)
        if (kind === "action" && event.defaultPrevented) return
        lifecycle.close(item.id, "action")
      }}>{action.label}</button>
  }
  return <li ref={node} tabIndex={visible && !entry.removed ? 0 : -1} inert={!visible || entry.removed || undefined}
    aria-hidden={!visible || entry.removed || undefined}
    className={clsx(props.toastOptions?.className, item.className, slot("toast"), slot("default"), type && slot(type as keyof NonNullable<typeof classes>))}
    data-sonner-toast="" data-rich-colors={item.richColors ?? props.richColors} data-styled={!Boolean(item.jsx || item.unstyled || props.toastOptions?.unstyled)}
    data-mounted={entry.mounted} data-promise={Boolean(item.promise)} data-swiped={Boolean(entry.x || entry.y)} data-removed={entry.removed}
    data-visible={visible} data-y-position={y} data-x-position={x} data-index={index} data-front={index === 0} data-swiping={entry.swiping}
    data-dismissible={item.dismissible !== false} data-type={type} data-invert={item.invert || props.invert}
    data-swipe-out={Boolean(entry.swipeOut)} data-swipe-direction={entry.swipeOut} data-expanded={lifecycle.expanded || Boolean(props.expand && entry.mounted)} data-testid={item.testId}
    style={{ "--index": index, "--toasts-before": index, "--z-index": count - index, "--offset": `${lifecycle.offset(entry)}px`, "--initial-height": props.expand ? "auto" : `${entry.height}px`, "--swipe-amount-x": `${entry.x}px`, "--swipe-amount-y": `${entry.y}px`, ...props.toastOptions?.style, ...item.style } as CSSProperties}
    onPointerDown={(event) => lifecycle.pointerDown(item.id, event.nativeEvent)} onPointerMove={(event) => lifecycle.pointerMove(item.id, event.nativeEvent)}
    onPointerUp={(event) => lifecycle.pointerEnd(item.id, event.nativeEvent)} onPointerCancel={(event) => lifecycle.pointerEnd(item.id, event.nativeEvent, true)}
    onLostPointerCapture={(event) => lifecycle.pointerEnd(item.id, event.nativeEvent, true)}>
    {(item.closeButton ?? props.toastOptions?.closeButton ?? props.closeButton) && !item.jsx && item.type !== "loading" && <button type="button" aria-label={props.toastOptions?.closeButtonAriaLabel ?? "Close toast"} data-disabled={disabled} disabled={disabled} data-close-button="true" className={slot("closeButton")} onClick={() => lifecycle.close(item.id, "dismiss")}>{props.icons?.close ?? <CloseIcon />}</button>}
    {(type || item.icon || item.promise) && item.icon !== null && icon !== null && <div data-icon="" className={slot("icon")}>
      {item.promise || item.type === "loading" ? item.icon ?? <div className={clsx("sonner-loading-wrapper", slot("loader"))} data-visible={item.type === "loading"}>
        {props.icons?.loading ? <div className="sonner-loader" data-visible={item.type === "loading"}>{props.icons.loading}</div> : <div className="sonner-spinner">{Array.from({ length: 12 }, (_, i) => <div key={i} className="sonner-loading-bar" />)}</div>}
      </div> : null}
      {item.type !== "loading" ? icon : null}
    </div>}
    <div data-content="" role={alert ? "alert" : undefined} className={slot("content")}><div data-title="" className={slot("title")}>{item.jsx ?? content(item.title)}</div>
      {item.description ? <div data-description="" className={clsx(props.toastOptions?.descriptionClassName, item.descriptionClassName, slot("description"))}>{content(item.description)}</div> : null}</div>
    {actionButton("cancel")}{actionButton("action")}
  </li>
}

/** Owns presentation/interaction only; Sonner remains the public toast store. */
export function ToastRenderer(props: ToasterProps) {
  const { toasts } = useSonner()
  const [lifecycle] = useState(() => new ToastLifecycle<ToastT>(toast.dismiss, (reason, item) => reason === "auto" ? item.onAutoClose?.(item) : item.onDismiss?.(item)))
  useSyncExternalStore(lifecycle.subscribe, lifecycle.snapshot, lifecycle.snapshot)
  const hotkey = props.hotkey ?? ["altKey", "KeyT"]
  const hotkeyKey = hotkey.join("+")
  useEffect(() => {
    lifecycle.connect(document)
    return () => lifecycle.disconnect()
  }, [lifecycle])
  useEffect(() => {
    const keydown = (event: KeyboardEvent) => lifecycle.keyDown(event, hotkeyKey ? hotkeyKey.split("+") : [])
    document.addEventListener("keydown", keydown)
    return () => document.removeEventListener("keydown", keydown)
  }, [lifecycle, hotkeyKey])
  useEffect(() => {
    lifecycle.sync(toasts, { id: props.id, position: props.position ?? "bottom-right", duration: props.toastOptions?.duration ?? props.duration ?? 4000, gap: props.gap ?? 14, visibleToasts: props.visibleToasts ?? 3, expand: props.expand, swipeDirections: props.swipeDirections })
  }, [lifecycle, toasts, props.id, props.position, props.duration, props.toastOptions?.duration, props.gap, props.visibleToasts, props.expand, props.swipeDirections])
  const region = useCallback((node: HTMLElement | null) => lifecycle.setRegion(node), [lifecycle])
  const polite = useCallback((node: HTMLElement | null) => lifecycle.setAnnouncer("polite", node), [lifecycle])
  const assertive = useCallback((node: HTMLElement | null) => lifecycle.setAnnouncer("assertive", node), [lifecycle])
  const positions = [...new Set(lifecycle.entries.map((entry) => lifecycle.position(entry)))]
  const dir = props.dir === "auto" || !props.dir ? documentDirection(typeof document === "undefined" ? undefined : document) : props.dir
  // aria-live="off": not a live region itself (an announcer or an alert's role speaks, once), but a modal's
  // aria-hidden on everything else (Radix and Reka call aria-hidden's hideOthers) keeps any [aria-live]
  return <section ref={region} aria-label={`${props.containerAriaLabel ?? "Notifications"} ${hotkeyKey.replace(/Key|Digit/g, "")}`} tabIndex={-1} aria-live="off">
    <div ref={polite} role="status" aria-live="polite" aria-atomic="false" data-toast-announcer="polite" style={announcerStyle} />
    <div ref={assertive} role="alert" aria-live="assertive" aria-atomic="false" data-toast-announcer="assertive" style={announcerStyle} />
    {positions.map((position: Position) => {
      const entries = lifecycle.at(position)
      const [y, x] = position.split("-")
      return <ol key={position} ref={(node) => lifecycle.setList(position, node)} dir={dir} tabIndex={-1} className={props.className}
        data-sonner-toaster="true" data-sonner-theme={props.theme ?? "light"} data-y-position={y} data-x-position={x}
        style={{ "--front-toast-height": `${entries.find((entry) => !entry.removed)?.height ?? 0}px`, "--width": "356px", "--gap": `${props.gap ?? 14}px`, ...props.style, ...offsetStyles(props.offset, props.mobileOffset) } as CSSProperties}
        onFocus={(event) => lifecycle.focusIn(event.nativeEvent)} onBlur={(event) => lifecycle.focusOut(event.nativeEvent)}
        onPointerEnter={(event) => lifecycle.pointerEnter(event.nativeEvent)} onMouseEnter={() => lifecycle.hover(true)} onMouseMove={() => lifecycle.hover(true)} onMouseLeave={() => lifecycle.hover(false)}>
        {entries.map((entry, index) => <ToastItem key={entry.toast.id} entry={entry} lifecycle={lifecycle} props={props} index={index} count={entries.length} />)}
      </ol>
    })}
  </section>
}
