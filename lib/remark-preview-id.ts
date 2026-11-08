import type { Nodes, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

type Node = Nodes | MdxJsxFlowElement | MdxJsxTextElement;

/** The text of a heading, as the table of contents shows it. */
function textOf(node: Node): string {
  if ('value' in node && typeof node.value === 'string') return node.value;
  if ('children' in node) return (node.children as Node[]).map(textOf).join('');
  return '';
}

/** Give every preview its own identity in both renders of the same MDX page, and the heading of its section: the
 * Phone view names the example with it in the screen's top bar. */
export function remarkPreviewId() {
  return (tree: Root) => {
    let index = 0;
    let heading: string | undefined;

    const visit = (node: Node) => {
      if (node.type === 'heading' && node.depth >= 2) heading = textOf(node).trim() || heading;
      if (
        (node.type === 'mdxJsxFlowElement' || node.type === 'mdxJsxTextElement') &&
        node.name === 'ComponentPreview'
      ) {
        // Source order is independent of duplicate snippets, component names,
        // minification and the different React trees of docs and iframe pages.
        node.attributes = node.attributes.filter(
          (attribute) => attribute.type !== 'mdxJsxAttribute' || attribute.name !== 'previewId',
        );
        node.attributes.push({
          type: 'mdxJsxAttribute',
          name: 'previewId',
          value: `preview-${++index}`,
        });
        const titled = node.attributes.some((attribute) => attribute.type === 'mdxJsxAttribute' && attribute.name === 'previewTitle');
        if (heading && !titled) node.attributes.push({ type: 'mdxJsxAttribute', name: 'previewTitle', value: heading });
      }
      if ('children' in node) (node.children as Node[]).forEach(visit);
    };

    visit(tree);
  };
}
