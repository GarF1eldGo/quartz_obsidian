import { FullSlug, resolveRelative } from "../util/path"
import { QuartzComponent, QuartzComponentConstructor, QuartzComponentProps } from "./types"
import { classNames } from "../util/lang"
import { convertTags, TAG_BG, TAG_COLOR } from "../util/colorfulTags"

const TagList: QuartzComponent = ({ fileData, displayClass }: QuartzComponentProps) => {
  const tags = fileData.frontmatter?.tags
  if (tags && tags.length > 0) {
    const tagList = convertTags(tags)
    return (
      <ul class={classNames(displayClass, "tags")}>
        {tagList.map((tag) => {
          const linkDest = resolveRelative(fileData.slug!, `tags/${tag.content}` as FullSlug)
          return (
            <li>
              <a href={linkDest} class="internal tag-link" style={{
                [TAG_BG]: tag.color?.bg,
                [TAG_COLOR]: tag.color?.color,
              }}>
                {tag.content}
              </a>
            </li>
          )
        })}
      </ul>
    )
  } else {
    return null
  }
}

TagList.css = `
.tags {
  list-style: none;
  display: flex;
  padding-left: 0;
  gap: 0.4rem;
  margin: 1rem 0;
  flex-wrap: wrap;
}

.section-li > .section > .tags {
  justify-content: flex-end;
}
  
.tags > li {
  display: inline-block;
  white-space: nowrap;
  margin: 0;
  overflow-wrap: normal;
}

a.internal.tag-link {
  border-radius: 8px;
  background-color: var(--highlight);
  padding: 0.2rem 0.4rem;
  margin: 0 0.1rem;
}
`

export default (() => TagList) satisfies QuartzComponentConstructor
