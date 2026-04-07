---
created: 2026-04-02T16:48
updated: 2026-04-03T16:04
---
# 功能
当前quartz生成的tag，可以为所有tag自定义颜色；但是不支持为不同的tag，设置不同的颜色。
该插件会根据tag内容的哈希，映射到不同的颜色，从而实现tag颜色的随机化

# 原理
##### 2026.4.2: 构建html产物时，为tag元素注入style信息
1. 修改css文件，为`.tag-link`元素注入style，来设置背景和文本色
2. 构建项目时，根据tag的文本内容，计算出对应的颜色值
3. 为元素注入CSS变量

优点：
- 访问页面时，没有FOUC问题
缺点：
- 改动的地方较多：每个使用tag的地方，都要单独进行处理
- 首次构建时间变长。后续构建，借助文件缓存，可以只影响增量的tag
##### 2026.3.25: Dom Loaded后，为tag注入颜色变量
1. 修改css文件，让`.tag-link`元素使用CSS变量设置背景和文本色
2. 在DOMContentLoaded事件发生后，通过tag元素独有的标签`.tag-link` ，遍历所有的tag
3. 根据其文本内容，通过哈希算法计算出对应的颜色值
4. 为元素注入CSS变量
> 需要监听`nav` 事件，在路由变化时运行上述算法

> [!warning] **该方案的问题**
> 1. Flash of Unstyled Content（FOUC）：变量注入时机在DOM loaded之后，可能tag元素会出现闪烁的问题；即先是一个颜色，后面变为最终的颜色
> 2. 需要监听路由的变化：每次路由变化，都要运行算法给新页面的Tag添加对应的颜色，也会有FOUC问题


2026.4.2 最新代码如下：
```Javascript
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

const CACHE_FILE_PATH = path.join(process.cwd(), 'quartz/.personal-cache/tag-color-cache.json')

interface ColorResult {
    bg: string // 纯色或渐变
    color: string
}

const hash = (str: string): number => {
    let h = 0
    for (let i = 0; i < str.length; i++) {
        h = str.charCodeAt(i) + ((h << 5) - h)
    }
    return Math.abs(h)
}

const getColorFromPalette = (text: string, excludeIndex: number | null = null) => {
    const len = palette.length;
    const index = hash(text) % len;
    const finalIdx = index === excludeIndex ? (index + len / 2) % len : index;

    return {
        index: finalIdx,
        info: palette[finalIdx]
    };
}

// 生成渐变色
const generateGradient = (mainColor: string, subColor: string, angle: number = 90): string => {
    return `linear-gradient(${angle}deg, ${mainColor}, ${subColor})`
}

const getColor = (main: string, sub?: string): ColorResult => {
    const {info: base, index} = getColorFromPalette(main);

    if (sub) {        
        // 有子标签时使用渐变色
        const {info: subInfo} = getColorFromPalette(sub, index);
        
        return {
            color: base.color,
            bg: generateGradient(base.bg, subInfo.bg)
        }
    }

    return {
        bg: base.bg,
        color: base.color,
        gradient: undefined
    };
};

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
}

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

// 初始化缓存
const tagColorCache = loadCacheFromFile()

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
```