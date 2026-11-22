import type { ComponentType } from "react"
import { Platform, type ViewProps } from "react-native"

/*
 * expo-blur and expo-glass-effect are optional peers: an app without them gets flat fills where iOS draws glass.
 * Metro treats a require inside try/catch as an optional dependency.
 */
declare const require: (name: string) => unknown

type BlurViewProps = ViewProps & { intensity?: number; tint?: string }
type GlassViewProps = ViewProps & {
  glassEffectStyle?: "regular" | "clear" | "none"
  tintColor?: string
  isInteractive?: boolean
  colorScheme?: "auto" | "light" | "dark"
}

type BlurModule = { BlurView: ComponentType<BlurViewProps> }
type GlassModule = { GlassView: ComponentType<GlassViewProps>; isLiquidGlassAvailable: () => boolean }

let blur: BlurModule | null | undefined
let glass: GlassModule | null | undefined

export function blurModule() {
  if (blur === undefined) {
    try {
      blur = require("expo-blur") as BlurModule
    } catch {
      blur = null
    }
  }
  return blur
}

/** expo-glass-effect, only where it draws native Liquid Glass (iOS 26 and later). */
export function liquidGlassModule() {
  if (glass === undefined) {
    let found: GlassModule | null = null
    if (Platform.OS === "ios") {
      try {
        const module = require("expo-glass-effect") as GlassModule
        if (module.isLiquidGlassAvailable()) found = module
      } catch {
        found = null
      }
    }
    glass = found
  }
  return glass
}
