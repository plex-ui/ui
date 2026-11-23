import { useState } from 'react';
import { Skeleton, useTheme } from '@plexui/react-native';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';

const CONTENTS = ['profile', 'card', 'text', 'list', 'feed'] as const;
type Content = (typeof CONTENTS)[number];

/**
 * The placeholders of one content, as the React page's stage lays them out with Tailwind: the sizes in points, the
 * radii and the border from the same tokens (`rounded-lg` is `--radius-lg`, `rounded-xl` `--radius-xl`,
 * `border-default` `--color-border`).
 */
function Placeholders({ content, circle }: { content: Content; circle: boolean }) {
  const theme = useTheme();
  const roundedLg = { borderRadius: theme.length('--radius-lg', 10) };
  const border = theme.color('--color-border');
  if (content === 'profile') {
    return (
      <View style={{ alignSelf: 'center', flexDirection: 'row', alignItems: 'center', gap: 16 }}>
        <Skeleton circle={circle} width={48} height={48} />
        <View style={{ gap: 8 }}>
          <Skeleton width={200} height={16} />
          <Skeleton width={150} height={16} />
        </View>
      </View>
    );
  }
  if (content === 'card') {
    return (
      <View style={{ alignSelf: 'center', width: 300, gap: 12, padding: 16, borderWidth: 1, borderColor: border, borderRadius: theme.length('--radius-xl', 12) }}>
        <Skeleton height={150} style={roundedLg} />
        <Skeleton width="75%" height={16} />
        <Skeleton width="50%" height={16} />
      </View>
    );
  }
  if (content === 'text') {
    return (
      <View style={{ alignSelf: 'center', width: 300, gap: 8 }}>
        <Skeleton height={16} />
        <Skeleton height={16} />
        <Skeleton width="80%" height={16} />
      </View>
    );
  }
  if (content === 'list') {
    // Rows of a list, as a chat list loads: an avatar and two lines
    return (
      <View style={{ alignSelf: 'center', width: 300 }}>
        {Array.from({ length: 3 }, (_, i) => (
          <View key={i} style={{ flexDirection: 'row', alignItems: 'center', gap: 12, paddingVertical: 12 }}>
            <Skeleton circle width={40} height={40} />
            <View style={{ flex: 1, gap: 8 }}>
              <Skeleton width="60%" height={16} />
              <Skeleton width="80%" height={12} />
            </View>
          </View>
        ))}
      </View>
    );
  }
  // A post in a feed: its author, its text and a picture
  return (
    <View style={{ alignSelf: 'center', width: 300, gap: 12, padding: 16, borderWidth: 1, borderColor: border, borderRadius: theme.length('--radius-xl', 12) }}>
      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
        <Skeleton circle width={32} height={32} />
        <View style={{ gap: 6 }}>
          <Skeleton width={120} height={14} />
          <Skeleton width={72} height={12} />
        </View>
      </View>
      <Skeleton height={16} />
      <Skeleton width="80%" height={16} />
      <Skeleton height={150} style={roundedLg} />
    </View>
  );
}

/**
 * The placeholders of a profile, a card, a paragraph, the rows of a list and a post in a feed, as the React page's
 * Overview: skeletons set in the shape of what they stand in for. `circle` rounds the placeholder of an avatar; without
 * it the placeholder keeps the skeleton's radius, as for a square picture, so it is offered for the profile; the
 * avatars of the list and the feed stay round. The container says what loads, for screen readers, as skeletons are
 * hidden from them.
 */
export const Overview = docsDemo(function Overview() {
  const [content, setContent] = useState<Content>('profile');
  const [circle, setCircle] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="content" options={CONTENTS} value={content} onChange={setContent} />
        {content === 'profile' && <DemoControlBoolean name="circle" value={circle} onChange={setCircle} />}
      </div>
      <RNScreen bare minHeight={168}>
        <View accessible accessibilityLabel="Loading" accessibilityState={{ busy: true }}>
          <Placeholders content={content} circle={circle} />
        </View>
      </RNScreen>
    </>
  );
});
