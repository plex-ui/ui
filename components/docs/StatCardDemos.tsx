'use client';

import { useState } from 'react';
import { StatCard } from '@plexui/ui/components/StatCard';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DollarCircle } from '@plexui/ui/components/Icon';
import { DemoControlBoolean, DemoControlRow, DemoControlSelect, controlsTableStyle } from './ButtonDemos';

const SIZES = ['default', 'sm'] as const;
const TREND_POSITIONS = ['value', 'header'] as const;
const TREND_VARIANTS = ['text', 'badge'] as const;
const VARIANTS = ['default', 'accent'] as const;
const ACCENT_COLORS = ['primary', 'secondary', 'danger', 'info', 'discovery', 'success', 'caution', 'warning'] as const;

/** The Overview of Stat Card: what the page's examples once showed one by one (sizes, trend position and variant,
 * tooltip, icon, progress, accent border, inverted trend) are its settings (owner 11.11). */
export function StatCardOverviewDemo() {
  const [size, setSize] = useState<(typeof SIZES)[number]>('default');
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('default');
  const [accentColor, setAccentColor] = useState<(typeof ACCENT_COLORS)[number]>('primary');
  const [trendPosition, setTrendPosition] =
    useState<(typeof TREND_POSITIONS)[number]>('value');
  const [trendVariant, setTrendVariant] =
    useState<(typeof TREND_VARIANTS)[number]>('text');
  const [showTrend, setShowTrend] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [invertTrend, setInvertTrend] = useState(false);
  const [showIcon, setShowIcon] = useState(false);
  const [showProgress, setShowProgress] = useState(false);

  const segmented = <T extends string>(name: string, options: readonly T[], value: T, onChange: (value: T) => void) => (
    <DemoControlRow name={name}>
      <SegmentedControl<T> value={value} onChange={onChange} aria-label={name} size="xs">
        {options.map((option) => (
          <SegmentedControl.Option key={option} value={option}>
            {option}
          </SegmentedControl.Option>
        ))}
      </SegmentedControl>
    </DemoControlRow>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {segmented('size', SIZES, size, setSize)}
        {segmented('variant', VARIANTS, variant, setVariant)}
        {/* The color of the accent bar, which only the accent variant draws; eight of them are a menu */}
        {variant === 'accent' && <DemoControlSelect name="accentColor" options={ACCENT_COLORS} value={accentColor} onChange={setAccentColor} />}
        {segmented('trendPosition', TREND_POSITIONS, trendPosition, setTrendPosition)}
        {segmented('trendVariant', TREND_VARIANTS, trendVariant, setTrendVariant)}
        <DemoControlBoolean name="trend" value={showTrend} onChange={setShowTrend} />
        <DemoControlBoolean name="invertTrend" value={invertTrend} onChange={setInvertTrend} />
        <DemoControlBoolean name="tooltip" value={showTooltip} onChange={setShowTooltip} />
        <DemoControlBoolean name="icon" value={showIcon} onChange={setShowIcon} />
        <DemoControlBoolean name="progress" value={showProgress} onChange={setShowProgress} />
      </div>
      <div data-demo-stage className="py-10 px-6">
        <div style={{ maxWidth: 320, width: '100%' }} className="mx-auto">
          <StatCard
            label="Total Revenue"
            value="$45,231"
            size={size}
            variant={variant}
            accentColor={accentColor}
            trendPosition={trendPosition}
            trendVariant={trendVariant}
            trend={showTrend ? { value: 12.5, label: 'vs last month' } : undefined}
            invertTrend={invertTrend}
            tooltip={showTooltip ? 'Sum of all revenue streams' : undefined}
            icon={showIcon ? <DollarCircle /> : undefined}
            progress={showProgress ? 72 : undefined}
            progressLabel={showProgress ? '72%' : undefined}
            description={showProgress ? 'of $62,800 goal' : undefined}
          />
        </div>
      </div>
    </>
  );
}
