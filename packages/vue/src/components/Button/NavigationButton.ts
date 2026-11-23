import { defineComponent, h, type PropType } from "vue"
import { Button, type ButtonProps } from "./Button.js"
import { NavigationGlyph, type NavigationAction } from "./NavigationGlyph.js"
import s from "@plexui/styles/components/Button/NavigationButton.module.css"

const labels: Record<NavigationAction, string> = { back: "Back", close: "Close", confirm: "Confirm" }

const NavigationButtonComponent = defineComponent({
    name: "NavigationButton",
    inheritAttrs: false,
    props: {
        action: { type: String as PropType<NavigationAction>, required: true },
        /**
         * The text of confirm where it is drawn as a text pill (the Plex Android look's top bar): a short word, one or
         * two at most (Done, Save, Apply). The accessible name stays in `aria-label`, which falls back to it. iOS draws
         * confirm as a check circle and shows no text, nor do back and close.
         * @default "Done"
         */
        label: { type: String, default: undefined },
    },
    setup(props, { attrs }) {
        return () => h(Button, {
            color: props.action === "confirm" ? "primary" : "secondary",
            variant: props.action === "confirm" ? "solid" : "soft",
            mobileMaterial: props.action === "confirm" ? undefined : "glass",
            size: "lg",
            ...attrs,
            "class": [s.NavigationButton, attrs.class],
            uniform: true,
            pill: true,
            "aria-label": typeof attrs["aria-label"] === "string" ? attrs["aria-label"] : props.label ?? labels[props.action],
            "data-navigation-action": props.action,
            // The Plex Android look draws it on confirm's pill (NavigationButton.module.css), never the long accessible name
            "data-navigation-label": props.action === "confirm" ? props.label ?? "Done" : undefined,
        }, () => h(NavigationGlyph, { action: props.action }))
    },
})

export type NavigationButtonProps = Omit<ButtonProps, "children" | "uniform" | "pill" | "iconSize"> & {
    /** Visual role only; the caller owns navigation, dismissal and submission. */
    action: NavigationAction
    /**
     * The text of confirm where it is drawn as a text pill (the Plex Android look's top bar): a short word, one or two
     * at most (Done, Save, Apply). The accessible name stays in `aria-label`, which falls back to it. iOS draws confirm
     * as a check circle and shows no text, nor do back and close.
     * @default "Done"
     */
    label?: string
}

/** Every native/Button prop reaches the same button; refs retain the Button instance's $el. */
export const NavigationButton = NavigationButtonComponent as typeof NavigationButtonComponent & {
    new (): { $props: NavigationButtonProps }
}
