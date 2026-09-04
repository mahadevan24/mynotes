import type { Root, RootContent, Paragraph } from "mdast";
import { visit } from "unist-util-visit";

/** Keep editor line breaks without changing Markdown syntax or code blocks. */
export function remarkPreserveLines() {
  return (tree: Root, file: { value: unknown }) => {
    visit(tree, "text", (node, index, parent) => {
      if (!parent || index === undefined || !/[\r\n]/.test(node.value)) return;
      const lines = node.value.split(/\r\n|\r|\n/);
      const replacement = lines.flatMap((value, i) =>
        i === 0
          ? [{ type: "text" as const, value }]
          : [{ type: "break" as const }, { type: "text" as const, value }]
      );
      parent.children.splice(index, 1, ...replacement);
      return index + replacement.length;
    });

    const children: RootContent[] = [];
    const spacer = (lines: number): Paragraph => ({
      type: "paragraph",
      children: [],
      data: {
        hName: "div",
        hProperties: { "aria-hidden": "true", style: `height: ${lines}lh` },
      },
    });
    let previousEnd = 0;
    for (const child of tree.children) {
      const start = child.position?.start.line;
      if (start !== undefined && start - previousEnd > 1) {
        children.push(spacer(start - previousEnd - 1));
      }
      children.push(child);
      previousEnd = child.position?.end.line ?? previousEnd;
    }
    const lastLine = String(file.value).split(/\r\n|\r|\n/).length;
    if (previousEnd > 0 && lastLine > previousEnd) {
      children.push(spacer(lastLine - previousEnd));
    }
    tree.children = children;
  };
}
