const palette = [
    { bg: "#e57373", color: "#ffffff" },
    { bg: "#f06292", color: "#ffffff" },
    { bg: "#ba68c8", color: "#ffffff" },
    { bg: "#9575cd", color: "#ffffff" },
    { bg: "#7986cb", color: "#ffffff" },
    { bg: "#64b5f6", color: "#ffffff" },
    { bg: "#4fc3f7", color: "#000000" },
    { bg: "#4dd0e1", color: "#000000" },
    { bg: "#4db6ac", color: "#000000" },
    { bg: "#81c784", color: "#000000" },
    { bg: "#aed581", color: "#000000" },
    { bg: "#dce775", color: "#000000" },
    { bg: "#fff176", color: "#000000" },
    { bg: "#ffd54f", color: "#000000" },
    { bg: "#ffb74d", color: "#000000" },
    { bg: "#ff8a65", color: "#ffffff" },
];
function hash(str) {
    let h = 0
    for (let i = 0; i < str.length; i++) {
        h = str.charCodeAt(i) + ((h << 5) - h)
    }
    return Math.abs(h)
}

function adjustColor(hex, amount) {
    let col = hex.replace("#", "")
    let num = parseInt(col, 16)

    let r = (num >> 16) + amount
    let g = ((num >> 8) & 0x00ff) + amount
    let b = (num & 0x0000ff) + amount

    r = Math.max(0, Math.min(255, r))
    g = Math.max(0, Math.min(255, g))
    b = Math.max(0, Math.min(255, b))

    return "rgb(" + r + ", " + g + ", " + b + ")";
}

function getColor(main, sub) {
    const baseIndex = hash(main) % palette.length
    let base = palette[baseIndex]

    // 子 tag：稍微变化（可选）
    if (sub) {
        const offset = hash(sub) % 3

        return {
            bg: adjustColor(base.bg, offset * 5),
            color: base.color,
        }
    }

    return base
}

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