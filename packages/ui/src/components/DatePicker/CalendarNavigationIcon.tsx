import { ChevronLeft, ChevronLeftLg, ChevronRight, ChevronRightLg } from "../Icon"
import s from "@plexui/styles/components/DatePicker/CalendarNavigationIcon.module.css"

type CalendarNavigationIconProps = { direction: "previous" | "next" }

// On a phone the arrows keep the 15x24 boxes of the iOS month arrows and the centres of their ink (6.2 and 8.8
// from the leading edge, 12 from the top), drawn with the large Plex UI chevrons: Apple's symbols may not ship on
// the web. Each 24px chevron is cut to its box by the viewBox.
const PHONE_VIEW_BOX = { previous: "5.28 0 15 24", next: "3.71 0 15 24" }

export const CalendarNavigationIcon = ({ direction }: CalendarNavigationIconProps) => {
  const previous = direction === "previous"
  const DesktopIcon = previous ? ChevronLeft : ChevronRight
  const PhoneIcon = previous ? ChevronLeftLg : ChevronRightLg

  return (
    <>
      <DesktopIcon className={s.DesktopIcon} data-no-autosize="" />
      <PhoneIcon
        className={s.PhoneIcon}
        data-direction={direction}
        data-no-autosize=""
        width="15"
        height="24"
        viewBox={PHONE_VIEW_BOX[direction]}
      />
    </>
  )
}
