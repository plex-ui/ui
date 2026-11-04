import type { Nodes, Root } from 'mdast';
import type { MdxJsxFlowElement, MdxJsxTextElement } from 'mdast-util-mdx-jsx';

/** Give every preview its own identity in both renders of the same MDX page. */
export function remarkPreviewId() {
  return (tree: Root) => {
    let index = 0;

    const visit = (node: Nodes | MdxJsxFlowElement | MdxJsxTextElement) => {
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
      }
      if ('children' in node) node.children.forEach(visit);
    };

    visit(tree);
  };
}
