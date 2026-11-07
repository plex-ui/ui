'use client';

import { useState, useSyncExternalStore } from 'react';
import dynamic from 'next/dynamic';
import { Tooltip } from '@plexui/ui/components/Tooltip';

import { controlsTableStyle, DemoControlBoolean } from './ButtonDemos';
import { usePhoneRows } from './PhoneRows';

const Slider = dynamic(
  () => import('@plexui/ui/components/Slider').then((mod) => mod.Slider),
  { ssr: false }
);

const subscribeMounted = () => () => {};
const getMountedSnapshot = () => true;
const getServerMountedSnapshot = () => false;

function useMounted() {
  return useSyncExternalStore(subscribeMounted, getMountedSnapshot, getServerMountedSnapshot);
}

/** A slider spans a phone screen between its 16px margins, as an iOS slider spans its row; 300px on desktop. */
function useSliderWidth() {
  return usePhoneRows() ? '100%' : 300;
}

export function SliderBaseDemo({ disabled = false }: { disabled?: boolean }) {
  const mounted = useMounted();
  const width = useSliderWidth();
  const [value, setValue] = useState(1000);
  if (!mounted) return <div style={{ width: 300, height: 48 }} />;
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 px-4 w-full">
      <div style={{ width }}>
        <Slider
          label="Example field"
          min={0}
          max={2000}
          resetValue={1000}
          step={10}
          unit="ms"
          value={value}
          onChange={setValue}
          disabled={disabled}
        />
      </div>
    </div>
  );
}

export function SliderBaseDemoWithControls() {
  const [disabled, setDisabled] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <SliderBaseDemo disabled={disabled} />
    </>
  );
}

export function SliderTooltipsDemo() {
  const mounted = useMounted();
  const [value, setValue] = useState(1000);
  if (!mounted) return <div style={{ width: 300, height: 48 }} />;
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <div style={{ width: 300 }}>
        <Slider
          label={
            <Tooltip content="More details about this field">
              <Tooltip.TriggerDecorator>Example field</Tooltip.TriggerDecorator>
            </Tooltip>
          }
          min={0}
          max={2000}
          resetValue={1000}
          step={10}
          unit="ms"
          value={value}
          onChange={setValue}
        />
      </div>
    </div>
  );
}

export function SliderMarksDemo() {
  const mounted = useMounted();
  const width = useSliderWidth();
  const [value, setValue] = useState(3);
  if (!mounted) return <div style={{ width: 300, height: 64 }} />;
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-20 px-4 w-full">
      <div style={{ width }}>
        <Slider
          value={value}
          label="Passing grade"
          min={1}
          max={5}
          step={1}
          onChange={setValue}
          marks={[
            { value: 1, label: '1' },
            { value: 2, label: '2' },
            { value: 3, label: '3' },
            { value: 4, label: '4' },
            { value: 5, label: '5' },
          ]}
          trackColor="#61C454"
          rangeColor="#EF4146"
        />
      </div>
    </div>
  );
}

export function SliderRangeDemo() {
  const mounted = useMounted();
  const width = useSliderWidth();
  const [value, setValue] = useState([25, 75]);
  if (!mounted) return <div style={{ width: 300, height: 48 }} />;
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 px-4 w-full">
      <div style={{ width }}>
        <Slider
          range
          label="Price range"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={setValue}
          prefixUnit="$"
        />
      </div>
    </div>
  );
}

export function SliderMultipleThumbsDemo() {
  const mounted = useMounted();
  const width = useSliderWidth();
  const [value, setValue] = useState([10, 40, 70]);
  if (!mounted) return <div style={{ width: 300, height: 48 }} />;
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 px-4 w-full">
      <div style={{ width }}>
        <Slider
          range
          label="Breakpoints"
          min={0}
          max={100}
          step={1}
          value={value}
          onChange={setValue}
          minStepsBetweenThumbs={5}
        />
      </div>
    </div>
  );
}

export function SliderVerticalDemo() {
  const mounted = useMounted();
  const [value, setValue] = useState(50);
  if (!mounted) return <div style={{ width: 40, height: 200 }} />;
  return (
    <div data-demo-stage className="flex-1 flex flex-col items-center justify-center py-12 w-full">
      <Slider
        label="Volume"
        min={0}
        max={100}
        step={1}
        value={value}
        onChange={setValue}
        orientation="vertical"
      />
    </div>
  );
}
