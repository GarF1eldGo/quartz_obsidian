---
created: 2026-04-07T15:30
updated: 2026-04-07T16:26
---
# 1. 功能
点击文档中的图片，图片放大至全屏，并可以左右切换、放大图片。

# 2. 原理
选择[Simplelightbox](https://github.com/andreknieriem/simplelightbox)第三方库来实现灯箱效果。我只负责在quartz项目中引入该库
引入原理：
1. 为所有的`img`元素，包裹一层`a`父元素，以适配该插件
2. 在html的head中，通过cdn链接的方式，导入该库
3. 在DOMContentLoaded之后，注入JS代码，运行该库

### 2.1 为img添加父元素
通过`visit`hook，在`rehype`阶段遍历img元素，修改img元素的信息，代码如下所示：
```js {13-21}
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
```

### 2.2 引入Simplelightbox库
单独为`addtionalHead`添加下列信息，导入库的js与css代码
```js
additionalHead: [
  () => (
    <link
      rel="stylesheet"
      href="https://cdn.jsdelivr.net/npm/simplelightbox/dist/simple-lightbox.min.css"
    />
  ),
  () => (
    <script src="https://cdn.jsdelivr.net/npm/simplelightbox/dist/simple-lightbox.min.js"></script>
  ),
  ...staticResources.additionalHead
]
```

### 2.3 运行该库
由于SPA切换页面，需要绑定新的DOM对象，故代码如下：
```js
let lightbox = null;

document.addEventListener("nav", () => {
  setTimeout(() => {
    if (!lightbox) {
      lightbox = new SimpleLightbox('a.lightbox', {
        fileExt: 'png|jpg|jpeg|gif|svg', // 支持svg图片
      })
    } else {
      lightbox.refresh()
    }
  }, 50)
})
```

> [!warning] **点击事件劫持**
> 在spa.inline.ts文件中，quartz主动劫持了click事件。为了让simple lightbox功能正常运行，需要过滤掉lightbox元素，让quartz不处理相关元素的点击事件

```js
window.addEventListener("click", async (event) => {
      const { url } = getOpts(event) ?? {}
      const target = event.target as HTMLElement
      const anchor = target.closest("a")

      // dont hijack behaviour, just let browser act normally
      if (!url || event.ctrlKey || event.metaKey || anchor?.classList.contains("lightbox")) return
      event.preventDefault()
  
      // 其他逻辑
  }
```

> [!warning] **点击后下载图片问题**
> 若引入图片的链接，是一个外部的下载链接，那么就会直接下载图片，而不会运行lightbox效果。因为我在项目中添加了a元素标签。对于这些图片，需要修改其链接为普通图片

