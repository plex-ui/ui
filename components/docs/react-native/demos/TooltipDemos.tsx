import { useState } from 'react';
import { Button, CopyTooltip, Tooltip } from '@plexui/react-native';
import { Copy } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlRow, Segments, controlsTableStyle } from '../../ButtonDemos';
import { SliderValueControl } from '../../SliderValueControl';
import { RNScreen, docsDemo } from '../RNScreen';

// A Button keeps to the start of its column; the React stage centers its trigger
const CENTER = { alignSelf: 'center' } as const;

const TRIGGERS = ['text', 'button', 'icon'] as const;
const SIDES = ['top', 'right', 'bottom', 'left'] as const;
const ALIGNS = ['start', 'center', 'end'] as const;

/**
 * The React page's Overview: text in `Tooltip.TriggerDecorator`, a button or an icon button as the trigger, with
 * every setting. A phone has no hover: a long press shows the tooltip (a tap too, on decorated text). `disabled`
 * disables a button and tells why in the tooltip, so it is offered only with a button. The example stands alone, as
 * the React example has no Phone preview of its own.
 */
export const Overview = docsDemo(function Overview() {
  const [trigger, setTrigger] = useState<(typeof TRIGGERS)[number]>('text');
  const [compact, setCompact] = useState(false);
  const [side, setSide] = useState<(typeof SIDES)[number]>('top');
  const [shownDisabled, setDisabled] = useState(false);
  const disabled = trigger !== 'text' && shownDisabled;
  const reason = 'This action is disabled for reasons';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="trigger" options={TRIGGERS} value={trigger} onChange={setTrigger} />
        <DemoControlBoolean name="compact" value={compact} onChange={setCompact} />
        <Segments name="side" options={SIDES} value={side} onChange={setSide} />
        {trigger !== 'text' && <DemoControlBoolean name="disabled" value={shownDisabled} onChange={setDisabled} />}
      </div>
      <RNScreen bare minHeight={200}>
        {trigger === 'text' && (
          <Tooltip content="This is additional context that appears when the trigger is hovered or focused" compact={compact} side={side}>
            <Tooltip.TriggerDecorator size="md">Simple text with tooltip</Tooltip.TriggerDecorator>
          </Tooltip>
        )}
        {trigger === 'button' && (
          <Tooltip content={disabled ? reason : 'Tooltip on button'} compact={compact} side={side}>
            <Button color="primary" size="lg" disabled={disabled} style={CENTER}>
              Sample button
            </Button>
          </Tooltip>
        )}
        {trigger === 'icon' && (
          <Tooltip content={disabled ? reason : 'Copy to clipboard'} compact={compact} side={side}>
            <Button color="secondary" variant="ghost" size="md" accessibilityLabel="Copy to clipboard" disabled={disabled} style={CENTER}>
              <Copy />
            </Button>
          </Tooltip>
        )}
      </RNScreen>
    </>
  );
});

function OffsetControl({ name, value, onChange }: { name: string; value: number; onChange: (value: number) => void }) {
  return (
    <DemoControlRow name={name}>
      <SliderValueControl ariaLabel={name} min={0} max={40} step={1} value={value} onChange={onChange} width="min(42vw, 340px)" />
    </DemoControlRow>
  );
}

/**
 * The React page's Copy Tooltip: a tap copies the session id and says Copied! for a second; a long press shows Copy.
 * The web's `openDelay` is a hover delay, which a phone has no use for, so it is not offered.
 */
export const CopyTooltipExample = docsDemo(function CopyTooltipExample() {
  const [sideOffset, setSideOffset] = useState(5);
  const [alignOffset, setAlignOffset] = useState(0);
  const [side, setSide] = useState<(typeof SIDES)[number]>('top');
  const [align, setAlign] = useState<(typeof ALIGNS)[number]>('center');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <OffsetControl name="sideOffset" value={sideOffset} onChange={setSideOffset} />
        <OffsetControl name="alignOffset" value={alignOffset} onChange={setAlignOffset} />
        <Segments name="side" options={SIDES} value={side} onChange={setSide} />
        <Segments name="align" options={ALIGNS} value={align} onChange={setAlign} />
      </div>
      <RNScreen minHeight={168}>
        <View style={{ alignItems: 'center' }}>
          <CopyTooltip copyValue="sess_12345abcdefg" align={align} sideOffset={sideOffset} side={side} alignOffset={alignOffset}>
            <Button color="secondary" variant="ghost" size="xl" accessibilityLabel="Copy session ID" style={CENTER}>
              sess_12345abcdefg
            </Button>
          </CopyTooltip>
        </View>
      </RNScreen>
    </>
  );
});
