import { useState, type ReactNode } from 'react';
import { Button, List, Slider, Text, useTheme } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlRow, Segments, controlsTableStyle } from '../../ButtonDemos';
import { SliderValueControl } from '../../SliderValueControl';
import { RNScreen, docsDemo } from '../RNScreen';

const THUMBS = ['one', 'two', 'three'] as const;
type Thumbs = (typeof THUMBS)[number];
// What the value reads: a number, a number and its unit after it, or a currency before it
const UNITS = ['none', 'unit', 'prefixUnit'] as const;
// How far one value moves at a time: every point of the scale, or the marks' quarters. A range keeps a step of 1
const STEPS = ['1', '5', '10', '25'] as const;
const scaleMarks = [0, 25, 50, 75, 100].map((value) => ({ value, label: String(value) }));
// One hue: the fill in green and the track in a light tint of it
const colorProps = { trackColor: '#61C45433', rangeColor: '#61C454' };
// The slider is named after what it sets: a value in percent, in dollars or bare; a range or tiers of them
const NAMES = {
  one: { none: 'Brightness', unit: 'Volume', prefixUnit: 'Max price' },
  two: { none: 'Age range', unit: 'Humidity range', prefixUnit: 'Price range' },
  three: { none: 'Age groups', unit: 'Discount tiers', prefixUnit: 'Price tiers' },
} satisfies Record<Thumbs, Record<(typeof UNITS)[number], string>>;
// Four figures of the row's type: the value keeps its width, so the track keeps its length as the value changes
const VALUE_WIDTH = 43;

/**
 * A cell of a list holding a slider, as iOS Settings draws a named slider: the row's height and insets, the slider
 * filling it and a short value 12 after it; `stacked` puts what follows the track under it instead.
 */
function SliderCell({ stacked = false, children }: { stacked?: boolean; children: ReactNode }) {
  const theme = useTheme();
  const inset = theme.isAndroid ? 16 : theme.length('--list-row-inset', 20);
  return (
    <View
      style={
        stacked
          ? { paddingHorizontal: inset, paddingBottom: 4 }
          : { flexDirection: 'row', alignItems: 'center', gap: 12, paddingHorizontal: inset, minHeight: theme.length('--field-row-min-height', 52) }
      }
    >
      {children}
    </View>
  );
}

/** The value ending a slider's cell, in the secondary label at the row's type */
function CellValue({ children, disabled }: { children: ReactNode; disabled: boolean }) {
  return (
    <View style={{ minWidth: VALUE_WIDTH }}>
      <Text tabularNums align="right" color={disabled ? 'disabled' : 'secondary'}>
        {children}
      </Text>
    </View>
  );
}

/**
 * The Overview, as the React page's Phone view: a slider on a scale from 0 to 100 in a cell of a list whose header
 * names it. One value ends the cell; a range goes under the track, and marks show the scale in its place. The reset
 * is a row of its own under the slider's list. A phone list has no tooltip or vertical slider, so those desktop
 * settings are left out, and so is the unit while marks take the value's place. Each number of thumbs keeps its own
 * value.
 */
export const Overview = docsDemo(function Overview() {
  const [thumbs, setThumbs] = useState<Thumbs>('one');
  const [values, setValues] = useState({ one: 50, two: [25, 75], three: [10, 40, 70] });
  const [minStepsBetweenThumbs, setMinStepsBetweenThumbs] = useState(5);
  const [step, setStep] = useState<(typeof STEPS)[number]>('1');
  const [resetValue, setResetValue] = useState(true);
  const [unit, setUnit] = useState<(typeof UNITS)[number]>('unit');
  const [marks, setMarks] = useState(false);
  const [colors, setColors] = useState(false);
  const [adornments, setAdornments] = useState(false);
  const [disabled, setDisabled] = useState(false);

  // A small and a large letter at the ends size text
  const name = adornments && thumbs === 'one' ? 'Text size' : NAMES[thumbs][unit];
  const prefix = unit === 'prefixUnit' ? '$' : '';
  const suffix = unit === 'unit' ? '%' : '';
  const text = (value: number) => `${prefix}${value}${suffix}`;
  const setOne = (value: number) => setValues((current) => ({ ...current, one: value }));
  const setMany = (value: number[]) => setValues((current) => ({ ...current, [thumbs]: value }));
  const shared = {
    min: 0,
    max: 100,
    step: thumbs === 'one' ? Number(step) : 1,
    marks: marks ? scaleMarks : undefined,
    ...(colors ? colorProps : {}),
    // A small and a large letter at the ends, as Settings draws a text size slider
    ...(adornments ? { startAdornment: <Text variant="subheadline">A</Text>, endAdornment: <Text variant="title2">A</Text> } : {}),
    disabled,
    'aria-label': name,
  };

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="thumbs" options={THUMBS} value={thumbs} onChange={setThumbs} />
        {thumbs !== 'one' && (
          <DemoControlRow name="minStepsBetweenThumbs">
            <SliderValueControl ariaLabel="minStepsBetweenThumbs" min={0} max={20} step={1} value={minStepsBetweenThumbs} onChange={setMinStepsBetweenThumbs} width="min(42vw, 340px)" />
          </DemoControlRow>
        )}
        {thumbs === 'one' && <Segments name="step" options={STEPS} value={step} onChange={setStep} />}
        {thumbs === 'one' && <DemoControlBoolean name="resetValue" value={resetValue} onChange={setResetValue} />}
        {!marks && <Segments name="unit" options={UNITS} value={unit} onChange={setUnit} />}
        <DemoControlBoolean name="marks" value={marks} onChange={setMarks} />
        <DemoControlBoolean name="colors" value={colors} onChange={setColors} />
        <DemoControlBoolean name="adornments" value={adornments} onChange={setAdornments} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen grouped headerFirst minHeight={240}>
        {/* Rows to the next group's rows, as iOS Settings spaces them */}
        <View style={{ gap: 35 }}>
          <List header={name}>
            {thumbs === 'one' && !marks ? (
              <SliderCell>
                <View style={{ flex: 1, minWidth: 0 }}>
                  <Slider {...shared} value={values.one} onChange={setOne} />
                </View>
                {/* The letters stand where the value would: Settings shows none beside them */}
                {!adornments && <CellValue disabled={disabled}>{text(values.one)}</CellValue>}
              </SliderCell>
            ) : (
              <SliderCell stacked>
                {thumbs === 'one' ? (
                  <Slider {...shared} value={values.one} onChange={setOne} />
                ) : (
                  <Slider {...shared} range value={values[thumbs]} onChange={setMany} minStepsBetweenThumbs={minStepsBetweenThumbs} />
                )}
                {!marks && (
                  <Text variant="subheadline" align="center" tabularNums color={disabled ? 'disabled' : 'primary'}>
                    {values[thumbs as 'two' | 'three'].map(text).join(' – ')}
                  </Text>
                )}
              </SliderCell>
            )}
          </List>
          {thumbs === 'one' && resetValue && (
            <List>
              <SliderCell>
                {/* The button fills the cell, its label centered in it */}
                <View style={{ flex: 1 }}>
                  <Button block color="info" variant="ghost" disabled={disabled} onPress={() => setOne(50)}>
                    Reset to default
                  </Button>
                </View>
              </SliderCell>
            </List>
          )}
        </View>
      </RNScreen>
    </>
  );
});

const DEFAULT_ZOOM = 100;
const ZOOM_FOOTER = 'Makes text and images on the page larger or smaller.';

/**
 * In a settings group: a slider that is one setting of a screen, the list's header naming it and its footer saying
 * what it does, one cell holding the track and its value.
 */
export function Setting() {
  const [zoom, setZoom] = useState(DEFAULT_ZOOM);
  return (
    <List header="Zoom" footer={ZOOM_FOOTER}>
      <SliderCell>
        <View style={{ flex: 1, minWidth: 0 }}>
          <Slider aria-label="Zoom" min={50} max={200} step={10} value={zoom} onChange={setZoom} />
        </View>
        <CellValue disabled={false}>{zoom}%</CellValue>
      </SliderCell>
    </List>
  );
}
