export type ClipboardContent = {
  "text/plain"?: string
  "image/png"?: Blob
  "image/jpeg"?: Blob
  "image/webp"?: Blob
}

const supportsRichClipboard = (): boolean =>
  typeof ClipboardItem !== "undefined" && !!navigator.clipboard?.write

// Convert ClipboardContent to { [mime]: Blob } for ClipboardItem
export function toClipboardItem(content: ClipboardContent): ClipboardItem {
  const { "text/plain": text, ...rest } = content
  return new ClipboardItem({
    ...rest,
    ...(text ? { "text/plain": new Blob([text], { type: "text/plain" }) } : null),
  })
}

/**
 * Utility for copying rich content in a cross-browser way
 *
 * @param {string | ClipboardContent} content
 * @param {HTMLElement} container - Fallback text copy method requires appending a textarea
 *   to the DOM and focusing it. If you don't want to shift focus out of the currently
 *   focused container (e.g. a popover) you can specify a custom container to append
 *   the textarea to keep focus in that container. This need for this edge case is
 *   exceedingly rare as navigator.clipboard.writeText support expands.
 * @returns - A promise that resolves to true if the copy was successful, false otherwise.
 */
export async function copyToClipboard(
  content: string | ClipboardContent,
  container: HTMLElement = document.body,
): Promise<boolean> {
  if (typeof content === "string") {
    return copyText(content, container)
  }

  try {
    if (supportsRichClipboard()) {
      await navigator.clipboard.write([toClipboardItem(content)])
      return true
    }

    // Fallback: if we have plain text, at least copy that.
    if (content["text/plain"]) {
      return copyText(content["text/plain"], container)
    }

    return false
  } catch {
    return false
  }
}

/**
 * Utility for copying plaintext in a cross-browser way
 *
 * @param {string} text
 * @param {HTMLElement} container - Fallback text copy method requires appending a textarea
 *   to the DOM and focusing it. If you don't want to shift focus out of the currently
 *   focused container (e.g. a popover) you can specify a custom container to append
 *   the textarea to keep focus in that container. This need for this edge case is
 *   exceedingly rare as navigator.clipboard.writeText support expands.
 * @returns - A promise that resolves to true if the copy was successful, false otherwise.
 */
export async function copyText(
  text: string,
  container: HTMLElement = document.body,
): Promise<boolean> {
  if (navigator.clipboard) {
    try {
      // Try to use the navigator.clipboard method first
      await navigator.clipboard.writeText(text)
      return true
    } catch {
      // If that doesn't work, we continue on to the fallback
      // method below
    }
  }

  // Fallback method
  const ownerDocument = container.ownerDocument
  const previousFocus = ownerDocument.activeElement
  const textArea = ownerDocument.createElement("textarea")
  textArea.value = text
  textArea.setAttribute("data-plex-clipboard-fallback", "")

  // Avoid visibility/interaction
  textArea.style.position = "fixed"
  textArea.style.top = "0"
  textArea.style.left = "0"
  textArea.style.opacity = "0"

  container.appendChild(textArea)
  textArea.focus({ preventScroll: true })
  textArea.select()

  let succeeded = false
  try {
    succeeded = ownerDocument.execCommand("copy")
  } catch {
    // Ignore
  }
  const restoreFocus = ownerDocument.activeElement === textArea
  textArea.remove()
  // execCommand can synchronously move focus (for example, through a copy
  // handler). Restore only while the temporary textarea still owns it.
  if (restoreFocus && previousFocus?.isConnected && "focus" in previousFocus && typeof previousFocus.focus === "function") {
    previousFocus.focus({ preventScroll: true })
  }
  return succeeded
}
