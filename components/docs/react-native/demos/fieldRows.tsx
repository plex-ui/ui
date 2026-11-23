import type { ReactNode } from 'react';
import { Text, useTheme } from '@plexui/react-native';
import { View } from 'react-native';

// Helpers of the field demos. Not a demo module: the demos' index takes only components without props from those.

/**
 * The space between two Lists one after another, as the React FieldGroup stacks its groups on a phone
 * (FieldGroup.module.css, iOS 27 Settings): 35 from rows to rows, less what a footer before or a header of the next
 * group already takes; a prominent header keeps a SwiftUI Form's 62 after rows (74 after a footer). On Android the
 * cards stand 12 apart, and a footer's own 17 under it parts it from the next card.
 */
export function groupGap(android: boolean, { afterFooter = false, header = false, prominent = false }: { afterFooter?: boolean; header?: boolean; prominent?: boolean } = {}) {
  if (android) return afterFooter ? 0 : 12;
  if (prominent) return afterFooter ? -1 : 17;
  return 35 - (afterFooter ? 17.33 : 0) - (header ? (afterFooter ? 11.33 : 18.67) : 0);
}

/** Lists one after another, each `gap` from the one before it (RNScreen's own gap would space them otherwise). */
export function Groups({ children }: { children: ReactNode }) {
  return <View>{children}</View>;
}

export function Gap({ size }: { size: number }) {
  return <View style={{ height: size }} />;
}

/** A link in the rows' text: 17/22 words in the info text, as the web's phone rows (iOS); 16sp in the accent (Android). */
export function RowLink({ children, onPress }: { children: ReactNode; onPress?: () => void }) {
  const theme = useTheme();
  return (
    <Text accessibilityRole="link" onPress={onPress ?? (() => {})} color={theme.isAndroid ? theme.colors.accent : theme.color("--color-text-info")} style={theme.isAndroid ? { fontSize: 16, lineHeight: 20 } : { fontSize: 17, lineHeight: 22 }}>
      {children}
    </Text>
  );
}
