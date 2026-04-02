

function applyTagColors() {
    document.querySelectorAll(".tag-link").forEach(el => {
        const text = el.textContent || ""
        const raw = text.replace(/^#/, "")

        const [main, sub] = raw.split("/")

        const color = getColor(main, sub)

        el.style.setProperty("--tag-bg", color.bg)
        el.style.setProperty("--tag-color", color.color)
    })
}

// Quartz SPA 必须监听这个
document.addEventListener("nav", applyTagColors)

// 首次加载
document.addEventListener("DOMContentLoaded", applyTagColors)