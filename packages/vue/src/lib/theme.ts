import { onBeforeUnmount, onMounted, ref, type Ref } from "vue"

export type DocumentTheme = "light" | "dark"

/**
 * Vue counterpart of React's `useDocumentTheme`: tracks `data-theme` / `.dark` on <html>.
 * It is "light" during setup (the server has no document, and hydration must
 * match it) and reads the document's theme on mount.
 */
export function useDocumentTheme(): Ref<DocumentTheme> {
  const theme = ref<DocumentTheme>("light")
  let observer: MutationObserver | undefined

  onMounted(() => {
    theme.value = getDocumentTheme()
    observer = new MutationObserver(() => {
      theme.value = getDocumentTheme()
    })

    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
      characterData: false,
      childList: false,
      subtree: false,
    })
  })

  onBeforeUnmount(() => observer?.disconnect())

  return theme
}

export function getDocumentTheme() {
  const theme = document.documentElement.getAttribute("data-theme")

  if (theme === "dark" || theme === "light") {
    return theme
  }

  const darkMode = document.documentElement.classList.contains("dark")

  return darkMode ? "dark" : "light"
}

export function applyDocumentTheme(theme: "light" | "dark") {
  const htmlTag = document.documentElement
  htmlTag.setAttribute("data-theme", theme)
  htmlTag.style.colorScheme = theme
}
