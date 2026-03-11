/**
 * 图片压缩脚本
 * 构建前自动压缩 content/ 目录下的所有图片
 * 用法：node scripts/compress-images.mjs
 */
import sharp from 'sharp';
import {readdir, stat} from 'fs/promises';
import {join, extname} from 'path';

// 配置项
const CONFIG = {
    // 图片源目录
    inputDir: './content',
    // 压缩质量（0-100）
    quality: {
        jpg: 80,
        png: 80,
        webp: 80,
    },
    // 跳过小于此尺寸的文件（bytes），避免压缩已经很小的图片
    skipIfSmallerThan: 50 * 1024, // 50KB
};

const SUPPORTED_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.gif']);

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
async function compressImage(filePath) {
    const fileInfo = await stat(filePath);
    const originalSize = fileInfo.size;

    // 跳过太小的文件
    if (originalSize < CONFIG.skipIfSmallerThan) {
        return {skipped: true, filePath, reason: '文件过小，跳过'};
    }

    const ext = extname(filePath).toLowerCase();
    let pipeline = sharp(filePath);

    if (ext === '.jpg' || ext === '.jpeg') {
        pipeline = pipeline.jpeg({quality: CONFIG.quality.jpg, progressive: true});
    }
    else if (ext === '.png') {
        pipeline = pipeline.png({quality: CONFIG.quality.png, compressionLevel: 9});
    }
    else if (ext === '.webp') {
        pipeline = pipeline.webp({quality: CONFIG.quality.webp});
    }
    else if (ext === '.gif') {
        // gif 不压缩，sharp 对 gif 支持有限
        return {skipped: true, filePath, reason: 'GIF 跳过'};
    }

    // 输出到临时 buffer 再写回原文件
    const outputBuffer = await pipeline.toBuffer();
    const newSize = outputBuffer.byteLength;

    // 只有压缩后更小才替换
    if (newSize < originalSize) {
        await sharp(outputBuffer).toFile(filePath);
        const saved = ((originalSize - newSize) / originalSize * 100).toFixed(1);
        return {skipped: false, filePath, originalSize, newSize, saved};
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

    let totalOriginalSize = 0;
    let totalNewSize = 0;
    let compressedCount = 0;
    let skippedCount = 0;

    for (const filePath of imageFiles) {
        const result = await compressImage(filePath);
        if (result.skipped) {
            skippedCount++;
            console.log(`⏭️  跳过：${filePath}（${result.reason}）`);
        }
        else {
            compressedCount++;
            totalOriginalSize += result.originalSize;
            totalNewSize += result.newSize;
            console.log(`✅ 压缩：${filePath} ${(result.originalSize / 1024).toFixed(1)}KB → ${(result.newSize / 1024).toFixed(1)}KB（节省 ${result.saved}%）`);
        }
    }

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