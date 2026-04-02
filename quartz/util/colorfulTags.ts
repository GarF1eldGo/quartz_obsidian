/**
 * @file 根据文本内容，映射对应的颜色
 */

import fs from 'fs'
import path from 'path'

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

const CACHE_FILE_PATH = path.join(process.cwd(), '.tag-color-cache.json')

interface ColorResult {
    bg: string
    color: string
}

const hash = (str: string): number => {
    let h = 0
    for (let i = 0; i < str.length; i++) {
        h = str.charCodeAt(i) + ((h << 5) - h)
    }
    return Math.abs(h)
}

const adjustColor = (hex: string, amount: number): string => {
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

const getColor = (main: string, sub?: string): ColorResult => {
    const baseIndex = hash(main) % palette.length;
    let base = palette[baseIndex];

    if (sub) {
        const offset = hash(sub) % 3;
        return {
            bg: adjustColor(base.bg, offset * 5),
            color: base.color,
        }
    }

    return base;
};

// 从文件加载缓存
const loadCacheFromFile = (): Map<string, ColorResult> => {
    const cache = new Map<string, ColorResult>()
    
    try {
        if (fs.existsSync(CACHE_FILE_PATH)) {
            const data = fs.readFileSync(CACHE_FILE_PATH, 'utf-8')
            const parsed = JSON.parse(data)
            
            if (typeof parsed === 'object' && parsed !== null) {
                Object.entries(parsed).forEach(([key, value]) => {
                    cache.set(key, value as ColorResult)
                })
            }
        }
    } catch (error) {
        console.warn(`Failed to load tag color cache: ${error}`)
    }
    
    return cache
}

// 保存缓存到文件
const saveCacheToFile = (cache: Map<string, ColorResult>): void => {
    try {
        const obj: Record<string, ColorResult> = {}
        cache.forEach((value, key) => {
            obj[key] = value
        })
        fs.writeFileSync(CACHE_FILE_PATH, JSON.stringify(obj, null, 2), 'utf-8')
    } catch (error) {
        console.warn(`Failed to save tag color cache: ${error}`)
    }
}

// 初始化缓存（从文件加载）
const tagColorCache = loadCacheFromFile()

const getTagColor = (text: string): ColorResult => {
    // 先从内存缓存查找
    if (tagColorCache.has(text)) {
        return tagColorCache.get(text)!
    }
    
    // 计算新颜色
    const raw = text.replace(/^#/, "");
    const [main, sub] = raw.split("/")
    const result = getColor(main, sub);
    
    // 存入内存缓存
    tagColorCache.set(text, result)
    
    // 持久化到文件（可以改为定期保存或只在进程退出时保存）
    saveCacheToFile(tagColorCache)
    
    return result
}

const convertTags = (tags: string[]): Array<{ content: string; color: ColorResult }> => {
    if (!Array.isArray(tags)) {
        return []
    }
    return tags.map(tag => ({
        content: tag,
        color: getTagColor(tag),
    }))
}

// 可选：导出缓存管理函数，方便手动清理
const clearCache = (): void => {
    tagColorCache.clear()
    try {
        if (fs.existsSync(CACHE_FILE_PATH)) {
            fs.unlinkSync(CACHE_FILE_PATH)
        }
    } catch (error) {
        console.warn(`Failed to clear cache file: ${error}`)
    }
}

const TAG_BG = 'background-color'
const TAG_COLOR = 'color'

export { convertTags, TAG_BG, TAG_COLOR, clearCache }