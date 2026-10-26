import type { Element } from "hast"

/** Rewrites a URL attribute (`href`, `src`, ...); `null` / `undefined` drop it. */
export type UrlTransform = (url: string, key: string, node: Readonly<Element>) => string | null | undefined

const safeProtocol = /^(https?|ircs?|mailto|xmpp)$/i

/**
 * react-markdown 9.1.0's `defaultUrlTransform`: relative URLs and safe
 * protocols pass, anything else (`javascript:`, `data:`, ...) becomes "".
 */
export const markdownDefaultUrlTransform = (value: string) => {
  // Same as:
  // <https://github.com/micromark/micromark/blob/929275e/packages/micromark-util-sanitize-uri/dev/index.js#L34>
  // But without the `encode` part.
  const colon = value.indexOf(":")
  const questionMark = value.indexOf("?")
  const numberSign = value.indexOf("#")
  const slash = value.indexOf("/")

  if (
    // If there is no protocol, it's relative.
    colon === -1 ||
    // If the first colon is after a `?`, `#`, or `/`, it's not a protocol.
    (slash !== -1 && colon > slash) ||
    (questionMark !== -1 && colon > questionMark) ||
    (numberSign !== -1 && colon > numberSign) ||
    // It is a protocol, it should be allowed.
    safeProtocol.test(value.slice(0, colon))
  ) {
    return value
  }

  return ""
}

/** Vue port of packages/ui/src/components/Markdown/urlTransform.ts: also lets `tel:` and `sms:` through. */
export const defaultUrlTransform = (url: string) => {
  if (url.startsWith("tel:") || url.startsWith("sms:")) {
    return url
  }
  return markdownDefaultUrlTransform(url)
}
