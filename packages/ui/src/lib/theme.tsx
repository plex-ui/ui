import { useSyncExternalStore } from "react"

export type DocumentTheme = "light" | "dark"

const subscribeToDocumentTheme = (onChange: () => void) => {
  const observer = new MutationObserver(onChange)

  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ["data-theme", "class"],
    characterData: false,
    childList: false,
    subtree: false,
  })

  return () => observer.disconnect()
}

// The server has no document: it renders "light", and hydration starts from
// it before reading the document's theme
const getServerDocumentTheme = (): DocumentTheme => "light"

export function useDocumentTheme() {
  return useSyncExternalStore(subscribeToDocumentTheme, getDocumentTheme, getServerDocumentTheme)
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
