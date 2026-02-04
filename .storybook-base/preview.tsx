// Controls are not working without this - if removing, ensure controls in stories update the component
"use no memo"
import type { Preview } from "@storybook/react"
// Storybook overrides
import { getThemeStore } from "./addon-theme/themeStore"
import { CustomDocsContainer, WithPlexUIContext, WithTheme } from "./components/StorybookApp"
import "./overrides.css"

const preview: Preview = {
  tags: ["!dev"],
  parameters: {
    options: {
      storySort: {
        order: [
          "Overview",
          ["Introduction", "*"],
          "Concepts",
          "Foundations",
          "Components",
          [
            "Alert",
            "Avatar",
            "Avatar Group",
            "Badge",
            "Button",
            "Button Link",
            "Checkbox",
            "Code Block",
            "Copy Tooltip",
            "Date Picker",
            "Date Range Picker",
            "Empty Message",
            "Field Error",
            "Floating Input",
            "Indicators",
            "Input",
            "Markdown",
            "Menu",
            "Popover",
            "Radio Group",
            "Segmented Control",
            "Select",
            "Select Control",
            "Slider",
            "Switch",
            "Tag Input",
            "Text Link",
            "Textarea",
            "Tooltip",
            "*",
          ],
          "Transitions",
        ],
      },
    },
    controls: {
      matchers: {
        color: /(background|color)$/i,
        date: /Date$/i,
      },
      expanded: true,
      disableSaveFromUI: true,
    },
    layout: "centered",
    docs: {
      container: CustomDocsContainer,
      canvas: {
        sourceState: "shown",
      },
      // https://storybook.js.org/docs/writing-docs/autodocs#configure-the-table-of-contents
      toc: {
        contentsSelector: ".sbdocs-content",
        headingSelector: "h2, h3",
        ignoreSelector: ".sbdocs-subtitle, .sbdocs-preview h2, .sbdocs-preview h3",
        title: "",
        disable: false,
      },
      source: {
        language: "tsx",
      },
    },
  },
  decorators: [WithTheme, WithPlexUIContext],
  // IMPORTANT: Declare initial `theme` global so that updates propagate correctly
  initialGlobals: {
    theme: getThemeStore(),
  },
}

export default preview
