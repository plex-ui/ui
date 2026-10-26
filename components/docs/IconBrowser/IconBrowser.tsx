'use client';

import {
  cloneElement,
  createElement,
  useEffect,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type ReactElement,
  type SVGProps,
} from 'react';
import { useWindowVirtualizer } from '@tanstack/react-virtual';
import { Button } from '@plexui/ui/components/Button';
import { Download, SearchSm, X } from '@plexui/ui/components/Icon';
import { Switch } from '@plexui/ui/components/Switch';
import type { CatalogIcon, IconCatalog } from './types';
import s from './IconBrowser.module.css';

/** Tile measurements that drive the virtualized grid maths. Must match
 *  the values in IconBrowser.module.css (.Tile aspect-ratio + .Grid gap).
 *  Sizes match lucide.dev/icons: 56px tile, 8px gap. */
const TILE_SIZE = 56;
const GRID_GAP = 8;

/**
 * Lazy catalog loaders — `import()` keeps the per-library icon module
 * out of the docs route's main chunk. Without this Turbopack chokes on
 * compiling `import * as Lucide from 'lucide-react'` (~1.9k icons) every
 * time `/docs/[[...slug]]` is rebuilt.
 */
const CATALOG_LOADERS: Record<string, () => Promise<IconCatalog>> = {
  plex: () => import('./catalogs/plex').then((m) => m.loadPlexCatalog()),
  'plex-filled': () =>
    import('./catalogs/plex').then((m) => m.loadPlexFilledCatalog()),
  lucide: () =>
    import('./catalogs/lucide').then((m) => m.loadLucideCatalog()),
  'lucide-lab': () =>
    import('./catalogs/lucide-lab').then((m) => m.loadLucideLabCatalog()),
  tabler: () => import('./catalogs/tabler').then((m) => m.loadTablerCatalog()),
  'tabler-filled': () =>
    import('./catalogs/tabler-filled').then((m) => m.loadTablerFilledCatalog()),
  hugeicons: () =>
    import('./catalogs/hugeicons').then((m) => m.loadHugeiconsCatalog()),
};

export type IconBrowserLibrary = keyof typeof CATALOG_LOADERS;

export type IconBrowserProps = {
  /** Which icon set to render. */
  library: IconBrowserLibrary;
};

export function IconBrowser({ library }: IconBrowserProps) {
  const [catalog, setCatalog] = useState<IconCatalog | null>(null);
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<CatalogIcon | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const gridContainerRef = useRef<HTMLDivElement>(null);
  const [columns, setColumns] = useState(12);
  const [scrollMargin, setScrollMargin] = useState(0);

  // Recompute the column count whenever the container width changes.
  // The grid uses fixed-size tiles + a fixed gap, so columns =
  // floor((width + gap) / (tile + gap)).
  useLayoutEffect(() => {
    const node = gridContainerRef.current;
    if (!node) return;

    const update = () => {
      const next = Math.max(
        1,
        Math.floor((node.clientWidth + GRID_GAP) / (TILE_SIZE + GRID_GAP))
      );
      setColumns(next);
      // The window virtualizer needs to know how far the grid sits below
      // the document top so visible-row maths line up with `window.scrollY`.
      const rect = node.getBoundingClientRect();
      setScrollMargin(rect.top + window.scrollY);
    };

    update();
    const observer = new ResizeObserver(update);
    observer.observe(node);
    window.addEventListener('resize', update);
    return () => {
      observer.disconnect();
      window.removeEventListener('resize', update);
    };
  }, [catalog]);

  // Load the catalog on mount / library change.
  useEffect(() => {
    let cancelled = false;
    const loader = CATALOG_LOADERS[library];
    if (!loader) return;
    setCatalog(null);
    loader().then((next) => {
      if (!cancelled) setCatalog(next);
    });
    return () => {
      cancelled = true;
    };
  }, [library]);

  const filtered = useMemo(() => {
    if (!catalog) return [];
    const q = query.trim().toLowerCase();
    if (!q) return catalog.icons;
    return catalog.icons.filter((icon) => icon.name.toLowerCase().includes(q));
  }, [catalog, query]);

  const rowCount = Math.ceil(filtered.length / columns);
  const virtualizer = useWindowVirtualizer({
    count: rowCount,
    estimateSize: () => TILE_SIZE + GRID_GAP,
    overscan: 6,
    scrollMargin,
  });

  if (!CATALOG_LOADERS[library]) {
    return null;
  }

  return (
    <div className={s.Root}>
      <div className={s.SearchRow}>
        <div className={s.InputWrap}>
          <SearchSm className={s.InputIcon} />
          <input
            ref={inputRef}
            type="text"
            placeholder={
              catalog
                ? `Search ${catalog.icons.length.toLocaleString()} icons…`
                : 'Loading icons…'
            }
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            className={s.Input}
            aria-label={catalog ? `Search ${catalog.label}` : 'Search'}
            disabled={!catalog}
          />
          {query.length > 0 ? (
            <button
              type="button"
              className={s.ClearButton}
              aria-label="Clear search"
              onClick={() => {
                setQuery('');
                inputRef.current?.focus();
              }}
            >
              <X />
            </button>
          ) : null}
        </div>
        {/* Count is encoded in the input placeholder ("Search 674 icons…") so we
            don't repeat it next to the field — matches lucide.dev/icons. */}
      </div>

      {!catalog ? (
        <div className={s.Grid} aria-busy="true">
          {Array.from({ length: 96 }).map((_, i) => (
            <div key={i} className={s.SkeletonTile} />
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className={s.Empty}>
          <SearchSm className={s.EmptyIcon} />
          <p className={s.EmptyText}>
            No icons match <strong>“{query}”</strong>
          </p>
        </div>
      ) : (
        <div
          ref={gridContainerRef}
          className={s.GridContainer}
          style={{ height: virtualizer.getTotalSize() }}
        >
          {virtualizer.getVirtualItems().map((row) => {
            const start = row.index * columns;
            const end = Math.min(start + columns, filtered.length);
            const slice = filtered.slice(start, end);
            return (
              <div
                key={row.key}
                className={s.GridRow}
                style={{
                  // `top: …px` instead of `transform: translateY(…)`. Transform
                  // promotes the row to its own compositing layer, and on
                  // Chromium that layer can rasterize SVG content at 1× DPR
                  // before scaling — visible as fuzzy edges + uneven stroke
                  // widths within a single Lucide/Tabler icon. `top:` keeps
                  // the row in the document layer, where SVG paints at native
                  // device pixel resolution.
                  top: row.start - virtualizer.options.scrollMargin,
                  // Pin track size to an exact integer so flex/grid math
                  // can't push tile centers onto sub-pixel offsets.
                  gridTemplateColumns: `repeat(${columns}, ${TILE_SIZE}px)`,
                }}
              >
                {slice.map((icon) => (
                  <button
                    key={icon.name}
                    type="button"
                    className={s.Tile}
                    data-icon={icon.name}
                    onClick={() =>
                      setSelected((current) =>
                        current?.name === icon.name ? null : icon
                      )
                    }
                    aria-label={icon.name}
                    aria-pressed={selected?.name === icon.name || undefined}
                  >
                    <IconRender icon={icon} />
                  </button>
                ))}
              </div>
            );
          })}
        </div>
      )}

      <IconDetailPanel
        catalog={catalog}
        selected={selected}
        onClose={() => setSelected(null)}
      />
    </div>
  );
}

/* ── Floating, non-blocking detail panel ─────────────────── */

type IconDetailPanelProps = {
  catalog: IconCatalog | null;
  selected: CatalogIcon | null;
  onClose: () => void;
};

type CopiedAction = 'import' | 'jsx' | 'svg' | null;

/** True if the icon's primary SVG renders via stroke (Lucide / Tabler /
 *  Hugeicons stroke-only). False for fill-based icons (Plex / Lucide
 *  outlined variants) — slider has no effect.
 *
 *  Detection: presence of `stroke="currentColor"`. The root <svg> of
 *  every stroke-based icon carries this attribute. Tabler icons also
 *  contain `<path stroke="none" .../>` as a transparent 24×24 hit-test
 *  rect, which is why the simpler "any stroke attr" check from earlier
 *  was wrong (it would falsely include outlined/fill icons or, with the
 *  inverse `stroke="none"` check, falsely exclude Tabler).
 *
 *  Mixed Hugeicons (stroke + fill in one icon) are pre-filtered by the
 *  build script, so every Hugeicon that reaches the catalog scales
 *  uniformly. */
function isStrokeBased(icon: CatalogIcon): boolean {
  if (!icon.svg) return false;
  return icon.svg.includes('stroke="currentColor"');
}

function IconDetailPanel({ catalog, selected, onClose }: IconDetailPanelProps) {
  const [copied, setCopied] = useState<CopiedAction>(null);
  // Stroke-width starts at 2 (every supported stroke library's default).
  // Reset back to 2 + outlined off whenever the user picks a different
  // icon — otherwise switching icons inherits the previous panel state
  // which is confusing.
  const [strokeWidth, setStrokeWidth] = useState(2);
  const [outlined, setOutlined] = useState(false);
  useEffect(() => {
    setStrokeWidth(2);
    setOutlined(false);
  }, [selected?.name]);

  const flashTimer = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const flash = (action: Exclude<CopiedAction, null>) => {
    clearTimeout(flashTimer.current);
    setCopied(action);
    flashTimer.current = setTimeout(() => setCopied(null), 1500);
  };

  // What the panel state currently means in catalog-builder terms.
  // `strokeWidth: undefined` when it equals the library default (2) so
  // the snippet stays bare (`<Search />` not `<Search strokeWidth={2} />`).
  const buildOpts = useMemo(
    () => ({
      strokeWidth: strokeWidth !== 2 ? strokeWidth : undefined,
      outlined: outlined ? true : undefined,
    }),
    [strokeWidth, outlined]
  );

  const getSvgMarkup = (icon: CatalogIcon): string | null => {
    // Pick stroke vs outlined source. Outlined wins when toggled.
    const baseSvg =
      outlined && icon.outlinedSvg ? icon.outlinedSvg : icon.svg ?? null;
    if (baseSvg) {
      let result = baseSvg;
      // Inject the chosen stroke-width into a stroke icon. No-op for
      // outlined geometry (no stroke-width attr to replace anyway).
      if (!outlined && strokeWidth !== 2) {
        result = result.replace(
          /stroke-width="[^"]+"/g,
          `stroke-width="${strokeWidth}"`
        );
      }
      return result.includes('xmlns=')
        ? result
        : result.replace(
            '<svg ',
            '<svg xmlns="http://www.w3.org/2000/svg" '
          );
    }
    // Plex catalog: lift SVG from the rendered DOM tile.
    const node = document.querySelector(`[data-icon="${icon.name}"] svg`);
    if (!node) return null;
    return node.outerHTML
      .replace(/ aria-hidden="true"/, '')
      .replace('<svg ', '<svg xmlns="http://www.w3.org/2000/svg" ');
  };

  const copy = async (text: string, action: Exclude<CopiedAction, null>) => {
    await writeToClipboard(text);
    flash(action);
  };

  // Esc closes the panel without dimming the grid behind it.
  // Click-outside (anywhere that isn't the panel or another icon tile)
  // also closes — clicking a different tile lets the parent component
  // swap `selected` instead of dismissing. Slider thumb / switch knob
  // dispatch pointerdown inside the panel, so they're caught by the
  // `.Panel` ancestor check below and don't trigger close.
  useEffect(() => {
    if (!selected) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === 'Escape') onClose();
    };
    const onPointerDown = (event: PointerEvent) => {
      const target = event.target as HTMLElement | null;
      if (!target) return;
      if (target.closest(`.${s.Panel}`)) return;
      if (target.closest('[data-icon]')) return;
      onClose();
    };
    document.addEventListener('keydown', onKey);
    document.addEventListener('pointerdown', onPointerDown);
    return () => {
      document.removeEventListener('keydown', onKey);
      document.removeEventListener('pointerdown', onPointerDown);
    };
  }, [selected, onClose]);

  if (!selected || !catalog) return null;

  // Slider applies only to stroke icons in stroke mode. We always
  // render it (greyed out when not applicable) so the panel height
  // stays stable as the user toggles between stroke and outlined.
  // Outlined toggle stays per-catalog: Lucide icons ship `outlinedSvg`
  // companions and get the toggle; other libs hide it entirely.
  const sliderEnabled = isStrokeBased(selected) && !outlined;
  const showOutlinedToggle = Boolean(selected.outlinedSvg);

  return (
    <aside
      // `not-prose` blocks the docs `.plex-docs-body.prose` cascade from
      // applying h3/p/code/etc. margins inside the panel. Without it, the
      // <h3 className={s.PanelName}> inherits prose's `margin-top: 28.8px`
      // even though our CSS module sets `margin: 0` (the prose selector
      // is more specific via `#nd-page.plex-docs-page` ID).
      className={`${s.Panel} not-prose`}
      role="region"
      aria-label={`${selected.name} actions`}
    >
      <button
        type="button"
        className={s.PanelClose}
        onClick={onClose}
        aria-label="Close"
      >
        <X />
      </button>
      <div className={s.PanelPreview} aria-hidden>
        <IconRender
          icon={selected}
          strokeWidth={!outlined ? strokeWidth : undefined}
          outlined={outlined}
        />
        <PixelGrid />
      </div>
      <div className={s.PanelInfo}>
        <h3 className={s.PanelName}>{selected.name}</h3>
        {selected.tags && selected.tags.length > 0 ? (
          <div className={s.PanelTags} aria-label="Tags">
            {selected.tags.map((tag, i) => (
              <span key={`${tag}-${i}`} className={s.PanelTag}>
                {tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className={s.PanelControls}>
          <div
            className={s.PanelSlider}
            data-disabled={!sliderEnabled || undefined}
          >
            <span className={s.PanelSliderLabel}>Stroke</span>
            <input
              type="range"
              className={s.PanelSliderInput}
              min={0.5}
              max={3}
              step={0.25}
              value={strokeWidth}
              onChange={(event) => setStrokeWidth(Number(event.target.value))}
              disabled={!sliderEnabled}
              aria-label="Stroke width"
              // `--progress` drives the Webkit track gradient that
              // paints the filled portion in `--slider-range-color`.
              // Firefox uses native `::-moz-range-progress`; this
              // variable is harmless there.
              style={{
                ['--progress' as string]: `${
                  ((strokeWidth - 0.5) / (3 - 0.5)) * 100
                }%`,
              }}
            />
            <span className={s.PanelSliderValue}>
              {strokeWidth.toFixed(2)} px
            </span>
          </div>
          {showOutlinedToggle ? (
            <label className={s.PanelToggle}>
              <Switch
                checked={outlined}
                onCheckedChange={(checked) => {
                  setOutlined(checked);
                  // Outlined geometry is filled — no stroke to scale.
                  // Reset to the library default (2) so when the user
                  // toggles back to stroke, they get the canonical look
                  // instead of inheriting whatever value was set before
                  // they switched modes.
                  if (checked) setStrokeWidth(2);
                }}
              />
              <span>Outlined</span>
            </label>
          ) : null}
        </div>
        <div className={s.PanelActions}>
          <Button
            variant="solid"
            color="primary"
            onClick={() =>
              copy(catalog.buildImport(selected.name, buildOpts), 'import')
            }
            block
          >
            {copied === 'import' ? 'Copied!' : 'Copy import'}
          </Button>
          <Button
            variant="outline"
            color="secondary"
            onClick={() =>
              copy(catalog.buildJsx(selected.name, buildOpts), 'jsx')
            }
            block
          >
            {copied === 'jsx' ? 'Copied!' : 'Copy JSX'}
          </Button>
          <Button
            variant="outline"
            color="secondary"
            onClick={() => {
              const svg = getSvgMarkup(selected);
              if (svg) copy(svg, 'svg');
            }}
            block
          >
            {copied === 'svg' ? 'Copied!' : 'Copy SVG'}
          </Button>
          <Button
            variant="outline"
            color="secondary"
            onClick={() => {
              const svg = getSvgMarkup(selected);
              if (svg) downloadSvgFile(`${selected.name}.svg`, svg);
            }}
            block
          >
            <Download /> Download
          </Button>
        </div>
      </div>
    </aside>
  );
}

/* ── Pixel grid overlay for the detail panel ─────────────── */

/**
 * 24×24 grid of 1-unit squares drawn via individual `<line>` elements
 * inside an `viewBox="0 0 24 24"` SVG. Lucide.dev uses this trick — the
 * grid scales 1:1 with the icon's own viewBox regardless of the preview
 * box pixel size, so each grid cell always corresponds to exactly one
 * SVG user-unit. Lets the user read off stroke-width and padding values
 * from the lines directly. `stroke-width="0.1"` (= 0.1 user-unit) renders
 * ~1px on screen at the 240px preview size.
 *
 * The grid sits behind the icon via absolute positioning + DOM order.
 */
const GRID_CELLS = Array.from({ length: 23 }, (_, i) => i + 1);

function PixelGrid() {
  return (
    <svg
      className={s.PanelGrid}
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      aria-hidden
    >
      {GRID_CELLS.map((n) => (
        <g key={n}>
          <line x1={n} y1={0} x2={n} y2={24} />
          <line x1={0} y1={n} x2={24} y2={n} />
        </g>
      ))}
    </svg>
  );
}

/* ── Icon renderer (component vs raw SVG) ────────────────── */

/**
 * Renders either a React icon component (Plex catalog) or a raw SVG
 * string parsed into React elements (external catalogs). Parsing happens
 * client-side via DOMParser — same trust boundary as `<svg>` markup we
 * generate at build time, no `dangerouslySetInnerHTML`, no third-party
 * sanitizer needed.
 *
 * Optional `strokeWidth` overrides the SVG's root stroke-width attr
 * (used by the panel slider). Optional `outlined` swaps the icon's
 * primary `svg` for its `outlinedSvg` companion when present (toggle
 * in the panel; only Lucide ships outlined for now).
 */
function IconRender({
  icon,
  strokeWidth,
  outlined,
}: {
  icon: CatalogIcon;
  strokeWidth?: number;
  outlined?: boolean;
}) {
  const useOutlined = Boolean(outlined && icon.outlinedSvg);
  const svgSource = useOutlined ? icon.outlinedSvg! : icon.svg;

  const parsed = useMemo(() => {
    if (icon.Component) return null;
    if (typeof window === 'undefined') return null;
    if (!svgSource) return null;
    return parseSvgString(svgSource);
  }, [icon.Component, svgSource]);

  if (icon.Component) {
    const Component = icon.Component;
    // Plex icons accept passthrough SVG props; strokeWidth on a fill-only
    // icon does nothing visually, but we still pass it through for the
    // rare case a Plex icon does include a stroke.
    return strokeWidth !== undefined && strokeWidth !== 2 ? (
      <Component strokeWidth={strokeWidth} />
    ) : (
      <Component />
    );
  }
  // Override the parsed SVG's root strokeWidth via cloneElement. This
  // is a no-op when `strokeWidth` matches the source default (typically
  // 2) and when outlined is on (no stroke to override).
  if (
    parsed &&
    strokeWidth !== undefined &&
    strokeWidth !== 2 &&
    !useOutlined
  ) {
    return cloneElement(parsed as ReactElement<SVGProps<SVGSVGElement>>, {
      strokeWidth,
    });
  }
  return parsed;
}

/** SVG attributes that need a different name in React's JSX dialect. */
const SVG_ATTR_RENAMES: Record<string, string> = {
  class: 'className',
  'stroke-width': 'strokeWidth',
  'stroke-linecap': 'strokeLinecap',
  'stroke-linejoin': 'strokeLinejoin',
  'stroke-miterlimit': 'strokeMiterlimit',
  'stroke-dasharray': 'strokeDasharray',
  'stroke-dashoffset': 'strokeDashoffset',
  'fill-rule': 'fillRule',
  'clip-rule': 'clipRule',
  'fill-opacity': 'fillOpacity',
  'stroke-opacity': 'strokeOpacity',
  'xmlns:xlink': 'xmlnsXlink',
  'xlink:href': 'xlinkHref',
};

function elementToReact(node: Element, key: number = 0): ReactElement {
  const props: Record<string, string | number> = { key };
  for (const attr of Array.from(node.attributes)) {
    const name = SVG_ATTR_RENAMES[attr.name] ?? attr.name;
    props[name] = attr.value;
  }
  const children = Array.from(node.children).map((child, i) =>
    elementToReact(child, i)
  );
  return createElement(node.tagName.toLowerCase(), props, ...children);
}

function parseSvgString(svgString: string): ReactElement | null {
  try {
    const doc = new DOMParser().parseFromString(svgString, 'image/svg+xml');
    const svgEl = doc.querySelector('svg');
    if (!svgEl || doc.querySelector('parsererror')) return null;
    return elementToReact(svgEl);
  } catch {
    return null;
  }
}

/* ── Helpers ──────────────────────────────────────────────── */

async function writeToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Fallback for non-https / older browsers.
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function downloadSvgFile(filename: string, svg: string) {
  const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = filename;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(url);
}
