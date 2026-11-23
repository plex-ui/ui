/**
 * An Accordion item opens and closes as an iOS 27.2 DisclosureGroup: the panel takes its height at once, its content
 * shows through a clip that grows down from the trigger (the CSS keyframes of the panel), and what follows the item
 * slides down into place, or up when it closes, by a transform. The page lays out once per toggle, not once a frame.
 *
 * The panel's `data-state` changing (or an open panel being inserted, as `asChild` does) is the toggle: a
 * MutationObserver sees it after the framework has updated the DOM and before the frame paints, so the panel's height
 * is known and what follows can be moved back to where it was, then let go. Each move is added to what the element
 * already does (`composite: "add"`), so one item closing while another opens, a nested item inside a moving one, or a
 * quick second toggle all sum to where the layout puts things. Time and curve are the panel's
 * `--accordion-motion-duration` and `--accordion-motion-easing`, which its keyframes use too. With reduced motion,
 * or a zero duration, nothing moves.
 */

type Classes = { root: string; item: string; content: string }

const toMilliseconds = (value: string) => {
  const number = parseFloat(value)
  if (!Number.isFinite(number)) return 0
  return value.trim().endsWith("ms") ? number : number * 1000
}

/** The elements that follow an item, up to the outermost Accordion it is in: what moves when its panel resizes. */
const followersOf = (item: HTMLElement, rootClass: string) => {
  let top: HTMLElement | null = item.closest<HTMLElement>(`.${rootClass}`)
  while (top?.parentElement?.closest(`.${rootClass}`)) top = top.parentElement.closest<HTMLElement>(`.${rootClass}`)
  const followers: HTMLElement[] = []
  for (let node: Element | null = item; node && node !== top; node = node.parentElement) {
    for (let sibling = node.nextElementSibling; sibling; sibling = sibling.nextElementSibling) {
      if (sibling instanceof HTMLElement) followers.push(sibling)
    }
  }
  return followers
}

/** A closing panel's moves, held until the panel leaves the layout. */
type Closing = { animations: Animation[]; release: (cancel: boolean) => void }

export function attachAccordionMotion(root: HTMLElement, classes: Classes): () => void {
  if (typeof MutationObserver === "undefined" || typeof window === "undefined") return () => {}
  const all = new Set<Animation>()
  const closing = new Map<HTMLElement, Closing>()

  const stopAll = () => {
    for (const entry of [...closing.values()]) entry.release(true)
    for (const animation of [...all]) animation.cancel()
    all.clear()
  }

  const track = (animation: Animation) => {
    all.add(animation)
    const forget = () => all.delete(animation)
    animation.addEventListener("finish", forget)
    animation.addEventListener("cancel", forget)
    return animation
  }

  const toggle = (panel: HTMLElement, opening: boolean) => {
    const item = panel.parentElement
    if (!item?.classList.contains(classes.item) || typeof item.animate !== "function") return

    // Opened again while it closes: its moves turn back to where they started, and nothing else is needed, as the
    // panel never left the layout
    const pending = closing.get(panel)
    if (pending) {
      if (opening) {
        pending.release(false)
        for (const animation of pending.animations) {
          animation.reverse()
          animation.addEventListener("finish", () => animation.cancel())
        }
        return
      }
      pending.release(true)
    }

    const height = panel.getBoundingClientRect().height
    const style = getComputedStyle(panel)
    const duration = toMilliseconds(style.getPropertyValue("--accordion-motion-duration"))
    const easing = style.getPropertyValue("--accordion-motion-easing").trim() || "ease"
    if (!height || !duration) return

    const shift = { transform: `translateY(${-height}px)` }
    const animations = followersOf(item, classes.root).map((follower) =>
      track(
        follower.animate(opening ? [shift, { transform: "none" }] : [{ transform: "none" }, shift], {
          duration,
          easing,
          composite: "add",
          // Closing, what follows holds its place over the closed panel until the panel leaves the layout
          fill: opening ? "none" : "forwards",
        }),
      ),
    )
    if (opening || animations.length === 0) return

    // The panel hides when its closing keyframes end; then what follows lets go of the shift, which the layout
    // now gives it. A timer covers a panel whose animation never ends (removed, or its keyframes overridden).
    let timer = 0
    const onEnd = (event: AnimationEvent) => {
      if (event.target === panel) entry.release(true)
    }
    const entry: Closing = {
      animations,
      release: (cancel) => {
        window.clearTimeout(timer)
        panel.removeEventListener("animationend", onEnd)
        if (closing.get(panel) === entry) closing.delete(panel)
        if (cancel) for (const animation of animations) animation.cancel()
      },
    }
    panel.addEventListener("animationend", onEnd)
    timer = window.setTimeout(() => entry.release(true), duration + 100)
    closing.set(panel, entry)
  }

  const isOwnPanel = (node: Node): node is HTMLElement =>
    node instanceof HTMLElement &&
    node.classList.contains(classes.content) &&
    node.closest(`.${classes.root}`) === root

  const observer = new MutationObserver((records) => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
      stopAll()
      return
    }
    for (const record of records) {
      if (record.type === "attributes") {
        const panel = record.target
        if (isOwnPanel(panel) && record.oldValue !== panel.dataset.state) toggle(panel, panel.dataset.state === "open")
        continue
      }
      // A panel rendered only while open (`asChild`) arrives open
      for (const node of record.addedNodes) {
        if (isOwnPanel(node) && node.dataset.state === "open") toggle(node, true)
      }
    }
  })
  observer.observe(root, {
    subtree: true,
    childList: true,
    attributes: true,
    attributeFilter: ["data-state"],
    attributeOldValue: true,
  })

  return () => {
    observer.disconnect()
    stopAll()
  }
}
