// The docs' `react-native` (next.config.mjs aliases it here): react-native-web, imported by its path so the alias
// does not point back at this file, with the window narrowed to the example's phone screen. Inside a RNStage
// (OverlayHostContext), `Modal` opens in the screen, `useWindowDimensions` is the screen's size and a measure in the
// window is taken from the screen's corner, so a dialog, a sheet or a menu stays in the example. Elsewhere all three
// are react-native-web's.
import { createElement, useContext, useEffect } from 'react';
import { createPortal } from 'react-dom';
import * as Web from '../../../../node_modules/react-native/dist/index.js';
import { OVERLAY_HOST_ATTRIBUTE, OverlayHostContext } from '../overlay-host';

export * from '../../../../node_modules/react-native/dist/index.js';

const layer = { position: 'absolute', inset: 0, zIndex: 10, display: 'flex', flexDirection: 'column' };

/**
 * A modal in the example's screen: a portal into it (react-native-web's portal into the page lost its container
 * under React's Strict Mode, so an overlay opened on the second press), Escape for `onRequestClose` as on the web.
 */
export function Modal(props) {
  const { visible = true, onRequestClose, children } = props;
  const host = useContext(OverlayHostContext);
  useEffect(() => {
    if (!host || !visible || !onRequestClose) return undefined;
    const onKey = (event) => {
      if (event.key === 'Escape') onRequestClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [host, visible, onRequestClose]);
  if (!host) return createElement(Web.Modal, props);
  if (!visible) return null;
  return createPortal(createElement('div', { style: layer }, children), host.node);
}

/** The window of an example is its phone screen. */
export function useWindowDimensions() {
  const host = useContext(OverlayHostContext);
  const window = Web.useWindowDimensions();
  return host ? { ...window, width: host.width, height: host.height } : window;
}

// A view measured in the window inside an example is measured from the screen's corner: the menus place themselves
// in the window, which is the screen here
const measureInWindow = Web.UIManager.measureInWindow;
Web.UIManager.measureInWindow = (node, callback) =>
  measureInWindow(node, (x, y, width, height) => {
    const host = node && typeof node.closest === 'function' ? node.closest(`[${OVERLAY_HOST_ATTRIBUTE}]`) : null;
    if (!host) return callback(x, y, width, height);
    const corner = host.getBoundingClientRect();
    return callback(x - corner.left, y - corner.top, width, height);
  });
