import { defineComponent, h, ref } from "vue"
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
    const loaded = ref(!!props.src && loadedSrcs.has(props.src))
    const failed = ref(false)

    return () => {
      const { src } = props
      const considerLoaded = loaded.value || (failed.value && props.forceRenderAfterLoadFail)

      if (!src || (!props.forceRenderAfterLoadFail && failed.value)) {
        return null
      }

      return h("img", {
        ...attrs,
        "src": src,
        "class": [s.Image, attrs.class],
        "onLoad": (event: Event) => {
          loaded.value = true
          loadedSrcs.add(src)
          emit("load", event)
        },
        "onError": (event: Event) => {
          failed.value = true
          emit("error", event)
        },
        "data-loaded": considerLoaded ? "" : undefined,
        "draggable": props.draggable,
      })
    }
  },
})
