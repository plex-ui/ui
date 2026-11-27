import { useState } from 'react';
import { Button, SignInButton, Text } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { useNativePlatform } from '../platform';

const PROVIDERS = ['apple', 'google'] as const;
const ACTIONS = ['continue', 'sign-in', 'sign-up'] as const;
const SCHEMES = ['auto', 'light', 'dark'] as const;

/**
 * One sign-in button with every setting: the provider (Apple's on iOS alone), its label, the brand look (the theme's
 * scheme or a set one, Google's neutral), over media, block and disabled.
 */
export const Overview = docsDemo(function Overview() {
  const android = useNativePlatform() === 'android';
  const [providerValue, setProvider] = useState<(typeof PROVIDERS)[number]>('apple');
  const [action, setAction] = useState<(typeof ACTIONS)[number]>('continue');
  const [scheme, setScheme] = useState<(typeof SCHEMES)[number]>('auto');
  const [neutral, setNeutral] = useState(false);
  const [block, setBlock] = useState(true);
  const [disabled, setDisabled] = useState(false);
  // Sign in with Apple is an iOS app's button: Android offers Google's alone
  const provider = android ? 'google' : providerValue;
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!android && <Segments name="provider" options={PROVIDERS} value={providerValue} onChange={setProvider} />}
        <Segments name="action" options={ACTIONS} value={action} onChange={setAction} />
        <Segments name="scheme" options={SCHEMES} value={scheme} onChange={setScheme} />
        {provider === 'google' && <DemoControlBoolean name="neutral" value={neutral} onChange={setNeutral} />}
        <DemoControlBoolean name="block" value={block} onChange={setBlock} />
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen minHeight={200}>
        <View style={{ paddingHorizontal: 16, alignItems: block ? 'stretch' : 'center' }}>
          <SignInButton
            provider={provider}
            action={action}
            scheme={scheme === 'auto' ? undefined : scheme}
            neutral={provider === 'google' && neutral}
            block={block}
            disabled={disabled}
          />
        </View>
      </RNScreen>
    </>
  );
});

/**
 * Every look, each on the background it is made for: under a screen's main button: on light, Apple's black and
 * Google's light and neutral; on dark, Apple's white and Google's dark.
 */
export const Looks = docsDemo(function Looks() {
  const android = useNativePlatform() === 'android';
  return (
    <RNScreen minHeight={460}>
      <View style={{ paddingHorizontal: 16, gap: 16 }}>
        {/* The screen's main button: the sign-in buttons take its height and shape */}
        <Button size="xl" block>Continue with email</Button>
        <View style={{ gap: 12, marginHorizontal: -16, padding: 16, backgroundColor: '#FFFFFF' }}>
          {!android && <SignInButton provider="apple" scheme="light" />}
          <SignInButton provider="google" scheme="light" />
          <SignInButton provider="google" neutral />
        </View>
        <View style={{ gap: 12, marginHorizontal: -16, padding: 16, backgroundColor: '#000000' }}>
          {!android && <SignInButton provider="apple" scheme="dark" />}
          <SignInButton provider="google" scheme="dark" />
        </View>
      </View>
    </RNScreen>
  );
});

/** Over a video: Apple's white button and Google's light one, at the foot of a full-screen welcome. */
export const OverMedia = docsDemo(function OverMedia() {
  const android = useNativePlatform() === 'android';
  return (
    <RNScreen screen minHeight={520}>
      <View style={{ flex: 1, justifyContent: 'flex-end', padding: 16, paddingBottom: 32, gap: 12, overflow: 'hidden' }}>
        <video
          src="/plexui-hero-vertical.mp4"
          autoPlay
          loop
          muted
          playsInline
          aria-hidden
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', objectFit: 'cover' }}
        />
        <Text style={{ color: '#FFFFFF', fontSize: 28, lineHeight: 34, fontWeight: '700', marginBottom: 12 }}>Welcome</Text>
        {!android && <SignInButton provider="apple" overMedia />}
        <SignInButton provider="google" scheme="light" />
      </View>
    </RNScreen>
  );
});
