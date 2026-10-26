declare global {
  interface DefaultConfig {
    LinkComponent: "a"
    Breakpoint: "xs" | "sm" | "md" | "lg" | "xl" | "2xl"
  }

  // Augment PlexUIConfig (the name the docs use) or PlexUIOverrides to
  // override DefaultConfig, e.g. `interface PlexUIConfig { LinkComponent: typeof Link }`
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface PlexUIConfig {}
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  interface PlexUIOverrides {}

  // Utility type to merge defaults with overrides. The override keys take precedence.
  type MergeOverrides<Defaults, Overrides> = Omit<Defaults, keyof Overrides> & Overrides

  type Config = MergeOverrides<DefaultConfig, PlexUIConfig & PlexUIOverrides>

  namespace PlexUI {
    export type LinkComponent = Config["LinkComponent"]
    export type Breakpoint = Config["Breakpoint"]
  }
}

export {}
