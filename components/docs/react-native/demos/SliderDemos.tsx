import { Slider, useTheme } from '@plexui/react-native';
import { SoundOffSpeaker, SoundOnSpeaker } from '@plexui/react-native/icons';
import { useState } from 'react';
import { View } from 'react-native';

const stack = { alignSelf: 'stretch', gap: 12 } as const;

export function Overview() {
  const [volume, setVolume] = useState(60);
  return <Slider label="Volume" value={volume} onChange={setVolume} unit="%" />;
}

export function Adornments() {
  const theme = useTheme();
  const [volume, setVolume] = useState(30);
  return (
    <Slider
      label="Volume"
      value={volume}
      onChange={setVolume}
      unit="%"
      resetValue={60}
      startAdornment={<SoundOffSpeaker size={20} color={theme.colors.textSecondary} />}
      endAdornment={<SoundOnSpeaker size={20} color={theme.colors.textSecondary} />}
    />
  );
}

export function Steps() {
  const [brightness, setBrightness] = useState(70);
  const [opacity, setOpacity] = useState(0.5);
  return (
    <View style={stack}>
      <Slider label="Brightness" value={brightness} onChange={setBrightness} step={10} unit="%" />
      <Slider label="Opacity" value={opacity} onChange={setOpacity} min={0} max={1} step={0.05} />
    </View>
  );
}

export function Range() {
  const [price, setPrice] = useState([100, 350]);
  return <Slider range label="Price" value={price} onChange={setPrice} min={0} max={500} step={10} prefixUnit="$" minStepsBetweenThumbs={5} />;
}

export function Marks() {
  const [size, setSize] = useState(50);
  return (
    <Slider
      label="Text size"
      value={size}
      onChange={setSize}
      step={25}
      hideValue
      marks={[
        { value: 0, label: 'Small' },
        { value: 50, label: 'Default' },
        { value: 100, label: 'Large' },
      ]}
    />
  );
}

export function Vertical() {
  const [bass, setBass] = useState(40);
  const [treble, setTreble] = useState(65);
  return (
    <View style={{ flexDirection: 'row', gap: 32, alignSelf: 'center' }}>
      <Slider orientation="vertical" label="Bass" value={bass} onChange={setBass} />
      <Slider orientation="vertical" label="Treble" value={treble} onChange={setTreble} />
    </View>
  );
}

export function Disabled() {
  return <Slider label="Disabled" value={40} onChange={() => {}} disabled />;
}
