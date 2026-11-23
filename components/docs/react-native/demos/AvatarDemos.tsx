import { useState } from 'react';
import { Avatar, AvatarGroup } from '@plexui/react-native';
import { Robot } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlRow, Segments, controlsTableStyle } from '../../ButtonDemos';
import { SliderValueControl } from '../../SliderValueControl';
import { RNScreen, docsDemo } from '../RNScreen';

const TYPES = ['text', 'image', 'icon', 'overflow'] as const;
const COLORS = ['primary', 'secondary', 'success', 'danger', 'info', 'discovery'] as const;
// The React page's soft and solid, and React Native's gradient with two initials
const VARIANTS = ['soft', 'solid', 'gradient'] as const;
const IMAGE_URL = 'https://gravatar.com/avatar/9531b260b9693f3394bea8646c6ea141ce58fe5a138b7db7729d60a4c5dde552';

function SliderRow({ name, min, max, step, value, onChange }: { name: string; min: number; max: number; step: number; value: number; onChange: (value: number) => void }) {
  return (
    <DemoControlRow name={name}>
      <SliderValueControl ariaLabel={name} min={min} max={max} step={step} value={value} onChange={onChange} width="min(42vw, 340px)" />
    </DemoControlRow>
  );
}

/**
 * One avatar with every setting, as the React page's Overview: `type` picks what it shows (the initial of `name`, a
 * picture, a symbol or a count), `size` sets it in points, `color` and `variant` fill every avatar but a loaded
 * picture, and `onPress` makes it a button. The React page's `roundness` is a Tailwind class there; a React Native
 * avatar is always a circle (see the page's details).
 */
export const Overview = docsDemo(function Overview() {
  const [type, setType] = useState<(typeof TYPES)[number]>('text');
  const [size, setSize] = useState(48);
  const [overflowCount, setOverflowCount] = useState(9);
  const [color, setColor] = useState<(typeof COLORS)[number]>('secondary');
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('soft');
  const [onPress, setOnPress] = useState(false);
  const colored = type !== 'image';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="type" options={TYPES} value={type} onChange={setType} />
        {type === 'overflow' && <SliderRow name="overflowCount" min={1} max={999} step={1} value={overflowCount} onChange={setOverflowCount} />}
        <SliderRow name="size" min={14} max={80} step={2} value={size} onChange={setSize} />
        {colored && <Segments name="color" options={COLORS} value={color} onChange={setColor} />}
        {colored && <Segments name="variant" options={VARIANTS} value={variant} onChange={setVariant} />}
        <DemoControlBoolean name="onPress" value={onPress} onChange={setOnPress} />
      </div>
      <RNScreen bare minHeight={228}>
        <View style={{ alignSelf: 'center' }}>
          <Avatar
            name={type === 'icon' ? 'Tech support' : type === 'overflow' ? `${overflowCount} more` : 'Tyler'}
            imageUrl={type === 'image' ? IMAGE_URL : undefined}
            Icon={type === 'icon' ? Robot : undefined}
            overflowCount={type === 'overflow' ? overflowCount : undefined}
            size={size}
            color={colored ? color : 'secondary'}
            variant={colored ? variant : 'soft'}
            onPress={onPress ? () => {} : undefined}
          />
        </View>
      </RNScreen>
    </>
  );
});

/**
 * AvatarGroup, as the Overview of the React Avatar Group page: a picture, a solid initial, a solid symbol and a count,
 * the first on top and each cutting the next, all at the group's `size`. The React group's `stack` is not a prop of the
 * React Native one, which always lays the first on top, as the React group's default (see the page's details).
 */
export const Group = docsDemo(function Group() {
  const [size, setSize] = useState(42);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <SliderRow name="size" min={14} max={80} step={2} value={size} onChange={setSize} />
      </div>
      <RNScreen minHeight={168}>
        <View style={{ alignSelf: 'center' }}>
          <AvatarGroup size={size}>
            <Avatar name="Tyler" imageUrl={IMAGE_URL} />
            <Avatar name="Jane" color="primary" variant="solid" />
            <Avatar name="Tech support" Icon={Robot} variant="solid" />
            <Avatar overflowCount={5} />
          </AvatarGroup>
        </View>
      </RNScreen>
    </>
  );
});
