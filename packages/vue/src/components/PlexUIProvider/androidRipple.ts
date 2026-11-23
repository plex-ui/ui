/**
 * The press of the Plex Android look: a ripple, as Android's RippleDrawable draws one (its timing and colors are in
 * `@plexui/styles/styles/android.css`). PlexUIProvider listens for presses while the platform is Android; a press
 * gives the control under the finger where its circle starts and how far it grows, as custom properties, and
 * restarts its animation (`data-ripple`). The styles decide which controls draw it, in what shape and color. The same
 * file is in @plexui/ui.
 */

/**
 * A control that can be pressed. A switch, a check, a radio or a value (a Select's or a date's) in a row is not one:
 * the row takes the press. A segment of a segmented control is a radio; a row of a choice list is a radio or a check.
 */
const HOSTS =
  'button:not(:is([role="switch"], [role="checkbox"], [role="radio"], [data-slot="select-control"]):where([data-row] *)), a[href], summary, [role="button"]:not([data-slot="select-control"]:where([data-row] *)), [role="menuitem"], [role="menuitemradio"], [role="menuitemcheckbox"], [role="option"], [role="tab"], :is([role="radio"], [role="checkbox"]):not(button, input), [data-row]'

type RippleHost = Element & ElementCSSInlineStyle

let installs = 0
let contents: Range | undefined

/**
 * Android's start: a circle of 30% of the control's longer side round the touch, moved in so it stays inside the
 * end circle: the one round the control's center that reaches its corners, or a fixed one (`--android-ripple-radius`,
 * a borderless ripple of 20px) round the center of what the control shows, its symbol or label, which a row's 44px
 * target may hold at its end. A key starts it at the center. The points are offsets from that center, so a layer of
 * another size round it (a borderless circle, moved by --android-ripple-ox and -oy) draws them as well.
 */
function press(host: RippleHost, clientX: number, clientY: number, centered: boolean) {
  // A press inside a control that drew one before ends that one, which :active would keep lit
  for (let held = host.parentElement?.closest("[data-ripple]"); held; held = held.parentElement?.closest("[data-ripple]")) {
    held.removeAttribute("data-ripple")
  }
  host.removeAttribute("data-ripple")
  // Reading the box applies the removal, so the attribute set below starts the animation again
  const box = host.getBoundingClientRect()
  const halfWidth = box.width / 2
  const halfHeight = box.height / 2
  let centerX = box.left + halfWidth
  let centerY = box.top + halfHeight
  const radius = parseFloat(getComputedStyle(host).getPropertyValue("--android-ripple-radius"))
  if (radius > 0) {
    // What it shows: the contents of the wrapper it may hold alone (a Button's inner box), not that wrapper's box
    let shown: Element = host
    while (shown.childNodes.length === 1 && shown.firstChild instanceof Element && !(shown.firstChild instanceof SVGElement)) {
      shown = shown.firstChild
    }
    contents ??= document.createRange()
    contents.selectNodeContents(shown)
    const content = contents.getBoundingClientRect()
    if (content.width > 0 && content.height > 0) {
      centerX = content.left + content.width / 2
      centerY = content.top + content.height / 2
    }
  }
  const end = radius > 0 ? radius : Math.sqrt(halfWidth * halfWidth + halfHeight * halfHeight)
  const start = Math.min(Math.max(box.width, box.height) * 0.3, end)
  let dx = centered ? 0 : clientX - centerX
  let dy = centered ? 0 : clientY - centerY
  const distance = Math.sqrt(dx * dx + dy * dy)
  const limit = Math.max(end - start, 0)
  if (distance > limit) {
    dx *= limit / distance
    dy *= limit / distance
  }
  const style = host.style
  style.setProperty("--android-ripple-ox", `${centerX - box.left - halfWidth}px`)
  style.setProperty("--android-ripple-oy", `${centerY - box.top - halfHeight}px`)
  style.setProperty("--android-ripple-x", `calc(50% + ${dx}px)`)
  style.setProperty("--android-ripple-y", `calc(50% + ${dy}px)`)
  style.setProperty("--android-ripple-r0", `${start}px`)
  style.setProperty("--android-ripple-r1", `${end}px`)
  host.setAttribute("data-ripple", "")
}

function onPointerDown(event: PointerEvent) {
  if (event.button !== 0 || !event.isPrimary || !(event.target instanceof Element)) return
  const host = event.target.closest(HOSTS) as RippleHost | null
  if (host) press(host, event.clientX, event.clientY, false)
}

function onKeyDown(event: KeyboardEvent) {
  if (event.repeat || (event.key !== "Enter" && event.key !== " ")) return
  if (event.target instanceof Element && event.target.matches(HOSTS)) press(event.target as RippleHost, 0, 0, true)
}

/** Starts the ripple on the document; the returned function stops it once every caller has. */
export function installAndroidRipple(): () => void {
  if (installs++ === 0) {
    document.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true })
    document.addEventListener("keydown", onKeyDown, { capture: true, passive: true })
  }
  let installed = true
  return () => {
    if (!installed) return
    installed = false
    if (--installs === 0) {
      document.removeEventListener("pointerdown", onPointerDown, { capture: true })
      document.removeEventListener("keydown", onKeyDown, { capture: true })
    }
  }
}
