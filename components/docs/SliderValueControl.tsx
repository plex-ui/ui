'use client';

import { Slider } from '@plexui/ui/components/Slider';
import s from './SliderValueControl.module.css';

export function SliderValueControl({
  value,
  onChange,
  min,
  max,
  step,
  width = 'min(62vw, 640px)',
  ariaLabel = 'value',
}: {
  value: number;
  onChange: (value: number) => void;
  min: number;
  max: number;
  step: number;
  width?: number | string;
  ariaLabel?: string;
}) {
  return (
    <div className={s.Wrap} style={{ width }}>
      <div className={s.SliderBox}>
        <Slider
          className={s.SliderCompact}
          aria-label={ariaLabel}
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={onChange}
        />
      </div>
      <span className={s.Value}>{value}</span>
    </div>
  );
}
