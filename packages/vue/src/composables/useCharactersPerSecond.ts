import { toValue, watch, type MaybeRefOrGetter } from "vue"

const MIN_TIME_DELTA = 10
const MIN_CHARS_DELTA = 1
const MAX_SAMPLES = 30
const OUTLIER_STD_DEVS = 2

/** Measures streaming speed: returns a getter for the current characters-per-second estimate. */
export function useCharactersPerSecond(
  text: MaybeRefOrGetter<string>,
  streaming: MaybeRefOrGetter<boolean>,
): () => number {
  const samples: number[] = []
  let lastLength = toValue(text).length
  let lastTime = Date.now()

  watch(
    () => [toValue(text), toValue(streaming)] as const,
    ([currentText, isStreaming]) => {
      if (!isStreaming) return

      const now = Date.now()
      const length = currentText.length
      const charsDelta = length - lastLength
      const timeDelta = now - lastTime
      if (charsDelta < MIN_CHARS_DELTA || timeDelta < MIN_TIME_DELTA) return

      const timeDeltaSeconds = timeDelta / 1000
      const cps = charsDelta / timeDeltaSeconds

      samples.push(cps)
      if (samples.length > MAX_SAMPLES) samples.shift()

      lastLength = length
      lastTime = now
    },
    { immediate: true, flush: "post" },
  )

  return () => {
    const currentMean = mean(samples)
    const currentStdDev = standardDeviation(samples, currentMean)

    const filteredSamples = samples.filter((val) => {
      const distance = Math.abs(val - currentMean)
      return distance <= OUTLIER_STD_DEVS * currentStdDev
    })

    return mean(filteredSamples)
  }
}

function mean(values: number[]): number {
  if (!values.length) return 0
  const sum = values.reduce((acc, val) => acc + val, 0)
  return sum / values.length
}

function standardDeviation(values: number[], avg: number): number {
  if (!values.length) return 0
  const variance = values.reduce((acc, val) => acc + (val - avg) ** 2, 0) / values.length
  return Math.sqrt(variance)
}
