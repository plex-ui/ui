"use client"

import clsx from "clsx"
import { Button, type ButtonProps } from "./Button"
import { NavigationGlyph, type NavigationAction } from "./NavigationGlyph"
import s from "@plexui/styles/components/Button/NavigationButton.module.css"

export type NavigationButtonProps = Omit<ButtonProps, "children" | "uniform" | "pill" | "iconSize"> & {
    /** Visual role only; the caller owns navigation, dismissal and submission. */
    action: NavigationAction
}

const labels: Record<NavigationAction, string> = { back: "Back", close: "Close", confirm: "Confirm" }

/** A semantic Button with a shared toolbar target and a role-specific glyph. */
export const NavigationButton = ({
    action,
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
        aria-label={props["aria-label"] ?? labels[action]}
        data-navigation-action={action}
    >
        <NavigationGlyph action={action} />
    </Button>
)
