/**
 * @file rehype阶段，为img元素，包裹a标签，以适配simple lightbox库
 */

import { visit } from "unist-util-visit"

function rehypeWrapImages() {
  return (tree: any) => {
    visit(tree, "element", (node: any, index: number, parent: any) => {
      if (node.tagName === "img" && parent) {
        const src = node.properties?.src

        const linkNode = {
          type: "element",
          tagName: "a",
          properties: {
            href: src,
            className: ["lightbox"],
          },
          children: [node],
        }

        parent.children[index] = linkNode
      }
    })
  }
}

const rehypeWrapImagesPlugin = () => ({
    name: "rehypeWrapImages",
    htmlPlugins() {
      return [rehypeWrapImages]
    }
});

export {rehypeWrapImagesPlugin};