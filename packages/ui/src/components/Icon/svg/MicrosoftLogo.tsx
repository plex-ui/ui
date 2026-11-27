import type { SVGProps } from "react"
// Microsoft's four-square logo for Sign in with Microsoft buttons; keeps its brand colors
const MicrosoftLogo = (props: SVGProps<SVGSVGElement>) => (
  <svg width="1em" height="1em" viewBox="0 0 24 24" fill="none" aria-hidden="true" focusable="false" {...props}>
    <path d="M3.25 3.25H11.25V11.25H3.25V3.25Z" fill="#F35325" />
    <path d="M12.75 3.25H20.75V11.25H12.75V3.25Z" fill="#81BC06" />
    <path d="M3.25 12.75H11.25V20.75H3.25V12.75Z" fill="#05A6F0" />
    <path d="M12.75 12.75H20.75V20.75H12.75V12.75Z" fill="#FFBA08" />
  </svg>
)
MicrosoftLogo.displayName = "MicrosoftLogo"
export default MicrosoftLogo
