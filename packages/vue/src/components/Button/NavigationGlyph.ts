import { defineComponent, h, type PropType } from "vue"
import ChevronLeft from "../Icon/svg/ChevronLeftMd.js"
import Check from "../Icon/svg/CheckMd.js"
import s from "@plexui/styles/components/Button/NavigationButton.module.css"

export type NavigationAction = "back" | "close" | "confirm"

/** Mirrors React's NavigationGlyph, including the standard Dialog close path. */
export const NavigationGlyph = defineComponent({
    name: "NavigationGlyph",
    props: { action: { type: String as PropType<NavigationAction>, required: true } },
    setup(props) {
        return () => {
            const attributes = {
                "class": s.NavigationGlyph,
                "aria-hidden": true,
                "data-navigation-glyph": props.action,
                "data-no-autosize": "",
            }
            if (props.action === "back") return h(ChevronLeft, attributes)
            if (props.action === "confirm") return h(Check, attributes)
            return h("svg", { ...attributes, viewBox: "0 0 20 20", width: "20", height: "20" }, [
                h("path", { fill: "currentColor", d: "M5.16 5.16a.62.62 0 0 1 .88 0L10 9.12l3.96-3.96a.62.62 0 1 1 .88.88L10.88 10l3.96 3.96a.62.62 0 1 1-.88.88L10 10.88l-3.96 3.96a.62.62 0 1 1-.88-.88L9.12 10 5.16 6.04a.62.62 0 0 1 0-.88" }),
            ])
        }
    },
})
