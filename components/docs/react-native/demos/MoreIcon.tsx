'use client';

import { useTheme } from '@plexui/react-native';
import { DotsHorizontal, DotsVertical } from '@plexui/react-native/icons';

/** The More icon of the platform: the horizontal dots of iOS, the vertical ones of Android (Material). */
export function MoreIcon() {
  return useTheme().isAndroid ? <DotsVertical /> : <DotsHorizontal />;
}
