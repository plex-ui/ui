// The icons of @plexui/react-native as plain SVG for the docs. react-native-svg's web build still imports its native
// modules (TurboModuleRegistry), which react-native-web does not have, and Turbopack does not prefer its `.web.js`
// files. The root goes through react-native-web, so React Native styles and accessibility props work on it, as they
// do in react-native-svg's own web build; the shapes are plain SVG elements.
import { createElement } from 'react';
import { unstable_createElement } from 'react-native';

export default function Svg({
  children,
  accessible,
  accessibilityLabel,
  accessibilityRole,
  accessibilityElementsHidden,
  importantForAccessibility,
  testID,
  ...props
}) {
  // An icon with a name is an image; one without is hidden from assistive technologies, as on a device
  const named = accessible && accessibilityLabel;
  return unstable_createElement('svg', {
    xmlns: 'http://www.w3.org/2000/svg',
    ...props,
    role: named && accessibilityRole === 'image' ? 'img' : undefined,
    'aria-label': named ? accessibilityLabel : undefined,
    'aria-hidden': accessibilityElementsHidden || importantForAccessibility === 'no-hide-descendants' ? true : undefined,
    'data-testid': testID,
    children,
  });
}

const shape = (tag) => {
  const Shape = (props) => createElement(tag, props);
  Shape.displayName = tag;
  return Shape;
};

export const Path = shape('path');
export const G = shape('g');
export const Rect = shape('rect');
export const Circle = shape('circle');
export const Ellipse = shape('ellipse');
export const Line = shape('line');
export const Polyline = shape('polyline');
export const Polygon = shape('polygon');
