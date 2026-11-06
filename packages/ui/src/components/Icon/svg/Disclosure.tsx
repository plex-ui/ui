import type { SVGProps } from "react"

const Disclosure = (props: SVGProps<SVGSVGElement>) => (
  <svg width="20" height="20" viewBox="0 0 20 20" fill="none" aria-hidden="true" {...props}>
    <path
      d="M6.91074 4.41074C7.23618 4.08531 7.76382 4.08531 8.08926 4.41074L13.0893 9.41074C13.4147 9.73618 13.4147 10.2638 13.0893 10.5893L8.08926 15.5893C7.76382 15.9147 7.23618 15.9147 6.91074 15.5893C6.58531 15.2638 6.58531 14.7362 6.91074 14.4107L11.3215 10L6.91074 5.58926C6.58531 5.26382 6.58531 4.73618 6.91074 4.41074Z"
      fill="currentColor"
      fillRule="evenodd"
      clipRule="evenodd"
    />
  </svg>
)

Disclosure.displayName = "Disclosure"
export default Disclosure
