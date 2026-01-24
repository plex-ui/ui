import type { SVGProps } from "react"
const Dot = (props: SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="currentColor" {...props}>
    <path
      d="M12.1001 13.1C12.6524 13.1 13.1001 12.6523 13.1001 12.1C13.1001 11.5477 12.6524 11.1 12.1001 11.1C11.5478 11.1 11.1001 11.5477 11.1001 12.1C11.1001 12.6523 11.5478 13.1 12.1001 13.1Z"
      fill="currentColor"
      stroke="black"
      stroke-width="2"
      stroke-linecap="round"
      stroke-linejoin="round"
    />
  </svg>
)
export default Dot
