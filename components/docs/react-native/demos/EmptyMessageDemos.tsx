import { useContext, useState } from 'react';
import { Button, EmptyMessage, Toolbar } from '@plexui/react-native';
import { AllProductsExplore, Plus } from '@plexui/react-native/icons';
import { View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { RNScreen, docsDemo } from '../RNScreen';
import { NativeScreenTitleContext, useNativePlatform } from '../platform';

const FILL_OPTIONS = ['static', 'absolute', 'none'] as const;
const SIZE_OPTIONS = ['md', 'sm'] as const;
const ALIGN_OPTIONS = ['center', 'start'] as const;
const COLOR_OPTIONS = ['secondary', 'danger', 'warning'] as const;
// The React page also offers a text link; React Native has no TextLink (see the page's details)
const ACTION_OPTIONS = ['one', 'two', 'none'] as const;

/**
 * One message with every setting, as the React page's Overview: `fill`, `size` and `align` place it, and each part
 * can be left out or tinted. A message needs a title or a description, so `description` is offered with a title. On a
 * phone the message of the default size fills the screen under its top bar and centers in it, as iOS's
 * ContentUnavailableView does, so the example draws that screen: the bar named by the example, then the space the
 * message fills.
 */
export const Overview = docsDemo(function Overview() {
  const { page, title: screenTitle } = useContext(NativeScreenTitleContext);
  const android = useNativePlatform() === 'android';
  const [fill, setFill] = useState<(typeof FILL_OPTIONS)[number]>('static');
  const [size, setSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [align, setAlign] = useState<(typeof ALIGN_OPTIONS)[number]>('center');
  const [icon, setIcon] = useState(true);
  const [iconSize, setIconSize] = useState<(typeof SIZE_OPTIONS)[number]>('md');
  const [iconColor, setIconColor] = useState<(typeof COLOR_OPTIONS)[number]>('secondary');
  const [title, setTitle] = useState(true);
  const [titleColor, setTitleColor] = useState<(typeof COLOR_OPTIONS)[number]>('secondary');
  const [description, setDescription] = useState(true);
  const [actions, setActions] = useState<(typeof ACTION_OPTIONS)[number]>('one');
  const shownDescription = !title || description;
  const sizedIcon = size === 'md';
  // iOS: the action of a full message is a small capsule, as ContentUnavailableView's, a compact one a medium button;
  // Android sets none, so a full message's button is the Android 48dp pill across the column
  const buttonSize = android ? undefined : size === 'sm' ? 'md' : 'sm';
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <Segments name="fill" options={FILL_OPTIONS} value={fill} onChange={setFill} />
        <Segments name="size" options={SIZE_OPTIONS} value={size} onChange={setSize} />
        <Segments name="align" options={ALIGN_OPTIONS} value={align} onChange={setAlign} />
        <DemoControlBoolean name="icon" value={icon} onChange={setIcon} />
        {icon && sizedIcon && <Segments name="iconSize" options={SIZE_OPTIONS} value={iconSize} onChange={setIconSize} />}
        {icon && <Segments name="iconColor" options={COLOR_OPTIONS} value={iconColor} onChange={setIconColor} />}
        <DemoControlBoolean name="title" value={title} onChange={setTitle} />
        {title && <Segments name="titleColor" options={COLOR_OPTIONS} value={titleColor} onChange={setTitleColor} />}
        {title && <DemoControlBoolean name="description" value={description} onChange={setDescription} />}
        <Segments name="actions" options={ACTION_OPTIONS} value={actions} onChange={setActions} />
      </div>
      {/* Taller than the message, so a static or absolute message has room to center in and `none` shows it hugging */}
      <RNScreen screen minHeight={460}>
        {/* The app screen's top bar, named by the example, as the other examples stand under one */}
        {page ? (
          <Toolbar background="none">
            <Toolbar.Title>{screenTitle}</Toolbar.Title>
          </Toolbar>
        ) : null}
        {/* The space under the bar: a static or absolute message fills it and centers there */}
        <View style={{ flex: 1 }}>
          <EmptyMessage fill={fill} size={size} align={align}>
            {icon && (
              // A compact message gives its icon the compact tile: its own size defaults to the message's
              <EmptyMessage.Icon color={iconColor} size={sizedIcon ? iconSize : undefined}>
                <AllProductsExplore />
              </EmptyMessage.Icon>
            )}
            {title && <EmptyMessage.Title color={titleColor}>No projects yet</EmptyMessage.Title>}
            {shownDescription && <EmptyMessage.Description>Create your first project to get started.</EmptyMessage.Description>}
            {actions !== 'none' && (
              <EmptyMessage.ActionRow>
                <Button color="primary" size={buttonSize}>
                  <Plus />
                  New project
                </Button>
                {actions === 'two' && (
                  <Button color="primary" variant="ghost" size={buttonSize}>
                    Browse templates
                  </Button>
                )}
              </EmptyMessage.ActionRow>
            )}
          </EmptyMessage>
        </View>
      </RNScreen>
    </>
  );
});
