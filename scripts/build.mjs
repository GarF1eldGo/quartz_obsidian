import { exec } from 'child_process';
import { promisify } from 'util';

const run = promisify(exec);

async function main() {
  try {
    console.log('🚀 开始构建流程');

    console.log('🧹 清理 tags...');
    await run('node ./scripts/remove-custom-tags.mjs');

    console.log('📦 构建 Quartz...');
    await run('npx quartz build');

    console.log('🖼 压缩图片...');
    await run('node ./scripts/compress-images.mjs');

    console.log('✅ 构建完成');
  } catch (err) {
    console.error('❌ 构建失败:', err);
    process.exit(1);
  }
}

main();