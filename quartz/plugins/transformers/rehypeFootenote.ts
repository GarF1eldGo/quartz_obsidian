import { visit } from "unist-util-visit"

export function rehypeFixFootnoteBackref() {
  return (tree: any) => {
    visit(tree, "element", (node: any) => {
      if (node.tagName !== "a") return

      const classList = node.properties?.className || []

      if (
        Array.isArray(classList) &&
        classList.includes("data-footnote-backref")
      ) {
        node.children = [
          {
            type: "text",
            value: "↩︎",
          },
        ]
      }
    })
  }
}