import { cloneElement, createContext, isValidElement, useContext, useMemo, useState, type ReactElement, type ReactNode } from "react"
import { Animated, Platform, StyleSheet, View, type LayoutChangeEvent, type StyleProp, type ViewStyle } from "react-native"
import CheckMd from "../../icons/plex/CheckMd"
import { flattenChildren, textOf } from "../../internal/children"
import { cssEasing, useColorTransition } from "../../internal/transition"
import { useTheme } from "../../theme/ThemeProvider"
import type { Theme } from "../../theme/types"
import { IconDefaultsProvider } from "../Icon"
import { Text } from "../Text/Text"

type Orientation = "horizontal" | "vertical"
type StepState = "completed" | "active" | "inactive"
type ConnectorStyle = "solid" | "dashed"
type Variant = "default" | "minimal"
type Color = "default" | "success"
export type ProgressStepsSize = "sm" | "md" | "lg"

export type ProgressStepsProps = {
  /** Current active step (1-indexed, starts from 1) */
  current: number
  /** Total number of steps (required for the minimal variant) */
  total?: number
  /** @default "default" */
  variant?: Variant
  /** The color of completed and active steps. @default "default" */
  color?: Color
  /** @default "horizontal" */
  orientation?: Orientation
  /** The size of the step indicators. @default "md" */
  size?: ProgressStepsSize
  /** @default "solid" */
  connectorStyle?: ConnectorStyle
  testID?: string
  style?: StyleProp<ViewStyle>
  children?: ReactNode
}

export type StepProps = {
  /** A custom icon instead of the step's number */
  icon?: ReactNode
  /** The step's content: a Title and/or a Description */
  children?: ReactNode
}

export type StepTitleProps = {
  children: ReactNode
  /**
   * Hides the title from view and keeps it for screen readers, for steps that show their indicators alone: an icon
   * or a check has no name. The step then takes no room under its indicator.
   * @default false
   */
  visuallyHidden?: boolean
}

export type StepDescriptionProps = { children: ReactNode }

type Metrics = { indicator: number; rowGap: number; contentGap: number; font: number; icon: number; line: number }

type Colors = {
  indicator: Record<StepState, string>
  indicatorText: Record<StepState, string>
  connector: string
  connectorCompleted: string
  title: string
  titleInactive: string
  description: string
  descriptionInactive: string
  minimalUpcoming: string
  minimalCompleted: string
}

type Context = {
  current: number
  orientation: Orientation
  connectorStyle: ConnectorStyle
  total: number
  metrics: Metrics
  colors: Colors
  connectorWidth: number
  dash: number
  gap: number
  motion: { duration: number; easing: ReturnType<typeof cssEasing>; reducedMotion: boolean }
}

const StepsContext = createContext<Context | null>(null)
const StepContext = createContext<{ state: StepState; first: ReactNode } | null>(null)

const useSteps = () => {
  const context = useContext(StepsContext)
  if (!context) throw new Error("ProgressSteps components must be wrapped in <ProgressSteps />")
  return context
}

const metricsOf = (theme: Theme, size: ProgressStepsSize): Metrics => ({
  indicator: theme.length(`--progress-steps-indicator-size-${size}`, { sm: 24, md: 32, lg: 40 }[size]),
  rowGap: theme.length(`--progress-steps-row-gap-${size}`, { sm: 16, md: 24, lg: 32 }[size]),
  contentGap: theme.length(`--progress-steps-content-gap-${size}`, { sm: 10, md: 12, lg: 16 }[size]),
  font: theme.length(`--progress-steps-font-size-${size}`, { sm: 12, md: 14, lg: 16 }[size]),
  icon: theme.length(`--progress-steps-icon-size-${size}`, { sm: 14, md: 16, lg: 18 }[size]),
  line: theme.length("--font-text-sm-line-height", 20),
})

/**
 * The colors of the steps. iOS: the tokens (the ink for completed and active steps, `--gray-100` ahead). Android: the
 * Plex Android look's accent for completed and active steps on `surfaceContainerHighest`, as Material draws a filled
 * selection. `color="success"` takes the solid success colors on both.
 */
function colorsOf(theme: Theme, color: Color): Colors {
  const m = theme.material
  const success = color === "success"
  const successFill = theme.color("--color-background-success-solid")
  const successText = theme.color("--color-text-success-solid", "#FFFFFF")
  if (theme.isAndroid) {
    const fill = success ? successFill : m.primary
    const onFill = success ? successText : m.onPrimary
    return {
      indicator: { completed: fill, active: fill, inactive: m.surfaceContainerHighest },
      indicatorText: { completed: onFill, active: onFill, inactive: m.onSurfaceVariant },
      connector: m.surfaceContainerHighest,
      connectorCompleted: fill,
      title: m.onSurface,
      titleInactive: m.onSurfaceVariant,
      description: m.onSurfaceVariant,
      descriptionInactive: m.onSurfaceVariant,
      minimalUpcoming: m.surfaceContainerHighest,
      minimalCompleted: fill,
    }
  }
  return {
    indicator: {
      completed: success ? successFill : theme.color("--progress-steps-indicator-background-completed"),
      active: success ? successFill : theme.color("--progress-steps-indicator-background-active"),
      inactive: theme.color("--progress-steps-indicator-background"),
    },
    indicatorText: {
      completed: success ? successText : theme.color("--progress-steps-indicator-text-completed"),
      active: success ? successText : theme.color("--progress-steps-indicator-text-active"),
      inactive: theme.color("--progress-steps-indicator-text"),
    },
    connector: theme.color("--progress-steps-connector-color"),
    connectorCompleted: success ? successFill : theme.color("--progress-steps-connector-color-completed"),
    title: theme.color("--progress-steps-title-color", theme.colors.text),
    titleInactive: theme.color("--progress-steps-title-color-inactive"),
    description: theme.color("--progress-steps-description-color"),
    descriptionInactive: theme.color("--progress-steps-description-color-inactive"),
    minimalUpcoming: theme.color("--progress-steps-minimal-color-upcoming"),
    minimalCompleted: success ? successFill : theme.color("--progress-steps-minimal-color-completed"),
  }
}

const web = Platform.OS === "web"

/**
 * The steps of a multi-step flow, such as a checkout or onboarding, and the current one, as @plexui/ui's
 * ProgressSteps: a numbered indicator per step (a check once completed), the connectors between them and each step's
 * title and description, in a row or a column; or, with `variant="minimal"`, a bar of short segments. Neither
 * platform has a control of its own, so both draw the Plex steps: iOS in the tokens (indicators 24, 32, 40; the ink
 * for completed and active steps), Android in the Plex Android look's accent. A change of step fades the colors in
 * `--transition-duration-basic` (120ms, ease), at once with reduced motion.
 */
export function ProgressSteps({
  current,
  total,
  variant = "default",
  color = "default",
  orientation = "horizontal",
  size = "md",
  connectorStyle = "solid",
  testID,
  style,
  children,
}: ProgressStepsProps) {
  const theme = useTheme()
  const steps = flattenChildren(children).filter(isValidElement)
  const minimal = variant === "minimal"
  const count = minimal ? Math.max(0, total ?? 0) : steps.length
  const motion = useMemo(
    () => ({
      duration: theme.duration("--transition-duration-basic", 120),
      easing: cssEasing(theme.token("--transition-ease-basic")),
      reducedMotion: theme.reducedMotion,
    }),
    [theme],
  )
  const colors = colorsOf(theme, color)

  if (minimal) {
    const key = size === "lg" ? "lg" : size === "sm" ? "sm" : "md"
    const width = theme.length(`--progress-steps-minimal-width-${key}`, key === "lg" ? 32 : 24)
    const height = theme.length(`--progress-steps-minimal-height-${key}`, key === "lg" ? 4 : 3)
    const gap = theme.length(`--progress-steps-minimal-gap-${key}`, key === "lg" ? 6 : 4)
    return (
      <View
        accessible
        accessibilityRole="progressbar"
        accessibilityLabel="Progress"
        accessibilityValue={{ min: 1, max: count, now: current }}
        {...(web ? { "aria-valuemin": 1, "aria-valuemax": count, "aria-valuenow": current } : null)}
        testID={testID}
        style={[styles.minimal, { gap }, style]}
      >
        {Array.from({ length: count }, (_, index) => (
          <MinimalSegment
            key={index}
            color={index < current ? colors.minimalCompleted : colors.minimalUpcoming}
            width={width}
            height={height}
            radius={theme.length("--progress-steps-minimal-radius", 9999)}
            motion={motion}
          />
        ))}
      </View>
    )
  }

  const context: Context = {
    current,
    orientation,
    connectorStyle,
    total: count,
    metrics: metricsOf(theme, size),
    colors,
    connectorWidth: theme.length("--progress-steps-connector-width", 2),
    dash: theme.length("--progress-steps-connector-dash-length", 4),
    gap: theme.length("--progress-steps-connector-dash-gap", 4),
    motion,
  }
  const horizontal = orientation === "horizontal"
  return (
    <StepsContext.Provider value={context}>
      <View
        {...(web ? { role: "navigation", "aria-label": "Progress" } : null)}
        testID={testID}
        style={[styles.root, style]}
      >
        <View
          accessibilityRole="list"
          style={horizontal ? [styles.row, { gap: context.metrics.rowGap }] : styles.column}
        >
          {steps.map((step, index) => cloneElement(step as ReactElement<{ _index?: number }>, { _index: index }))}
        </View>
      </View>
    </StepsContext.Provider>
  )
}

function MinimalSegment({ color, width, height, radius, motion }: { color: string; width: number; height: number; radius: number; motion: Context["motion"] }) {
  const backgroundColor = useColorTransition(color, motion)
  return <Animated.View style={{ width, height, borderRadius: Math.min(radius, height / 2), backgroundColor }} />
}

/** A step: its indicator, the connector to the next step, and its title and description. */
function Step({ icon, children, _index = 0 }: StepProps & { _index?: number }) {
  const context = useSteps()
  const { current, orientation, total, metrics, colors, motion } = context
  const state: StepState = _index < current - 1 ? "completed" : _index === current - 1 ? "active" : "inactive"
  const horizontal = orientation === "horizontal"
  const [width, setWidth] = useState(0)
  const onLayout = horizontal ? (event: LayoutChangeEvent) => setWidth(event.nativeEvent.layout.width) : undefined
  const background = useColorTransition(colors.indicator[state], motion)
  const ink = colors.indicatorText[state]

  const parts = flattenChildren(children)
  const shown = parts.filter((part) => !(isValidElement(part) && part.type === Title && (part.props as StepTitleProps).visuallyHidden))
  const name = parts.map(textOf).filter(Boolean).join(", ")
  const last = _index === total - 1

  return (
    <View
      // On a phone a step is read as one: its title and description; the current one as selected
      accessible={!web}
      accessibilityLabel={web ? undefined : name || String(_index + 1)}
      accessibilityState={web ? undefined : { selected: state === "active" }}
      {...(web ? { role: "listitem", "aria-current": state === "active" ? "step" : undefined } : null)}
      onLayout={onLayout}
      style={[
        horizontal ? styles.stepHorizontal : styles.stepVertical,
        { gap: metrics.contentGap, minHeight: metrics.indicator + metrics.rowGap },
      ]}
    >
      <Animated.View
        style={[styles.indicator, { width: metrics.indicator, height: metrics.indicator, borderRadius: metrics.indicator / 2, backgroundColor: background }]}
      >
        {state === "completed" ? (
          <CheckMd size={metrics.font} color={ink} />
        ) : icon != null ? (
          <IconDefaultsProvider size={metrics.icon} color={ink}>
            {icon}
          </IconDefaultsProvider>
        ) : (
          <Text weight="medium" color={ink} style={{ fontSize: metrics.font, lineHeight: Math.round(metrics.font * 1.43) }}>
            {_index + 1}
          </Text>
        )}
      </Animated.View>
      {last ? null : <Connector completed={state === "completed"} width={width} />}
      {parts.length === 0 ? null : (
        <View
          style={
            shown.length === 0
              ? styles.hidden
              : horizontal
                ? styles.contentHorizontal
                : [styles.contentVertical, { paddingBottom: metrics.rowGap }]
          }
        >
          <StepContext.Provider value={{ state, first: shown[0] }}>{parts}</StepContext.Provider>
        </View>
      )}
    </View>
  )
}

/** The line from a step to the next: under the next indicator's edge, solid once completed, else as `connectorStyle`. */
function Connector({ completed, width }: { completed: boolean; width: number }) {
  const { orientation, connectorStyle, metrics, colors, connectorWidth, dash, gap, motion } = useSteps()
  const horizontal = orientation === "horizontal"
  const color = useColorTransition(completed ? colors.connectorCompleted : colors.connector, motion)
  const [length, setLength] = useState(0)
  const dashed = connectorStyle === "dashed" && !completed
  const place: ViewStyle = horizontal
    ? {
        top: metrics.indicator / 2 - connectorWidth / 2,
        start: "50%",
        marginStart: metrics.indicator / 2,
        width: Math.max(0, width + metrics.rowGap - metrics.indicator),
        height: connectorWidth,
      }
    : { top: metrics.indicator, start: metrics.indicator / 2 - connectorWidth / 2, width: connectorWidth, bottom: -metrics.rowGap }
  return (
    <Animated.View
      pointerEvents="none"
      onLayout={dashed ? (event: LayoutChangeEvent) => setLength(horizontal ? event.nativeEvent.layout.width : event.nativeEvent.layout.height) : undefined}
      style={[styles.connector, place, { borderRadius: connectorWidth / 2 }, dashed ? null : { backgroundColor: color }]}
    >
      {dashed
        ? Array.from({ length: Math.ceil(length / (dash + gap)) }, (_, index) => (
            <View
              key={index}
              style={[
                styles.dash,
                horizontal ? { start: index * (dash + gap), width: dash, height: connectorWidth } : { top: index * (dash + gap), height: dash, width: connectorWidth },
                { backgroundColor: colors.connector },
              ]}
            />
          ))
        : null}
    </Animated.View>
  )
}

/** The title of a step: 14/20 medium, beside the indicator's middle in a column, under it in a row. */
function Title({ children, visuallyHidden = false }: StepTitleProps) {
  const { orientation, metrics, colors } = useSteps()
  const step = useContext(StepContext)
  if (visuallyHidden) {
    // On a phone the step reads its title; on the web it stays in the page for screen readers
    return web ? (
      <View style={styles.visuallyHidden}>
        <Text size="sm">{children}</Text>
      </View>
    ) : null
  }
  const inactive = step?.state === "inactive"
  return (
    <Text
      size="sm"
      weight="medium"
      color={inactive ? colors.titleInactive : colors.title}
      align={orientation === "horizontal" ? "center" : undefined}
      style={orientation === "horizontal" ? null : { paddingTop: (metrics.indicator - metrics.line) / 2 }}
    >
      {children}
    </Text>
  )
}

/** The description of a step: 14/20, 2 below the title (beside the indicator's middle when it stands alone). */
function Description({ children }: StepDescriptionProps) {
  const { orientation, metrics, colors } = useSteps()
  const step = useContext(StepContext)
  const inactive = step?.state === "inactive"
  const first = isValidElement(step?.first) && step.first.type === Description
  const horizontal = orientation === "horizontal"
  return (
    <Text
      size="sm"
      color={inactive ? colors.descriptionInactive : colors.description}
      align={horizontal ? "center" : undefined}
      style={first ? { paddingTop: horizontal ? 0 : (metrics.indicator - metrics.line) / 2 } : { marginTop: 2 }}
    >
      {children}
    </Text>
  )
}

ProgressSteps.Step = Step
ProgressSteps.Title = Title
ProgressSteps.Description = Description

const styles = StyleSheet.create({
  root: { width: "100%" },
  row: { flexDirection: "row", width: "100%" },
  column: { flexDirection: "column", width: "100%" },
  stepVertical: { flexDirection: "row", alignItems: "flex-start" },
  stepHorizontal: { flex: 1, flexBasis: 0, minWidth: 0, flexDirection: "column", alignItems: "center" },
  indicator: { zIndex: 1, alignItems: "center", justifyContent: "center", flexShrink: 0 },
  connector: { position: "absolute", overflow: "hidden" },
  dash: { position: "absolute" },
  contentVertical: { flex: 1, minWidth: 0 },
  contentHorizontal: { width: "100%", paddingTop: 8 },
  hidden: { position: "absolute", width: 1, height: 1, overflow: "hidden", opacity: 0 },
  visuallyHidden: { position: "absolute", width: 1, height: 1, margin: -1, overflow: "hidden", opacity: 0 },
  minimal: { flexDirection: "row" },
})
