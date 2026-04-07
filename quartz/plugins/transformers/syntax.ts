import { QuartzTransformerPlugin } from "../types"
import rehypePrettyCode, { Options as CodeOptions, Theme as CodeTheme } from "rehype-pretty-code"
import { visit } from "unist-util-visit"

interface Theme extends Record<string, CodeTheme> {
  light: CodeTheme
  dark: CodeTheme
}

interface Options {
  theme?: Theme
  keepBackground?: boolean
}

const defaultOptions: Options = {
  theme: {
    light: "github-light",
    dark: "github-dark",
  },
  keepBackground: false,
}


// 将代码块的语言名称转换为小写
function rehypeLowercaseLang() {
  return (tree: any) => {
    visit(tree, "element", (node: any) => {
      if (node.tagName === "code" && node.properties?.className) {
        node.properties.className = node.properties.className.map((cls: string) => {
          if (cls.startsWith("language-")) {
            const lang = cls.replace("language-", "")
            return `language-${lang.toLowerCase()}`
          }
          return cls
        })
      }
    })
  }
}

export const SyntaxHighlighting: QuartzTransformerPlugin<Partial<Options>> = (userOpts) => {
  const opts: CodeOptions = { ...defaultOptions, ...userOpts }

  return {
    name: "SyntaxHighlighting",
    htmlPlugins() {
      return [[rehypeLowercaseLang], [rehypePrettyCode, opts]]
    },
  }
}
