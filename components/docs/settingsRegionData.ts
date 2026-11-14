import { COUNTRY_SECTIONS } from './indexBarData';

export const initialRegion = 'Spain';

/** The sections whose names hold the query, each with only those names */
export function filterRegions(query: string) {
  const needle = query.trim().toLocaleLowerCase();
  if (!needle) return COUNTRY_SECTIONS;
  return COUNTRY_SECTIONS
    .map(({ letter, names }) => ({ letter, names: names.filter((name) => name.toLocaleLowerCase().includes(needle)) }))
    .filter(({ names }) => names.length > 0);
}

/** Brings a letter's section to the top of the sheet's list at once, as a native index jumps */
export function jumpToRegion(list: unknown, letter: string) {
  const element = list instanceof HTMLElement ? list : (list as { $el?: unknown } | null | undefined)?.$el;
  if (!(element instanceof HTMLElement)) return;
  element.querySelector<HTMLElement>(`[data-section="${CSS.escape(letter)}"]`)?.scrollIntoView({ block: 'start' });
}
