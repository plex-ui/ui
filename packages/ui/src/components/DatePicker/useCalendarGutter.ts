import { useWindowSize } from "usehooks-ts"

// Split the space left by seven 44px days across two outer and two inner
// gutters. Calendar.module.css uses the same formula for its content width.
export const useCalendarGutter = (): number => {
  const { width } = useWindowSize({ initializeWithValue: false })
  return width === undefined ? 16 : Math.max(3, Math.min(16, (width - 308) / 4))
}
