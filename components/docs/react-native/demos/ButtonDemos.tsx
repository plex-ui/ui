import { useState } from 'react';
import { Button, IconButton, NavigationButton, Text, Toolbar } from '@plexui/react-native';
import { ArrowRightSm, Email, Plus } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, DemoControlSelect, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';

// The phone's colors and sizes, as the React page's Phone view offers them: iOS has an accent, a gray and a
// destructive button in three heights (small 28, medium 34, large 50); Android draws them as the Android button: its
// 48dp, and 32 and 40dp steps of ours in its proportions
const COLORS = ['primary', 'secondary', 'danger', 'accent'] as const;
const VARIANTS = ['solid', 'soft', 'outline', 'ghost'] as const;
const SIZES = ['sm', 'md', 'xl'] as const;
const ICONS = ['none', 'start', 'end', 'only'] as const;
const ICON_SIZES = ['auto', 'sm', 'md', 'lg', 'xl', '2xl'] as const;
const SHAPES = ['round', 'square'] as const;
const MATERIALS = ['flat', 'glass', 'clear'] as const;

/**
 * One button with every setting, as the React page's Overview: `color` and `variant` style it, `size` picks the
 * platform's height, `icon` places an icon, and the states follow. A setting shows where it acts: `shape` and
 * `selected` (a toggle: a soft button turns solid) on Android, `mobileMaterial` on iOS for a soft or ghost button,
 * `uniform` with an icon alone.
 */
export const Overview = docsDemo(function Overview() {
  const platform = useNativePlatform();
  const android = platform === 'android';
  const [color, setColor] = useState<(typeof COLORS)[number]>('primary');
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('solid');
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [icon, setIcon] = useState<(typeof ICONS)[number]>('none');
  const [uniform, setUniform] = useState(false);
  const [iconSize, setIconSize] = useState<(typeof ICON_SIZES)[number]>('auto');
  const [shape, setShape] = useState<(typeof SHAPES)[number]>('round');
  const [material, setMaterial] = useState<(typeof MATERIALS)[number]>('flat');
  const [block, setBlock] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [loading, setLoading] = useState(false);
  const [selected, setSelected] = useState(false);
  const translucent = variant === 'soft' || variant === 'ghost';
  const clearOn = !android && translucent && material === 'clear' && (color === 'primary' || color === 'secondary');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlSelect name="color" options={COLORS} value={color} onChange={setColor} />
        <Segments name="variant" options={VARIANTS} value={variant} onChange={setVariant} />
        <DemoControlSelect name="size" options={SIZES} value={size} onChange={setSize} />
        {android && <Segments name="shape" options={SHAPES} value={shape} onChange={setShape} />}
        {!android && translucent && <Segments name="mobileMaterial" options={MATERIALS} value={material} onChange={setMaterial} />}
        <Segments name="icon" options={ICONS} value={icon} onChange={setIcon} />
        {icon === 'only' && <DemoControlBoolean name="uniform" value={uniform} onChange={setUniform} />}
        {icon !== 'none' && <DemoControlSelect name="iconSize" options={ICON_SIZES} value={iconSize} onChange={setIconSize} />}
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        <DemoControlBoolean name="loading" value={loading} onChange={setLoading} />
        {android && <DemoControlBoolean name="selected" value={selected} onChange={setSelected} />}
      </div>
      <RNScreen minHeight={200}>
        {/* Clear glass stands over a photo, a video or a color: a band of color shows it */}
        <View
          style={[
            { alignSelf: block ? 'stretch' : 'center' },
            clearOn ? { alignSelf: 'stretch', alignItems: block ? 'stretch' : 'center', padding: 24, backgroundColor: '#2D5BD0' } : null,
          ]}
        >
          <Button
            color={color}
            variant={variant}
            size={size}
            uniform={icon === 'only' && uniform}
            iconSize={icon === 'none' || iconSize === 'auto' ? undefined : iconSize}
            shape={android ? shape : undefined}
            mobileMaterial={!android && translucent ? material : undefined}
            block={block}
            disabled={disabled}
            loading={loading}
            selected={android && selected}
            onPress={android ? () => setSelected((value) => !value) : undefined}
            accessibilityLabel={icon === 'only' ? 'Send' : undefined}
          >
            {(icon === 'start' || icon === 'only') && <Email />}
            {icon !== 'only' && 'Send'}
            {icon === 'end' && <ArrowRightSm />}
          </Button>
        </View>
      </RNScreen>
    </>
  );
});

/**
 * A button under text starts its label where the text does: `opticallyAlign="start"` takes its gutter in, as the
 * React page's Optical alignment shows it on a phone.
 */
export const OpticalAlignment = docsDemo(function OpticalAlignment() {
  const [align, setAlign] = useState<'none' | 'start'>('start');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="opticallyAlign" options={['none', 'start']} value={align} onChange={setAlign} />
      </div>
      <RNScreen minHeight={200}>
        {/* The text starts 40px from the screen's edge (the page's 16 and 24 more), as a sign-in sets it, so the
            capsule of the aligned button reaches 20px past it and keeps clear of the edge */}
        <View style={{ alignItems: 'flex-start', gap: 16, alignSelf: 'stretch', paddingHorizontal: 24 }}>
          <Text color="secondary">Sign in with your email or phone number to continue.</Text>
          <Button color="secondary" variant="soft" size="xl" opticallyAlign={align === 'start' ? 'start' : undefined}>
            Forgot your password?
          </Button>
        </View>
      </RNScreen>
    </>
  );
});

/** IconButton: a button with an icon alone, a circle on iOS and a Material icon button on Android */
export const IconButtons = docsDemo(function IconButtons() {
  const android = useNativePlatform() === 'android';
  const [variant, setVariant] = useState<(typeof VARIANTS)[number]>('soft');
  const [size, setSize] = useState<(typeof SIZES)[number]>('md');
  const [disabled, setDisabled] = useState(false);
  const [selected, setSelected] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="variant" options={VARIANTS} value={variant} onChange={setVariant} />
        <Segments name="size" options={SIZES} value={size} onChange={setSize} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
        {android && <DemoControlBoolean name="selected" value={selected} onChange={setSelected} />}
      </div>
      <RNScreen minHeight={200}>
        <View style={{ alignSelf: 'center' }}>
          <IconButton
            icon={<Plus />}
            variant={variant}
            size={size}
            disabled={disabled}
            selected={android && selected}
            onPress={android ? () => setSelected((value) => !value) : undefined}
            accessibilityLabel="Add"
          />
        </View>
      </RNScreen>
    </>
  );
});

/**
 * NavigationButton in a top bar: Back and Close at its start, Confirm at its end with Close before it, as a sheet
 * sets them on iOS 26 and a full-screen dialog on Android, each in its platform's glyph.
 */
export const Navigation = docsDemo(function Navigation() {
  const [action, setAction] = useState<'back' | 'close' | 'confirm'>('back');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="action" options={['back', 'close', 'confirm']} value={action} onChange={setAction} />
      </div>
      <RNScreen screen minHeight={200}>
        <Toolbar>
          <Toolbar.Leading>
            {action === 'back' ? <NavigationButton action="back" accessibilityLabel="Back to albums" /> : <NavigationButton action="close" />}
          </Toolbar.Leading>
          <Toolbar.Title>{action === 'back' ? 'Album' : 'New album'}</Toolbar.Title>
          {action === 'confirm' ? (
            <Toolbar.Trailing>
              <NavigationButton action="confirm" accessibilityLabel="Save album" label="Save" />
            </Toolbar.Trailing>
          ) : null}
        </Toolbar>
      </RNScreen>
    </>
  );
});
