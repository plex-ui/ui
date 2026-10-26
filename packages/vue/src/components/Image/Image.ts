import { defineComponent, h, onMounted, ref } from "vue"
import s from "@plexui/styles/components/Image/Image.module.css"

const loadedSrcs = new Set<string>()

/**
 * Port of packages/ui/src/components/Image/Image.tsx: hidden until loaded
 * (`data-loaded`), removed when loading fails.
 */
export const Image = defineComponent({
  name: "Image",
  inheritAttrs: false,
  props: {
    src: String,
    draggable: { type: Boolean, default: false },
    /** Force the image tag to be placed in the DOM even if load failed (resulting in broken image display) */
    forceRenderAfterLoadFail: { type: Boolean, default: false },
  },
  emits: {
    load: (_event: Event) => true,
    error: (_event: Event) => true,
  },
  setup(props, { attrs, emit }) {
    // Track load/fail per src so a new src starts fresh after an error
    const loadedSrc = ref<string>()
    const failedSrc = ref<string>()
    const img = ref<HTMLImageElement | null>(null)

    // An image that loaded before hydration fired its load event before Vue
    // listened for it: read the element instead, as React does
    onMounted(() => {
      const { src } = props
      if (img.value && src && img.value.complete && img.value.naturalWidth > 0) {
        loadedSrc.value = src
        loadedSrcs.add(src)
      }
    })

    return () => {
      const { src } = props
      const loaded = !!src && (loadedSrc.value === src || loadedSrcs.has(src))
      const failed = !!src && failedSrc.value === src
      const considerLoaded = loaded || (failed && props.forceRenderAfterLoadFail)

      if (!src || (!props.forceRenderAfterLoadFail && failed)) {
        return null
      }

      return h("img", {
        ...attrs,
        "ref": img,
        "src": src,
        "class": [s.Image, attrs.class],
        "onLoad": (event: Event) => {
          loadedSrc.value = src
          loadedSrcs.add(src)
          emit("load", event)
        },
        "onError": (event: Event) => {
          failedSrc.value = src
          emit("error", event)
        },
        "data-loaded": considerLoaded ? "" : undefined,
        "draggable": props.draggable,
      })
    }
  },
})
