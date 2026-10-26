import type { PluggableList } from "unified"
import { computed, onMounted, ref, watch } from "vue"

// Vue port of packages/ui/src/components/Markdown/useMathPlugins.tsx.
// remark-math and rehype-katex load lazily, once per page, on the client
// (after mount, like React's effect): a Markdown first renders without math,
// then again with it. Later mounts render math right away.

type MathPlugins = {
  remarkPlugins: PluggableList
  rehypePlugins: PluggableList
}

const DEFAULT_EMPTY_STATE: MathPlugins = { remarkPlugins: [], rehypePlugins: [] }
let resolvedPluginsCache: MathPlugins | null = null

let pluginLoadPromise: Promise<MathPlugins> | null = null

async function loadMathDeps(): Promise<MathPlugins> {
  if (resolvedPluginsCache) return resolvedPluginsCache
  if (pluginLoadPromise) return pluginLoadPromise

  pluginLoadPromise = (async () => {
    const [{ default: remarkMath }, { default: rehypeKatex }] = await Promise.all([
      import("remark-math"),
      import("rehype-katex"),
    ])

    resolvedPluginsCache = {
      remarkPlugins: [[remarkMath, { singleDollarTextMath: false }]],
      rehypePlugins: [rehypeKatex],
    }
    return resolvedPluginsCache
  })()

  try {
    const plugins = await pluginLoadPromise
    return plugins
  } catch (err) {
    // Reset so a later attempt can retry
    pluginLoadPromise = null
    throw err
  }
}

export function useMathPlugins(enabled: () => boolean) {
  const ready = ref<boolean>(!!resolvedPluginsCache)

  // Client only, like useEffect: SSR renders without math
  onMounted(() => {
    watch(
      [enabled, ready],
      ([isEnabled, isReady], _previous, onCleanup) => {
        if (!isEnabled || isReady) {
          return
        }

        let alive = true
        loadMathDeps()
          .then(() => {
            if (alive) {
              // Re-render once we have the updated plugins
              ready.value = true
            }
          })
          .catch(() => {})

        onCleanup(() => {
          alive = false
        })
      },
      { immediate: true },
    )
  })

  return computed(() => (ready.value && enabled() && !!resolvedPluginsCache ? resolvedPluginsCache : DEFAULT_EMPTY_STATE))
}
