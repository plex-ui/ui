'use client';

import { useState } from 'react';
import { StatCard } from '@plexui/ui/components/StatCard';
import { SegmentedControl } from '@plexui/ui/components/SegmentedControl';
import { DollarCircle, Users, ShoppingBag } from '@plexui/ui/components/Icon';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from './ButtonDemos';

const SIZES = ['default', 'sm'] as const;
const TREND_POSITIONS = ['value', 'header'] as const;
const TREND_VARIANTS = ['text', 'badge'] as const;
const VARIANTS = ['default', 'accent'] as const;
const ACCENT_COLORS = ['primary', 'secondary', 'danger', 'info', 'discovery', 'success', 'caution', 'warning'] as const;

export function StatCardOverviewDemo() {
  const [size, setSize] = useState<(typeof SIZES)[number]>('default');
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('default');
  const [trendPosition, setTrendPosition] =
    useState<(typeof TREND_POSITIONS)[number]>('value');
  const [trendVariant, setTrendVariant] =
    useState<(typeof TREND_VARIANTS)[number]>('text');
  const [showTrend, setShowTrend] = useState(true);
  const [showTooltip, setShowTooltip] = useState(false);
  const [invertTrend, setInvertTrend] = useState(false);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="size">
          <SegmentedControl<(typeof SIZES)[number]>
            value={size}
            onChange={setSize}
            aria-label="size"
            size="xs"
          >
            {SIZES.map((s) => (
              <SegmentedControl.Option key={s} value={s}>
                {s}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="variant">
          <SegmentedControl<(typeof VARIANTS)[number]>
            value={variant}
            onChange={setVariant}
            aria-label="variant"
            size="xs"
          >
            {VARIANTS.map((v) => (
              <SegmentedControl.Option key={v} value={v}>
                {v}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="trendPosition">
          <SegmentedControl<(typeof TREND_POSITIONS)[number]>
            value={trendPosition}
            onChange={setTrendPosition}
            aria-label="trendPosition"
            size="xs"
          >
            {TREND_POSITIONS.map((tp) => (
              <SegmentedControl.Option key={tp} value={tp}>
                {tp}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlRow name="trendVariant">
          <SegmentedControl<(typeof TREND_VARIANTS)[number]>
            value={trendVariant}
            onChange={setTrendVariant}
            aria-label="trendVariant"
            size="xs"
          >
            {TREND_VARIANTS.map((tv) => (
              <SegmentedControl.Option key={tv} value={tv}>
                {tv}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
        <DemoControlBoolean name="trend" value={showTrend} onChange={setShowTrend} />
        <DemoControlBoolean name="tooltip" value={showTooltip} onChange={setShowTooltip} />
        <DemoControlBoolean name="invertTrend" value={invertTrend} onChange={setInvertTrend} />
      </div>
      <div data-demo-stage className="py-10 px-6">
        <div style={{ maxWidth: 320, width: '100%' }} className="mx-auto">
          <StatCard
            label="Total Revenue"
            value="$45,231"
            size={size}
            variant={variant}
            accentColor="primary"
            trendPosition={trendPosition}
            trendVariant={trendVariant}
            trend={showTrend ? { value: 12.5, label: 'vs last month' } : undefined}
            tooltip={showTooltip ? 'Sum of all revenue streams' : undefined}
            invertTrend={invertTrend}
          />
        </div>
      </div>
    </>
  );
}

export function StatCardSizesDemo() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid w-full min-w-0 grid-cols-1 md:grid-cols-3 gap-4" style={{ maxWidth: 720 }}>
        <StatCard label="Total Revenue" value="$45,231" trend={{ value: 12.5 }} />
        <StatCard label="Active Users" value="2,847" trend={{ value: 8.2 }} />
        <StatCard label="Conversion Rate" value="3.24%" trend={{ value: -1.8 }} />
      </div>
      <div className="grid w-full min-w-0 grid-cols-1 md:grid-cols-3 gap-3" style={{ maxWidth: 720 }}>
        <StatCard
          size="sm"
          label="Total Inquiries"
          value="3,544"
          trend={{ value: -2.6 }}
          tooltip="Total inquiries in period"
        />
        <StatCard
          size="sm"
          label="Completion Rate"
          value="89.2%"
          trend={{ value: 0.5 }}
          tooltip="Average across templates"
        />
        <StatCard
          size="sm"
          label="Approval Rate"
          value="84.6%"
          trend={{ value: 1.8 }}
          tooltip="Average across templates"
        />
      </div>
    </div>
  );
}

export function StatCardAccentDemo() {
  const [accentColor, setAccentColor] =
    useState<(typeof ACCENT_COLORS)[number]>('primary');

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlRow name="accentColor">
          <SegmentedControl<(typeof ACCENT_COLORS)[number]>
            value={accentColor}
            onChange={setAccentColor}
            aria-label="accentColor"
            size="xs"
          >
            {ACCENT_COLORS.map((c) => (
              <SegmentedControl.Option key={c} value={c}>
                {c}
              </SegmentedControl.Option>
            ))}
          </SegmentedControl>
        </DemoControlRow>
      </div>
      <div data-demo-stage className="py-10 px-6">
        <div style={{ maxWidth: 320, width: '100%' }} className="mx-auto">
          <StatCard
            label="Total Revenue"
            value="$45,231"
            variant="accent"
            accentColor={accentColor}
            trend={{ value: 12.5, label: 'vs last month' }}
          />
        </div>
      </div>
    </>
  );
}

export function StatCardInvertedTrendDemo() {
  const [invertTrend, setInvertTrend] = useState(true);

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="invertTrend" value={invertTrend} onChange={setInvertTrend} />
      </div>
      <div data-demo-stage className="py-10 px-6">
        <div style={{ maxWidth: 320, width: '100%' }} className="mx-auto">
          <StatCard
            label="Avg Response Time"
            value="234ms"
            trend={{ value: 15.3, label: 'vs last hour' }}
            invertTrend={invertTrend}
          />
        </div>
      </div>
    </>
  );
}

export function StatCardIconDemo() {
  return (
    <div className="flex flex-col gap-6 w-full">
      <div className="grid w-full min-w-0 grid-cols-1 md:grid-cols-2 gap-4">
        <StatCard
          icon={<DollarCircle />}
          label="Total Revenue"
          value="$45,231"
          trend={{ value: 12.5 }}
        />
        <StatCard
          icon={<Users />}
          label="Active Users"
          value="2,847"
          trend={{ value: 8.2 }}
        />
      </div>
      <div className="grid w-full min-w-0 grid-cols-1 md:grid-cols-3 gap-3">
        <StatCard
          size="sm"
          icon={<DollarCircle />}
          label="Revenue"
          value="$45,231"
          trend={{ value: 12.5 }}
        />
        <StatCard
          size="sm"
          icon={<Users />}
          label="Users"
          value="2,847"
          trend={{ value: 8.2 }}
        />
        <StatCard
          size="sm"
          icon={<ShoppingBag />}
          label="Orders"
          value="1,234"
          trend={{ value: -3.1 }}
        />
      </div>
    </div>
  );
}
