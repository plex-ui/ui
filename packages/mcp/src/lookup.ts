// The component lookups of get_component and search_components, apart from the server so tests run them on the
// real manifests.

/** The parts of a manifest component the lookups read. */
export interface Findable {
  slug: string;
  name: string;
  description: string;
  exports?: string[];
  /** Other names the component is exported under (Segmented Control is also `Tabs`, `Tabs.Tab`) */
  aliases?: string[];
  subComponents?: { name: string }[];
  props?: { name: string }[];
}

const normalize = (value: string) => value.toLowerCase().replace(/[-_ .]/g, "");

export function fuzzyMatch(query: string, text: string): boolean {
  return text.toLowerCase().includes(query.toLowerCase());
}

/** A page's title, slug or alias first, then any component it exports or documents (`DataTable` lives on Table,
 *  `DialogTrigger` / `Dialog.Trigger` on Dialog), then the root of a compound part (`Dialog.Trigger`). */
export function findComponent<T extends Findable>(components: T[], name: string): T | undefined {
  const query = normalize(name);
  const byName = (value: string) =>
    components.find(
      (c) =>
        normalize(c.name) === value ||
        c.slug.replace(/-/g, "") === value ||
        c.aliases?.some((alias) => normalize(alias) === value)
    );
  return (
    byName(query) ??
    components.find(
      (c) =>
        c.exports?.some((e) => normalize(e) === query) ||
        c.subComponents?.some((s) => normalize(s.name) === query)
    ) ??
    (name.includes(".") ? byName(normalize(name.split(".")[0])) : undefined)
  );
}

/** Every component whose name, description, slug, export, alias, documented part or prop contains the query. */
export function searchComponents<T extends Findable>(components: T[], query: string): T[] {
  return components.filter(
    (c) =>
      fuzzyMatch(query, c.name) ||
      fuzzyMatch(query, c.description) ||
      fuzzyMatch(query, c.slug) ||
      c.exports?.some((e) => fuzzyMatch(query, e)) ||
      c.aliases?.some((alias) => fuzzyMatch(query, alias)) ||
      c.subComponents?.some((s) => fuzzyMatch(query, s.name)) ||
      c.props?.some((p) => fuzzyMatch(query, p.name))
  );
}
