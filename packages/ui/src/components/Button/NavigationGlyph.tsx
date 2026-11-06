import type { SVGProps } from "react"
import ChevronLeft from "../Icon/svg/ChevronLeftMd"
import Check from "../Icon/svg/CheckMd"
import s from "@plexui/styles/components/Button/NavigationButton.module.css"

export type NavigationAction = "back" | "close" | "confirm"

type NavigationGlyphProps = { action: NavigationAction }

/** Shared by NavigationButton and the standard Dialog close action. */
export const NavigationGlyph = ({ action }: NavigationGlyphProps) => {
    const attributes: SVGProps<SVGSVGElement> & { "data-navigation-glyph": NavigationAction; "data-no-autosize": string } = {
        className: s.NavigationGlyph,
        "aria-hidden": true,
        "data-navigation-glyph": action,
        "data-no-autosize": "",
    }
    if (action === "back") return <ChevronLeft {...attributes} />
    if (action === "confirm") return <Check {...attributes} />
    return (
        <svg {...attributes} viewBox="0 0 20 20" width="20" height="20">
            <path fill="currentColor" d="M5.16 5.16a.62.62 0 0 1 .88 0L10 9.12l3.96-3.96a.62.62 0 1 1 .88.88L10.88 10l3.96 3.96a.62.62 0 1 1-.88.88L10 10.88l-3.96 3.96a.62.62 0 1 1-.88-.88L9.12 10 5.16 6.04a.62.62 0 0 1 0-.88" />
        </svg>
    )
}
