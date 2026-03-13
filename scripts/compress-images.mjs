/**
 * 图片压缩脚本
 * 构建前自动压缩 content/ 目录下的所有图片
 * 用法：node scripts/compress-images.mjs
 */
import sharp from 'sharp';
import {readdir, stat, readFile, writeFile} from 'fs/promises';
import {join, extname} from 'path';
import {Command} from 'commander';

const program = new Command();

program
    .option('-d, --dir <path>', '图片目录', './content')
    .option('-i, --iterations <number>', '最大压缩次数', '3')
    .option('--jpg-quality <number>', 'JPG 质量', '80')
    .option('--png-quality <number>', 'PNG 质量', '80')
    .option('--webp-quality <number>', 'WEBP 质量', '80')
    .option('--min-size <kb>', '跳过小于此大小 KB', '50');

program.parse();

const args = program.opts();

// 配置项
const CONFIG = {
    inputDir: args.dir,

    quality: {
        jpg: Number(args.jpgQuality),
        png: Number(args.pngQuality),
        webp: Number(args.webpQuality),
    },

    skipIfSmallerThan: Number(args.minSize) * 1024,

    maxIterations: Number(args.iterations),

    minSavingRatio: 0.01
};

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);
const CACHE_FILE = '.image-compress-cache.json';

async function loadCache() {
    try {
        const data = await readFile(CACHE_FILE, 'utf8');
        return JSON.parse(data);
    }
    catch {
        return {};
    }
}

async function saveCache(cache) {
    await writeFile(CACHE_FILE, JSON.stringify(cache, null, 2));
}

// 检查是否应该跳过压缩
async function shouldSkip(filePath, cache) {
    const info = await stat(filePath);

    const record = cache[filePath];

    if (!record) return false;
    if (Math.round(info.mtimeMs) === record.mtime) return true;

    return false;
}

/**
 * 递归获取目录下所有图片文件路径
 */
async function getImageFiles(dir) {
    const files = [];
    const entries = await readdir(dir, {withFileTypes: true});

    for (const entry of entries) {
        const fullPath = join(dir, entry.name);
        if (entry.isDirectory()) {
            const subFiles = await getImageFiles(fullPath);
            files.push(...subFiles);
        }
        else if (entry.isFile() && SUPPORTED_EXTENSIONS.has(extname(entry.name).toLowerCase())) {
            files.push(fullPath);
        }
    }
    return files;
}

/**
 * 压缩单张图片（原地替换）
 */
async function compressImage(filePath, cache) {
    const fileInfo = await stat(filePath);
    const originalSize = fileInfo.size;

    if (await shouldSkip(filePath, cache)) {
        return {skipped: true, filePath, reason: '缓存命中，跳过'};
    }

    if (originalSize < CONFIG.skipIfSmallerThan) {
        return {skipped: true, filePath, reason: '文件过小，跳过'};
    }

    const ext = extname(filePath).toLowerCase();

    if (ext === '.gif') {
        return {skipped: true, filePath, reason: 'GIF 跳过'};
    }

    let currentBuffer = await sharp(filePath).toBuffer();
    let currentSize = currentBuffer.length;

    let iteration = 0;

    while (iteration < CONFIG.maxIterations) {
        iteration++;

        let pipeline = sharp(currentBuffer);

        if (ext === '.jpg' || ext === '.jpeg') {
            pipeline = pipeline.jpeg({
                quality: CONFIG.quality.jpg,
                progressive: true
            });
        }
        else if (ext === '.png') {
            pipeline = pipeline.png({
                quality: CONFIG.quality.png,
                compressionLevel: 9
            });
        }
        else if (ext === '.webp') {
            pipeline = pipeline.webp({
                quality: CONFIG.quality.webp
            });
        }

        const newBuffer = await pipeline.toBuffer();
        const newSize = newBuffer.length;

        const savingRatio = (currentSize - newSize) / currentSize;

        if (newSize >= currentSize || savingRatio < CONFIG.minSavingRatio) {
            break;
        }

        currentBuffer = newBuffer;
        currentSize = newSize;
    }

    if (currentSize < originalSize) {
        await sharp(currentBuffer).toFile(filePath);

        const saved = ((originalSize - currentSize) / originalSize * 100).toFixed(1);

        return {
            skipped: false,
            filePath,
            originalSize,
            newSize: currentSize,
            saved,
            iterations: iteration
        };
    }

    return {skipped: true, filePath, reason: '压缩后更大，保留原文件'};
}

async function main() {
    console.log('🖼️  开始扫描图片...');

    const imageFiles = await getImageFiles(CONFIG.inputDir);
    console.log(`📁 共找到 ${imageFiles.length} 张图片\n`);

    if (imageFiles.length === 0) {
        console.log('没有找到图片文件，退出。');
        return;
    }

    const cache = await loadCache();
    let totalOriginalSize = 0;
    let totalNewSize = 0;
    let compressedCount = 0;
    let skippedCount = 0;

    for (const filePath of imageFiles) {
        const result = await compressImage(filePath, cache);
        if (result.skipped) {
            skippedCount++;
            console.log(`⏭️  跳过：${filePath}（${result.reason}）`);
        }
        else {
            // 更新 cache
            cache[filePath] = {
                size: result.newSize,
                mtime: Date.now()
            };
            compressedCount++;
            totalOriginalSize += result.originalSize;
            totalNewSize += result.newSize;
            console.log(
                `✅ 压缩：${filePath} ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.newSize / 1024).toFixed(1)}KB（节省 ${result.saved}% ，迭代 ${result.iterations} 次）`
            );
        }
    }

    await saveCache(cache);

    console.log('\n📊 压缩完成：');
    console.log(`   压缩：${compressedCount} 张`);
    console.log(`   跳过：${skippedCount} 张`);
    if (compressedCount > 0) {
        const totalSaved = ((totalOriginalSize - totalNewSize) / totalOriginalSize * 100).toFixed(1);
        console.log(`   总节省：${((totalOriginalSize - totalNewSize) / 1024 / 1024).toFixed(2)}MB（${totalSaved}%）`);
    }
}

main().catch(err => {
    console.error('压缩失败：', err);
    process.exit(1);
});