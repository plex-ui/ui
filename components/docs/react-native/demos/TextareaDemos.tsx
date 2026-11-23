import { useState } from 'react';
import { Field, List, Textarea } from '@plexui/react-native';
import { DemoControlBoolean, DemoControlRow, controlsTableStyle } from '../../ButtonDemos';
import { SliderValueControl } from '../../SliderValueControl';
import { RNScreen, docsDemo } from '../RNScreen';

// A note to the courier, three lines long: auto resize, rows and maxRows and auto select show on it
const NOTE = 'Gate code 4512\nThird floor, door on the left\nCall when you arrive';
const ERROR = 'Keep the note to two lines.';
const ROWS = { min: 1, max: 10, step: 1 } as const;

function Range({ name, value, onChange }: { name: string; value: number; onChange: (value: number) => void }) {
  return (
    <DemoControlRow name={name}>
      <SliderValueControl ariaLabel={name} {...ROWS} value={value} onChange={onChange} width="min(42vw, 340px)" />
    </DemoControlRow>
  );
}

/**
 * The Overview, as the React page's Phone view: a textarea under the label of a List row (`Field row
 * orientation="vertical"`), the row its frame, with every setting of a phone: `rows` and `maxRows` on one scale,
 * `autoResize`, `autoSelect` (TextInput's `selectTextOnFocus`), `disabled` and `invalid`, whose error is the row's line
 * under the value.
 */
export const Overview = docsDemo(function Overview() {
  const [value, setValue] = useState(NOTE);
  const [rows, setRows] = useState(3);
  const [maxRows, setMaxRows] = useState(10);
  const [autoResize, setAutoResize] = useState(true);
  const [autoSelect, setAutoSelect] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [invalid, setInvalid] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Range name="rows" value={rows} onChange={setRows} />
        <Range name="maxRows" value={maxRows} onChange={setMaxRows} />
        <DemoControlBoolean name="autoResize" value={autoResize} onChange={setAutoResize} />
        <DemoControlBoolean name="autoSelect" value={autoSelect} onChange={setAutoSelect} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="invalid" value={invalid} onChange={setInvalid} />
      </div>
      <RNScreen grouped>
        <List>
          <Field row orientation="vertical" label="Notes" errorMessage={invalid ? ERROR : undefined}>
            <Textarea
              variant="ghost"
              value={value}
              onChangeText={setValue}
              placeholder="Add a note"
              rows={rows}
              maxRows={maxRows}
              autoResize={autoResize}
              autoSelect={autoSelect}
              disabled={disabled}
              invalid={invalid}
            />
          </Field>
        </List>
      </RNScreen>
    </>
  );
});
