/**
 * @file 彩色tag生成插件
 */

import { QuartzTransformerPlugin } from "../types"
import colorTagScript from '../../components/scripts/colorfulTags.inline'

export function ColorfulTag(): QuartzTransformerPlugin {
  return {
    name: "ColorfulTag",

    externalResources() {
      return {
        js: [
          {
            loadTime: "afterDOMReady",
            contentType: "inline",
            script: colorTagScript
          },
        ]
      }
    },
  }
}