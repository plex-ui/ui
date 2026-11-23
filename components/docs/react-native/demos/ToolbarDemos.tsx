import { useState, type ReactNode } from 'react';
import { Button, IconButton, Input, List, ListItem, NavigationButton, SegmentedControl, Toolbar, useTheme } from '@plexui/react-native';
import { DotsHorizontal, DotsVertical, Filter, Plus, PlusLg, Search, SearchSm, Share, ShareAndroid, Tag } from '@plexui/react-native/icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import { DemoControlBoolean, Segments, controlsTableStyle } from '../../ButtonDemos';
import { DemoControlsBottom } from '../../PreviewEmbed';
import { ORDER_FORM, orderDetail, ordersIn, type OrderView } from '../../toolbarOrders';
import { RNScreen, docsDemo, useScreenCanvas } from '../RNScreen';
import { useNativePlatform } from '../platform';

// The docs see react-native and @plexui/react-native untyped (types/plexui-react-native.d.ts): the shapes used here
type ScrollEvent = { nativeEvent: { contentOffset: { y: number } } };
type LayoutEvent = { nativeEvent: { layout: { height: number } } };
type ToolbarTitleAlign = 'center' | 'start';

/**
 * A phone page, as the React examples' Page draws one: the top bar over the content, the content scrolling under it 16
 * from the screen's edges, and a bottom bar over the content's end. Each bar is told whether content is under it, for
 * its `scrolled`: under the top bar once the content has scrolled, under the bottom one while it continues below.
 *
 * `largeTitleRows` says the top bar has a large title with rows under it (`search` when the last is a search field).
 * The React Page sets those rows at the start of the content and starts the content 16 under them, 10 under a search
 * field (Page.module.css, .LargeTitleRows); a React Native bar keeps them, and 10 under them, so on iOS the content
 * starts as far under the bar as the React content does under the rows. Android's large app bar keeps its 16.
 */
export function PhonePage({
  top,
  bottom,
  onScroll,
  largeTitleRows,
  children,
}: {
  top?: (scrolled: boolean, canvas?: string) => ReactNode;
  bottom?: (scrolled: boolean, canvas?: string) => ReactNode;
  onScroll?: (event: ScrollEvent) => void;
  largeTitleRows?: 'search' | 'rows';
  children?: ReactNode;
}) {
  const theme = useTheme();
  // The bars' scroll edges take the screen's color (a grouped screen's is not the theme's background)
  const canvas = useScreenCanvas();
  const rowGap = theme.length('--toolbar-row-gap', 10);
  const contentGap =
    theme.isAndroid ? 12 : largeTitleRows ? (largeTitleRows === 'search' ? rowGap : 16) - theme.length('--toolbar-padding-bottom', 10) : 16;
  // The space after the content, the React Page's (--page-content-padding-bottom); Android's lists end 12 above a bar
  const contentEnd = theme.isAndroid ? 12 : theme.length('--page-content-padding-bottom', 48);
  const [topHeight, setTopHeight] = useState(0);
  const [bottomHeight, setBottomHeight] = useState(0);
  const [offset, setOffset] = useState(0);
  const [frame, setFrame] = useState(0);
  const [content, setContent] = useState(0);
  const height = (set: (value: number) => void) => (event: LayoutEvent) => set(event.nativeEvent.layout.height);
  const handleScroll = (event: ScrollEvent) => {
    setOffset(event.nativeEvent.contentOffset.y);
    onScroll?.(event);
  };
  return (
    // The page fills the screen and scrolls inside it: in flow, the docs stage would grow to the list's height
    <View style={StyleSheet.absoluteFill}>
      <ScrollView
        style={{ flex: 1 }}
        onScroll={handleScroll}
        scrollEventThrottle={16}
        onLayout={height(setFrame)}
        onContentSizeChange={(_: number, contentHeight: number) => setContent(contentHeight)}
        contentContainerStyle={{
          paddingTop: topHeight + contentGap,
          // Android's sections stand 12 from the screen's edges
          paddingHorizontal: theme.isAndroid ? 12 : 16,
          paddingBottom: bottomHeight + contentEnd,
        }}
      >
        {children}
      </ScrollView>
      {top ? (
        <View pointerEvents="box-none" onLayout={height(setTopHeight)} style={{ position: 'absolute', top: 0, left: 0, right: 0 }}>
          {top(offset > 0, canvas)}
        </View>
      ) : null}
      {bottom ? (
        <View pointerEvents="box-none" onLayout={height(setBottomHeight)} style={{ position: 'absolute', bottom: 0, left: 0, right: 0 }}>
          {bottom(offset + frame < content - 1, canvas)}
        </View>
      ) : null}
    </View>
  );
}

/** Orders in the rows of a List, as the React examples set them in a FieldGroup; `view` shows those of one status */
export function Rows({ view = 'all' }: { view?: OrderView }) {
  return (
    <List>
      {ordersIn(view).map((order) => (
        <ListItem key={order.number} label={order.customer} description={orderDetail(order)} value={order.total} />
      ))}
    </List>
  );
}

/** The rows of the New order form: its customer, items and delivery */
function FormRows() {
  return (
    <List>
      {ORDER_FORM.map((row) => (
        <ListItem key={row.label} label={row.label} value={row.value} />
      ))}
    </List>
  );
}

/**
 * The bar backgrounds the React page offers that the React Native bars draw: `blur` has no React Native equivalent.
 * iOS only: Android's bars take Material's containers. (A demo module exports components only: demos/index.ts.)
 */
const BAR_BACKGROUNDS = ['soft', 'hard', 'glass'] as const;
type BarBackground = (typeof BAR_BACKGROUNDS)[number];

const TITLE_STYLES = ['inline', 'large'] as const;
const TITLE_ALIGNS = ['center', 'start'] as const satisfies readonly ToolbarTitleAlign[];
const SEARCH = ['none', 'row', 'button'] as const;
const FIELDS = ['top', 'bottom'] as const;
const ROW_SIZES = ['sm', 'md', 'lg'] as const;
const BOTTOM = ['none', 'buttons', 'search', 'action'] as const;

/** An inline title stands centered until the reader picks, on iOS and in Android's bars */
function useTitleAlign() {
  const [titleAlign, setTitleAlign] = useState<ToolbarTitleAlign>('center');
  return [titleAlign, setTitleAlign] as const;
}

/**
 * The search field. An open search on Android is a back button and a `bare` field, no magnifier; the field waiting
 * in a row keeps it.
 */
function SearchField({ autoFocus = false, onFocus, bare = false }: { autoFocus?: boolean; onFocus?: () => void; bare?: boolean }) {
  return (
    <Input
      variant="soft"
      pill
      autoFocus={autoFocus}
      onFocus={onFocus}
      placeholder="Search"
      accessibilityLabel="Search orders"
      startAdornment={bare ? undefined : <SearchSm />}
    />
  );
}

/**
 * The Overview, with every setting of the bars, as the React page's: where the search waits (a field in a row under
 * the controls, or a Search button) and where a Search button opens its field, the title, its style, alignment and
 * subtitle, a group of actions, a segmented row and its size, what the bottom bar holds, and each bar's background.
 */
export const Overview = docsDemo(function Overview() {
  const android = useNativePlatform() === 'android';
  const [search, setSearch] = useState<(typeof SEARCH)[number]>('none');
  const [searching, setSearching] = useState(false);
  const [field, setField] = useState<(typeof FIELDS)[number]>('top');
  const [title, setTitle] = useState(true);
  const [titleStyle, setTitleStyle] = useState<(typeof TITLE_STYLES)[number]>('inline');
  const [titleAlign, setTitleAlign] = useTitleAlign();
  const [subtitle, setSubtitle] = useState(false);
  const [group, setGroup] = useState(false);
  const [segmented, setSegmented] = useState(false);
  const [rowSize, setRowSize] = useState<(typeof ROW_SIZES)[number]>('md');
  const [view, setView] = useState<OrderView>('all');
  const [topBackgroundPick, setTopBackground] = useState<BarBackground>();
  // iOS 26's glass top bar, Android's soft edge, until the reader picks
  const topBackground = topBackgroundPick ?? (android ? 'soft' : 'glass');
  const [bottom, setBottom] = useState<(typeof BOTTOM)[number]>('none');
  const [bottomBackground, setBottomBackground] = useState<BarBackground>('soft');
  // The open search: its field takes the place of the title and the bar's buttons, with Close next to it
  const open = searching && search !== 'none';
  // Or a field at the bottom with Close: the top bar's buttons and title go and a segmented row moves up
  const below = open && search === 'button' && field === 'bottom';
  const named = !open && title;
  // One search to a screen: with one in the top bar, the bottom bar offers neither its own field nor its Search button
  const topSearch = search !== 'none';
  const bottomOptions = topSearch ? BOTTOM.filter((option) => option !== 'search') : BOTTOM;
  const shownBottom = (topSearch && bottom === 'search') || (android && bottom === 'buttons') ? 'none' : bottom;
  const chooseSearch = (value: (typeof SEARCH)[number]) => {
    setSearch(value);
    setSearching(false);
  };
  const chooseField = (value: (typeof FIELDS)[number]) => {
    setField(value);
    setSearching(false);
  };
  // iOS closes the search with Close after its field, Android goes back before it
  const closeSearch = <NavigationButton action="close" accessibilityLabel="Close search" onPress={() => setSearching(false)} />;
  const backFromSearch = (
    <Toolbar.Leading>
      <NavigationButton action="back" accessibilityLabel="Close search" onPress={() => setSearching(false)} />
    </Toolbar.Leading>
  );

  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {/* On Android a field in a row is the one a list screen keeps under its bar, a Search button its bar's item */}
        <Segments name="search" options={SEARCH} value={search} onChange={chooseSearch} />
        {search === 'button' && <Segments name="field (search)" options={FIELDS} value={field} onChange={chooseField} />}
        <DemoControlBoolean name="title" value={title} onChange={setTitle} />
        {/* Android has no large title: its bars keep the title in the row */}
        {title && !android && <Segments name="titleStyle" options={TITLE_STYLES} value={titleStyle} onChange={setTitleStyle} />}
        {title && (titleStyle === 'inline' || android) && (
          <Segments name="titleAlign" options={TITLE_ALIGNS} value={titleAlign} onChange={setTitleAlign} />
        )}
        {title && <DemoControlBoolean name="subtitle" value={subtitle} onChange={setSubtitle} />}
        <DemoControlBoolean name="group" value={group} onChange={setGroup} />
        <DemoControlBoolean name="segmented" value={segmented} onChange={setSegmented} />
        {segmented && <Segments name="size (row)" options={ROW_SIZES} value={rowSize} onChange={setRowSize} />}
        <Segments name="background (top)" options={BAR_BACKGROUNDS} value={topBackground} onChange={setTopBackground} />
      </div>
      <RNScreen screen grouped minHeight={640}>
        <PhonePage
          largeTitleRows={named && titleStyle === 'large' ? (segmented ? 'rows' : search === 'row' ? 'search' : undefined) : undefined}
          top={(scrolled, canvas) => (
            <Toolbar
              titleStyle={named ? titleStyle : undefined}
              titleAlign={named && (titleStyle === 'inline' || android) ? titleAlign : undefined}
              background={topBackground}
              scrolled={scrolled}
              canvasColor={canvas}
            >
              {open ? (
                !below && (
                  <>
                    {android && backFromSearch}
                    <Toolbar.Content fill>
                      <SearchField autoFocus bare={android} />
                    </Toolbar.Content>
                  </>
                )
              ) : (
                <>
                  <Toolbar.Leading>
                    <NavigationButton action="back" />
                  </Toolbar.Leading>
                  {named && <Toolbar.Title subtitle={subtitle ? '24 orders' : undefined}>Orders</Toolbar.Title>}
                </>
              )}
              {!below && !(open && android) && (
                <Toolbar.Trailing>
                  {open ? (
                    closeSearch
                  ) : (
                    <>
                      {search === 'button' && <IconButton icon={<Search />} accessibilityLabel="Search" onPress={() => setSearching(true)} />}
                      {group ? (
                        <Toolbar.Group aria-label="Order actions">
                          <IconButton icon={android ? <ShareAndroid /> : <Share />} accessibilityLabel="Share" />
                          <IconButton icon={android ? <DotsVertical /> : <DotsHorizontal />} accessibilityLabel="More" />
                        </Toolbar.Group>
                      ) : (
                        <IconButton icon={android ? <DotsVertical /> : <DotsHorizontal />} accessibilityLabel="More" />
                      )}
                    </>
                  )}
                </Toolbar.Trailing>
              )}
              {/* A tap on the field opens the search */}
              {search === 'row' && !open && (
                <Toolbar.Row>
                  <SearchField onFocus={() => setSearching(true)} />
                </Toolbar.Row>
              )}
              {segmented && (
                <Toolbar.Row>
                  <SegmentedControl aria-label="Orders" size={rowSize} value={view} onChange={setView} block>
                    <SegmentedControl.Tab value="all">All</SegmentedControl.Tab>
                    <SegmentedControl.Tab value="paid">Paid</SegmentedControl.Tab>
                    <SegmentedControl.Tab value="unpaid" badge={{ content: 3 }}>
                      Unpaid
                    </SegmentedControl.Tab>
                    <SegmentedControl.Tab value="refunded">Refunds</SegmentedControl.Tab>
                  </SegmentedControl>
                </Toolbar.Row>
              )}
            </Toolbar>
          )}
          bottom={
            below || shownBottom !== 'none'
              ? (scrolled, canvas) =>
                  below ? (
                    // The bottom bar's background, or the soft edge when the screen has no bottom bar
                    <Toolbar
                      placement="bottom"
                      background={shownBottom === 'none' ? 'soft' : bottomBackground}
                      scrolled={scrolled}
                      canvasColor={canvas}
                    >
                      {android && backFromSearch}
                      <Toolbar.Content fill>
                        <SearchField autoFocus bare={android} />
                      </Toolbar.Content>
                      {!android && <Toolbar.Trailing>{closeSearch}</Toolbar.Trailing>}
                    </Toolbar>
                  ) : (
                    <Toolbar placement="bottom" background={bottomBackground} scrolled={scrolled} canvasColor={canvas}>
                      {shownBottom === 'buttons' ? (
                        <>
                          <Toolbar.Leading>
                            <IconButton icon={<Filter />} accessibilityLabel="Filter" />
                          </Toolbar.Leading>
                          <Toolbar.Content>
                            <Button color="primary">New order</Button>
                          </Toolbar.Content>
                          {/* With a search field in the top bar, no second way to search */}
                          {!topSearch && (
                            <Toolbar.Trailing>
                              <IconButton icon={<Search />} accessibilityLabel="Search" />
                            </Toolbar.Trailing>
                          )}
                        </>
                      ) : shownBottom === 'search' ? (
                        <>
                          <Toolbar.Content fill>
                            <SearchField />
                          </Toolbar.Content>
                          <Toolbar.Trailing>
                            <IconButton icon={<PlusLg />} iconSize="sm" accessibilityLabel="New order" />
                          </Toolbar.Trailing>
                        </>
                      ) : (
                        <Toolbar.Content fill>
                          <Button color="primary" block>
                            <Plus />
                            New order
                          </Button>
                        </Toolbar.Content>
                      )}
                    </Toolbar>
                  )
              : undefined
          }
        >
          {/* The segmented row shows the orders of its view */}
          <Rows view={segmented ? view : 'all'} />
        </PhonePage>
      </RNScreen>
      {/* The bottom bar's controls stand under the preview, on its side */}
      <DemoControlsBottom style={controlsTableStyle}>
        <Segments
          name="bottom"
          options={android ? bottomOptions.filter((option) => option !== 'buttons') : bottomOptions}
          value={shownBottom}
          onChange={setBottom}
        />
        {shownBottom !== 'none' && (
          <Segments name="background (bottom)" options={BAR_BACKGROUNDS} value={bottomBackground} onChange={setBottomBackground} />
        )}
      </DemoControlsBottom>
    </>
  );
});

/**
 * A search field in a row under the title: under a large title on iOS, in the bar with an inline one. On Android the
 * row is the field a list screen keeps under its bar, a 40dp pill; Android has no large title, so the title stays
 * in the bar's row.
 */
export const SearchUnderTitle = docsDemo(function SearchUnderTitle() {
  const android = useNativePlatform() === 'android';
  const [query, setQuery] = useState('');
  const [titleStylePick, setTitleStyle] = useState<(typeof TITLE_STYLES)[number]>('large');
  const titleStyle = android ? 'inline' : titleStylePick;
  const [titleAlign, setTitleAlign] = useTitleAlign();
  const [subtitle, setSubtitle] = useState(false);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        {!android && <Segments name="titleStyle" options={TITLE_STYLES} value={titleStyle} onChange={setTitleStyle} />}
        {titleStyle === 'inline' && <Segments name="titleAlign" options={TITLE_ALIGNS} value={titleAlign} onChange={setTitleAlign} />}
        <DemoControlBoolean name="subtitle" value={subtitle} onChange={setSubtitle} />
      </div>
      <RNScreen screen grouped minHeight={640}>
        <PhonePage
          largeTitleRows={titleStyle === 'large' ? 'search' : undefined}
          top={(scrolled, canvas) => (
            <Toolbar titleStyle={titleStyle} titleAlign={titleStyle === 'inline' ? titleAlign : undefined} scrolled={scrolled} canvasColor={canvas}>
              <Toolbar.Title subtitle={subtitle ? '24 orders' : undefined}>Orders</Toolbar.Title>
              <Toolbar.Trailing>
                <IconButton icon={android ? <DotsVertical /> : <DotsHorizontal />} accessibilityLabel="More" />
              </Toolbar.Trailing>
              <Toolbar.Row>
                <Input
                  variant="soft"
                  pill
                  inputMode="search"
                  returnKeyType="search"
                  placeholder="Search"
                  accessibilityLabel="Search orders"
                  startAdornment={<SearchSm />}
                  value={query}
                  onChangeText={setQuery}
                  onClear={() => setQuery('')}
                />
              </Toolbar.Row>
            </Toolbar>
          )}
        >
          <Rows />
        </PhonePage>
      </RNScreen>
    </>
  );
});

/**
 * A form's bars with disabled actions: Confirm, a prominent action, an icon button and one of a group. Android
 * forms lead with Back and confirm with Save, so there the form goes back where iOS writes Cancel and saves with a
 * label where iOS shows the check.
 */
export const Disabled = docsDemo(function Disabled() {
  const android = useNativePlatform() === 'android';
  const [disabled, setDisabled] = useState(true);
  return (
    <>
      <div data-demo-controls style={controlsTableStyle}>
        <DemoControlBoolean name="disabled" value={disabled} onChange={setDisabled} />
      </div>
      <RNScreen screen grouped minHeight={640}>
        <PhonePage
          top={(scrolled, canvas) => (
            <Toolbar scrolled={scrolled} canvasColor={canvas}>
              <Toolbar.Leading>{android ? <NavigationButton action="back" /> : <Button variant="ghost">Cancel</Button>}</Toolbar.Leading>
              <Toolbar.Title>New order</Toolbar.Title>
              <Toolbar.Trailing>
                {/* Android confirms a form with Save, a label in the bar's glass capsule, no accent */}
                {android ? (
                  <Button variant="ghost" disabled={disabled}>
                    Save
                  </Button>
                ) : (
                  <NavigationButton action="confirm" disabled={disabled} />
                )}
              </Toolbar.Trailing>
            </Toolbar>
          )}
          bottom={(scrolled, canvas) =>
            android ? (
              // Android's main action at the bottom of a form: one wide button
              <Toolbar placement="bottom" scrolled={scrolled} canvasColor={canvas}>
                <Toolbar.Content fill>
                  <Button color="primary" block disabled={disabled}>
                    Place order
                  </Button>
                </Toolbar.Content>
              </Toolbar>
            ) : (
              <Toolbar placement="bottom" scrolled={scrolled} canvasColor={canvas}>
                <Toolbar.Leading>
                  <IconButton icon={<Tag />} accessibilityLabel="Add discount" disabled={disabled} />
                </Toolbar.Leading>
                <Toolbar.Content>
                  <Button color="primary" disabled={disabled}>
                    Place order
                  </Button>
                </Toolbar.Content>
                <Toolbar.Trailing>
                  <Toolbar.Group aria-label="Order actions">
                    <IconButton icon={<Share />} accessibilityLabel="Share" disabled={disabled} />
                    <IconButton icon={android ? <DotsVertical /> : <DotsHorizontal />} accessibilityLabel="More" />
                  </Toolbar.Group>
                </Toolbar.Trailing>
              </Toolbar>
            )
          }
        >
          <FormRows />
        </PhonePage>
      </RNScreen>
    </>
  );
});
