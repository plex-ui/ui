import { Children, isValidElement, useEffect, useRef, useState, type ComponentRef, type ReactNode } from "react"
import { Animated, Easing, Platform, StyleSheet, View, type EasingFunction, type StyleProp, type ViewStyle } from "react-native"
import { useTheme } from "../../theme/ThemeProvider"

export type RevealProps = {
  /** The items, each coming in on its own: one child each. */
  children: ReactNode
  /** Whether the items come in now; while false they wait unseen. Set it again later to play them then. @default true */
  play?: boolean
  /** The order the items come in, as their indexes in the children (the rest after them, in order). */
  order?: number[]
  /** How long after the first an item starts, ms, from the one before it. @default 50 */
  stagger?: number
  /** How long before the first starts, ms. @default 0 */
  delay?: number
  /**
   * Each item's own time, ms, on `easing`. Without it an item comes in on the system's spring (iOS's smooth spring,
   * a response of 0.35 s, settled in 0.5 s), as SwiftUI's default transition.
   */
  duration?: number
  /** The curve of a timed item. @default ease-out */
  easing?: EasingFunction
  /** How far an item rises as it fades in, pt. @default 8 */
  rise?: number
  /** Called once the last item is in. */
  onDone?: () => void
  /** The gap between the items, as a column's. */
  gap?: number
  testID?: string
  style?: StyleProp<ViewStyle>
}

/**
 * Items coming in one after another, each fading in and rising a little, as a list's rows come in on iOS and as
 * Material lists enter: a short stagger (50 ms) on the system's spring by default. `order` sets which comes first,
 * `stagger`, `delay` and `duration` the timing (a step of `duration` plays them one after the other), `onDone` is
 * told when the last is in. A screen reader finds every item from the start; with reduced motion they are all there
 * at once.
 */
export function Reveal({ children, play = true, order, stagger = 50, delay = 0, duration, easing, rise = 8, onDone, gap, testID, style }: RevealProps) {
  const theme = useTheme()
  const items = Children.toArray(children)
  const count = items.length
  // Each item's value by its key, so an item added before the others gets a value of its own and theirs stay theirs
  const ids = items.map((item, index) => (isValidElement(item) && item.key != null ? String(item.key) : String(index)))
  const [store, setStore] = useState(() => new Map(ids.map((id) => [id, new Animated.Value(play && theme.reducedMotion ? 1 : 0)])))
  const missing = ids.some((id) => !store.has(id))
  if (missing || store.size !== new Set(ids).size) {
    // An item added later keeps the others; it comes in on its own while the set plays. An item gone leaves the store
    setStore((old) => {
      const next = new Map<string, Animated.Value>()
      ids.forEach((id) => next.set(id, old.get(id) ?? new Animated.Value(theme.reducedMotion ? 1 : 0)))
      return next
    })
  }
  const values = ids.map((id) => store.get(id))
  const done = useRef(onDone)
  useEffect(() => {
    done.current = onDone
  })
  const sequence = (order ?? []).filter((index, at, all) => index >= 0 && index < count && all.indexOf(index) === at)
  const ranked = [...sequence, ...items.map((_, index) => index).filter((index) => !sequence.includes(index))]
  // The items in the order they come in, by key
  const key = JSON.stringify(ranked.map((index) => ids[index]))

  // The items come in, or under way, since the set was last played, each with a move of its own: an item added or
  // removed while the set plays leaves the others' moves running
  const box = useRef<ComponentRef<typeof View>>(null)
  // Moves this component stops itself; one cut off otherwise (a view's lifecycle replayed in Strict Mode) runs again
  const stopping = useRef(new WeakSet<Animated.CompositeAnimation>())
  const [retry, setRetry] = useState(0)
  const started = useRef(new Set<Animated.Value>())
  const running = useRef(new Map<Animated.Value, Animated.CompositeAnimation>())
  // The items fully in, the items shown now, and whether onDone has been told since the set was last played
  const arrived = useRef(new Set<Animated.Value>())
  const shown = useRef<Animated.Value[]>([])
  const told = useRef(false)
  const tellIfIn = useRef(() => {
    if (told.current || !shown.current.every((value) => arrived.current.has(value))) return
    told.current = true
    done.current?.()
  })

  // Gone (or Strict Mode's replay): the moves stop, and an item stopped short of in comes in again on the next run
  useEffect(() => {
    const moves = running.current
    const begun = started.current
    const ours = stopping.current
    return () => {
      moves.forEach((move, value) => {
        ours.add(move)
        move.stop()
        value.stopAnimation((at) => {
          if (at < 1) begun.delete(value)
        })
      })
      moves.clear()
    }
  }, [])

  useEffect(() => {
    if (missing) return
    const shownValues = (JSON.parse(key) as string[]).map((id) => store.get(id)!)
    shown.current = shownValues
    // The items gone: their moves stop and their marks go
    const kept = new Set(shownValues)
    running.current.forEach((move, value) => {
      if (kept.has(value)) return
      running.current.delete(value)
      stopping.current.add(move)
      move.stop()
    })
    started.current.forEach((value) => {
      if (!kept.has(value)) started.current.delete(value)
    })
    arrived.current.forEach((value) => {
      if (!kept.has(value)) arrived.current.delete(value)
    })
    // Held: the items wait unseen, to come in when played again
    if (!play) {
      running.current.forEach((move) => {
        stopping.current.add(move)
        move.stop()
      })
      running.current.clear()
      started.current.clear()
      arrived.current.clear()
      told.current = false
      store.forEach((value) => value.setValue(0))
      return
    }
    if (theme.reducedMotion) {
      // New items in: onDone is told again
      if (shownValues.some((value) => !arrived.current.has(value))) told.current = false
      shownValues.forEach((value) => {
        value.setValue(1)
        started.current.add(value)
        arrived.current.add(value)
      })
      tellIfIn.current()
      return
    }
    const fresh = shownValues.filter((value) => !started.current.has(value))
    // Nothing new to bring in: an item removed part way leaves the rest all in, which is the end
    if (!fresh.length) {
      tellIfIn.current()
      return
    }
    // New items coming in: onDone is told again once they are in
    told.current = false
    fresh.forEach((value, rank) => {
      started.current.add(value)
      // Without a time of its own, iOS's smooth spring (critically damped, a response of 0.35 s) as the curve it
      // traces: settled in about half a second, and ending when it is drawn at rest
      const move = Animated.sequence([
        Animated.delay(delay + rank * stagger),
        Animated.timing(value, {
          toValue: 1,
          duration: duration ?? 500,
          easing: duration != null ? (easing ?? Easing.out(Easing.cubic)) : SMOOTH,
          useNativeDriver: false,
          isInteraction: false,
        }),
      ])
      running.current.set(value, move)
      move.start(({ finished }) => {
        if (running.current.get(value) === move) running.current.delete(value)
        // Cut off (Strict Mode's replay, the item taken out part way): it comes in again on the next run
        if (!finished) {
          started.current.delete(value)
          if (!stopping.current.has(move)) setRetry((n) => n + 1)
          return
        }
        arrived.current.add(value)
        tellIfIn.current()
      })
    })
    // The timing is read when the items are played, not watched
  }, [play, key, store, missing, theme.reducedMotion, retry]) // eslint-disable-line react-hooks/exhaustive-deps

  // Held unseen, the items are out of the web's Tab order and take no key, as they take no touch
  useEffect(() => {
    if (Platform.OS !== "web") return
    const element = box.current as unknown as HTMLElement | null
    if (element && "inert" in element) element.inert = !play
  }, [play])

  return (
    <View ref={box} testID={testID} style={[gap != null ? { gap } : null, style]}>
      {items.map((item, index) => {
        const value = values[index]
        return (
          <Animated.View
            key={ids[index]}
            // Held unseen, an item takes no touch or click
            pointerEvents={play && value ? "auto" : "none"}
            style={
              value
                ? { opacity: value, transform: [{ translateY: value.interpolate({ inputRange: [0, 1], outputRange: [rise, 0] }) }] }
                : styles.hidden
            }
          >
            {item}
          </Animated.View>
        )
      })}
    </View>
  )
}

/** The smooth spring's position over its settling time: 1 − (1 + ωt)e^(−ωt), ω = 2π / 0.35, normalized to end at 1. */
const OMEGA = (2 * Math.PI) / 0.35
const SETTLE = 0.5
const springAt = (t: number) => 1 - (1 + OMEGA * t) * Math.exp(-OMEGA * t)
const SMOOTH: EasingFunction = (x) => springAt(x * SETTLE) / springAt(SETTLE)

const styles = StyleSheet.create({
  hidden: { opacity: 0 },
})
