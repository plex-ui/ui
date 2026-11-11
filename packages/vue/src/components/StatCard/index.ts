// Backward-compatible alias: StatCard is now StatsCard, as in packages/ui/src/components/StatCard.
import {
  StatsCard,
  type StatsCardAccentColor,
  type StatsCardProps,
  type StatsCardTrend,
} from "../StatsCard/index.js"

/** @deprecated Renamed to `StatsCard`: `import { StatsCard } from "@plexui/vue/components/StatsCard"`. */
export const StatCard: typeof StatsCard = StatsCard
/** @deprecated Renamed to `StatsCardAccentColor`. */
export type StatCardAccentColor = StatsCardAccentColor
/** @deprecated Renamed to `StatsCardProps`. */
export type StatCardProps = StatsCardProps
/** @deprecated Renamed to `StatsCardTrend`. */
export type StatCardTrend = StatsCardTrend
