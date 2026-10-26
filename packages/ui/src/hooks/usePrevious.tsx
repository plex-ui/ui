import { useEffect, useRef } from "react"

// The value before the latest change of `value`; renders that keep `value`
// return the same previous value
export function usePrevious<T>(value: T): T {
  const ref = useRef({ value, previous: value })

  useEffect(() => {
    if (!Object.is(ref.current.value, value)) {
      ref.current = { value, previous: ref.current.value }
    }
  }, [value])

  return Object.is(ref.current.value, value) ? ref.current.previous : ref.current.value
}
