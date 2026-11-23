"use client"

import clsx from "clsx"
import { Button, type ButtonProps } from "./Button"
import { NavigationGlyph, type NavigationAction } from "./NavigationGlyph"
import s from "@plexui/styles/components/Button/NavigationButton.module.css"

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

const labels: Record<NavigationAction, string> = { back: "Back", close: "Close", confirm: "Confirm" }

/** A semantic Button with a shared toolbar target and a role-specific glyph. */
export const NavigationButton = ({
    action,
    label,
    color = action === "confirm" ? "primary" : "secondary",
    variant = action === "confirm" ? "solid" : "soft",
    mobileMaterial = action === "confirm" ? undefined : "glass",
    size = "lg",
    className,
    ...props
}: NavigationButtonProps) => (
    <Button
        {...props}
        color={color}
        variant={variant}
        mobileMaterial={mobileMaterial}
        size={size}
        className={clsx(s.NavigationButton, className)}
        uniform
        pill
        aria-label={props["aria-label"] ?? label ?? labels[action]}
        data-navigation-action={action}
        // The Plex Android look draws it on confirm's pill (NavigationButton.module.css), never the long accessible name
        data-navigation-label={action === "confirm" ? label ?? "Done" : undefined}
    >
        <NavigationGlyph action={action} />
    </Button>
)
