import { useState } from 'react';
import { BottomActions, Button, Input, IntroHeader, List, ListItem, NavigationButton, Toolbar, useTheme } from '@plexui/react-native';
import { CheckMd, Email, Health } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { PhonePage } from './ToolbarDemos';

const ALIGNS = ['cells', 'text'] as const;
type Align = (typeof ALIGNS)[number];

/** A sheet's bar: Back or Close at the start, as Apple's steps set it */
function SheetBar({ scrolled, canvas, back, title }: { scrolled: boolean; canvas?: string; back?: boolean; title?: string }) {
  return (
    <Toolbar scrolled={scrolled} canvasColor={canvas}>
      <Toolbar.Leading>
        <NavigationButton action={back ? 'back' : 'close'} />
      </Toolbar.Leading>
      {title ? <Toolbar.Title>{title}</Toolbar.Title> : null}
      {back ? (
        <Toolbar.Trailing>
          <NavigationButton action="close" />
        </Toolbar.Trailing>
      ) : null}
    </Toolbar>
  );
}

/**
 * Every setting on one step, after iOS 27's Add Email Address: Back in the sheet's bar, the symbol, the title and what
 * the step asks, then the field and Continue on the column of the header (`cells`), or the title on the field's text
 * (`text`).
 */
export const Overview = docsDemo(function Overview() {
  const [media, setMedia] = useState(true);
  const [description, setDescription] = useState(true);
  const [align, setAlign] = useState<Align>('cells');
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="media" value={media} onChange={setMedia} />
        <DemoControlBoolean name="description" value={description} onChange={setDescription} />
        <Segments name="align" options={ALIGNS} value={align} onChange={setAlign} />
      </div>
      <RNScreen screen minHeight={640}>
        <AddEmail media={media} description={description} align={align} />
      </RNScreen>
    </>
  );
});

function AddEmail({ media, description, align }: { media: boolean; description: boolean; align: Align }) {
  const theme = useTheme();
  const [email, setEmail] = useState('');
  return (
    <PhonePage
      top={(scrolled, canvas) => <SheetBar scrolled={scrolled} canvas={canvas} back />}
      bottom={() => (
        <BottomActions>
          <Button color="primary" variant="solid" disabled={!email.includes('@')}>
            Continue
          </Button>
        </BottomActions>
      )}
    >
      {/* The column 36 from the screen's edges, as the actions under it: the page's 16 and 20 more. The page starts
          16 under the bar's padding; -8 sets the symbol's box 18 under the bar's buttons, its drawing about 24-31 */}
      <View style={{ paddingHorizontal: 20, marginTop: -8, gap: 24 }}>
        <IntroHeader
          media={media ? <Email /> : undefined}
          title="Add Email Address"
          description={
            description
              ? 'A verification code will be sent to this address. Once you have added it, you can use it to sign in.'
              : undefined
          }
          align={align}
        />
        <Input
          accessibilityLabel="Email address"
          placeholder="Email address"
          variant={theme.isAndroid ? 'outline' : 'soft'}
          size="3xl"
          pill={!theme.isAndroid}
          value={email}
          onChangeText={setEmail}
          keyboardType="email-address"
          autoCapitalize="none"
          autoComplete="email"
        />
      </View>
    </PhonePage>
  );
}

/** The forms of a medication, as the Health app's "Choose the Medication Type" step lists them */
const COMMON_FORMS = ['Capsule', 'Tablet', 'Liquid', 'Topical'];
const MORE_FORMS = ['Cream', 'Device', 'Drops', 'Foam', 'Gel', 'Inhaler', 'Injection'];

/**
 * Over a long grouped list the title stands on the rows' text (`align="text"`), as Health's Choose the Medication
 * Type: the cards keep the page's margin and the title, as the section headers, is 20 in from their edge. No
 * description.
 */
export const OverList = docsDemo(function OverList() {
  return (
    <RNScreen screen minHeight={640}>
      <MedicationType />
    </RNScreen>
  );
});

function MedicationType() {
  const theme = useTheme();
  const [form, setForm] = useState<string | null>(null);
  const row = (choice: string) => (
    <ListItem
      key={choice}
      label={choice}
      trailing={form === choice ? <CheckMd color={theme.colors.accent} /> : undefined}
      disclosure={false}
      onPress={() => setForm(choice)}
    />
  );
  return (
    <PhonePage
      top={(scrolled, canvas) => <SheetBar scrolled={scrolled} canvas={canvas} back title="Ibuprofen" />}
      bottom={() => (
        <BottomActions floating>
          <Button color="primary" variant="solid" disabled={form === null}>
            Next
          </Button>
        </BottomActions>
      )}
    >
      <View style={{ marginTop: -8 }}>
        <IntroHeader media={<Health />} title="Choose the Medication Type" align="text" style={{ marginBottom: 8 }} />
        <List surface="plain" header="Common Forms">
          {COMMON_FORMS.map(row)}
        </List>
        <List surface="plain" header="More Forms" style={{ marginTop: 16 }}>
          {MORE_FORMS.map(row)}
        </List>
      </View>
    </PhonePage>
  );
}
