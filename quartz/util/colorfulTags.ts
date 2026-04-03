/**
 * @file 根据文本内容，映射对应的颜色
 */

import fs from 'fs'
import path from 'path'

interface ColorResult {
    bg: string // 纯色或渐变
    color: string
    index: number // 主色在palette的index
};

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

const CACHE_FILE_PATH = path.join(process.cwd(), 'quartz/.personal-cache/tag-color-cache.json');

// 加载缓存
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
};

// 初始化缓存
const tagColorCache = loadCacheFromFile()

const hash = (str: string): number => {
    let h = 0
    for (let i = 0; i < str.length; i++) {
        h = str.charCodeAt(i) + ((h << 5) - h)
    }
    return Math.abs(h)
}

const getColorFromPalette = (text: string, startIndex: number | null = null): ColorResult => {
    if (tagColorCache.has(text)) {
        return tagColorCache.get(text)!;
    }
    const gradientRange = 4; // 第二个颜色相对起始颜色的最大偏移
    const len = palette.length;
    const index = hash(text) % len;
    const finalIdx = startIndex !== null
        ? startIndex + index % gradientRange >= len ? startIndex - index % gradientRange : startIndex + index % gradientRange 
        : index;

    return {
        index: finalIdx,
        ...palette[finalIdx]
    };
}

// 生成渐变色
const generateGradient = (mainColor: string, subColor: string, angle: number = 90): string => {
    return `linear-gradient(${angle}deg, ${mainColor}, ${subColor})`
}

const getColor = (main: string, sub?: string): ColorResult => {
    const {bg, color, index} = getColorFromPalette(main);

    if (sub) {        
        // 有子标签时使用背景渐变色
        const {bg: subBg} = getColorFromPalette(sub, index);
        
        return {
            color: color,
            bg: generateGradient(bg, subBg),
            index,
        }
    }

    return {
        bg: bg,
        color: color,
        index: index
    };
};

// 保存缓存
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

let saveTimeout: NodeJS.Timeout | null = null
let isDirty = false

const scheduleSaveCache = (): void => {
    isDirty = true
    
    if (saveTimeout) {
        clearTimeout(saveTimeout)
    }
    
    saveTimeout = setTimeout(() => {
        if (isDirty) {
            saveCacheToFile(tagColorCache)
            isDirty = false
        }
        saveTimeout = null
    }, 5000)
}

const getTagColor = (text: string): ColorResult => {
    // 检查缓存
    if (tagColorCache.has(text)) {
        return tagColorCache.get(text)!
    }
    
    // 解析主标签和子标签
    // 格式: "主标签/子标签" 或 "主标签"
    const raw = text.replace(/^#/, "");
    const parts = raw.split("/")
    const main = parts[0]
    const sub = parts.length > 1 ? parts[1] : undefined
    
    // 获取颜色（如果有子标签会自动生成渐变色）
    const result = getColor(main, sub)
    
    // 存入缓存
    tagColorCache.set(text, result)
    scheduleSaveCache()
    
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

// 清空缓存
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

const TAG_BG = 'background'
const TAG_COLOR = 'color'

export { convertTags, TAG_BG, TAG_COLOR, getTagColor, clearCache }