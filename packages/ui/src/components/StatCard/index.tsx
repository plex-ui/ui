// Backward-compatible alias: StatCard is now StatsCard (packages/ui/src/components/StatsCard), the name of the
// metric cards it follows. The old import keeps working.
import { StatsCard, type StatsCardProps } from "../StatsCard"

/** @deprecated Renamed to `StatsCard`: `import { StatsCard } from "@plexui/ui/components/StatsCard"`. */
export const StatCard: typeof StatsCard = StatsCard
/** @deprecated Renamed to `StatsCardProps`. */
export type StatCardProps = StatsCardProps
