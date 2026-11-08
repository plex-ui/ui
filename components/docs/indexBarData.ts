/** Countries by first letter, for the IndexBar examples (React and Vue). */
export const COUNTRY_SECTIONS: { letter: string; names: string[] }[] = [
  { letter: 'A', names: ['Argentina', 'Australia', 'Austria'] },
  { letter: 'B', names: ['Belgium', 'Brazil', 'Bulgaria'] },
  { letter: 'C', names: ['Canada', 'Chile', 'Croatia'] },
  { letter: 'D', names: ['Denmark', 'Dominican Republic'] },
  { letter: 'E', names: ['Ecuador', 'Egypt', 'Estonia'] },
  { letter: 'F', names: ['Fiji', 'Finland', 'France'] },
  { letter: 'G', names: ['Germany', 'Ghana', 'Greece'] },
  { letter: 'H', names: ['Honduras', 'Hungary'] },
  { letter: 'I', names: ['Iceland', 'India', 'Ireland', 'Italy'] },
  { letter: 'J', names: ['Jamaica', 'Japan', 'Jordan'] },
  { letter: 'K', names: ['Kenya', 'Kuwait'] },
  { letter: 'L', names: ['Latvia', 'Lithuania', 'Luxembourg'] },
  { letter: 'M', names: ['Malta', 'Mexico', 'Morocco'] },
  { letter: 'N', names: ['Netherlands', 'New Zealand', 'Norway'] },
  { letter: 'O', names: ['Oman'] },
  { letter: 'P', names: ['Panama', 'Peru', 'Poland', 'Portugal'] },
  { letter: 'Q', names: ['Qatar'] },
  { letter: 'R', names: ['Romania', 'Rwanda'] },
  { letter: 'S', names: ['Singapore', 'Slovenia', 'Spain', 'Sweden'] },
  { letter: 'T', names: ['Thailand', 'Tunisia', 'Türkiye'] },
  { letter: 'U', names: ['Uganda', 'Ukraine', 'Uruguay'] },
  { letter: 'V', names: ['Vanuatu', 'Vietnam'] },
  { letter: 'Y', names: ['Yemen'] },
  { letter: 'Z', names: ['Zambia', 'Zimbabwe'] },
];

export const COUNTRY_LETTERS = COUNTRY_SECTIONS.map((section) => section.letter);

/**
 * Scrolls the content of a Page to a section at once, as a native index jumps: the section's top meets the top of
 * the content box, under the bar. Takes the Page.Content element, or the Vue PageContent instance.
 */
export function jumpToSection(content: unknown, item: string) {
  const element = content instanceof HTMLElement ? content : (content as { $el?: unknown } | null | undefined)?.$el;
  if (!(element instanceof HTMLElement)) return;
  const section = element.querySelector<HTMLElement>(`[data-section="${CSS.escape(item)}"]`);
  if (!section) return;
  const padding = parseFloat(getComputedStyle(element).paddingTop) || 0;
  element.scrollTop += section.getBoundingClientRect().top - element.getBoundingClientRect().top - padding;
}
