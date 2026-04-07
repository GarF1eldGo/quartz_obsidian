// @ts-ignore
import clipboardScript from "./scripts/clipboard.inline"
import lightboxScript from "./scripts/lightbox.inline"
import clipboardStyle from "./styles/clipboard.scss"
import { concatenateResources } from "../util/resources"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"

const Body: QuartzComponent = ({ children }: QuartzComponentProps) => {
  return <div id="quartz-body">{children}</div>
}

Body.afterDOMLoaded = concatenateResources(clipboardScript, lightboxScript)
Body.css = clipboardStyle

export default (() => Body) satisfies QuartzComponentConstructor
