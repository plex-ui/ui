import { ChevronLeft, ChevronRight } from "../Icon"
import s from "@plexui/styles/components/DatePicker/CalendarNavigationIcon.module.css"

type CalendarNavigationIconProps = { direction: "previous" | "next" }

// Outlined Figma Compact calendar arrows, nodes 495:46787 and 495:46788.
// Keep the 15x24 text boxes and their ink offsets; no SF Symbols font is needed.
const PREVIOUS_PATH = "M0 8.64258C0 8.47331 0.0292969 8.31706 0.0878906 8.17383C0.152995 8.0306 0.250651 7.89388 0.380859 7.76367L7.98828 0.322266C8.20964 0.107422 8.47656 0 8.78906 0C9.00391 0 9.19596 0.0520833 9.36523 0.15625C9.54102 0.253906 9.68099 0.38737 9.78516 0.556641C9.88932 0.725911 9.94141 0.917969 9.94141 1.13281C9.94141 1.4388 9.82096 1.71224 9.58008 1.95312L2.72461 8.64258L9.58008 15.332C9.82096 15.5729 9.94141 15.8496 9.94141 16.1621C9.94141 16.3704 9.88932 16.5592 9.78516 16.7285C9.68099 16.9043 9.54102 17.041 9.36523 17.1387C9.19596 17.2428 9.00391 17.2949 8.78906 17.2949C8.47656 17.2949 8.20964 17.1842 7.98828 16.9629L0.380859 9.52148C0.250651 9.39128 0.152995 9.25456 0.0878906 9.11133C0.0292969 8.9681 0 8.81185 0 8.64258Z"
const NEXT_PATH = "M9.94141 8.64258C9.94141 8.81185 9.90885 8.9681 9.84375 9.11133C9.77865 9.25456 9.68099 9.39128 9.55078 9.52148L1.94336 16.9629C1.72852 17.1842 1.46159 17.2949 1.14258 17.2949C0.934245 17.2949 0.742188 17.2428 0.566406 17.1387C0.390625 17.041 0.250651 16.9043 0.146484 16.7285C0.0488281 16.5592 0 16.3704 0 16.1621C0 15.8496 0.117188 15.5729 0.351562 15.332L7.20703 8.64258L0.351562 1.95312C0.117188 1.71224 0 1.4388 0 1.13281C0 0.917969 0.0488281 0.725911 0.146484 0.556641C0.250651 0.38737 0.390625 0.253906 0.566406 0.15625C0.742188 0.0520833 0.934245 0 1.14258 0C1.46159 0 1.72852 0.107422 1.94336 0.322266L9.55078 7.76367C9.68099 7.89388 9.77865 8.0306 9.84375 8.17383C9.90885 8.31706 9.94141 8.47331 9.94141 8.64258Z"

export const CalendarNavigationIcon = ({ direction }: CalendarNavigationIconProps) => {
  const previous = direction === "previous"
  const DesktopIcon = previous ? ChevronLeft : ChevronRight

  return (
    <>
      <DesktopIcon className={s.DesktopIcon} data-no-autosize="" />
      <svg
        className={s.PhoneIcon}
        data-direction={direction}
        data-no-autosize=""
        width="15"
        height="24"
        viewBox="0 0 15 24"
        fill="currentColor"
        aria-hidden="true"
      >
        <path
          d={previous ? PREVIOUS_PATH : NEXT_PATH}
          transform={`translate(${previous ? 1.25 : 3.818359375} 3.306640625)`}
        />
      </svg>
    </>
  )
}
