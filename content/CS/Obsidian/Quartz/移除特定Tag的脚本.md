---
created: 2026-04-02T16:42
updated: 2026-04-02T16:57
---
# 功能
发布文章时，文章的某些tag是自己使用的，不希望外部看到。就可以借助该脚本，在打包前过滤掉目标tag

# 原理
打包前，执行过滤脚本。
`node ./scripts/build.mjs && npx quartz build`
借助`gray-matter`库，识别Markdown的YAML信息，其中的`tags` 字段就是tag数组，过滤数组即可

代码如下：
```Javascript
import { readdir, stat, readFile, writeFile } from 'fs/promises';
import path from 'path';
import matter from 'gray-matter';
import { Command } from 'commander';

const program = new Command();

program
  .option('-d, --dir <path>', '文件目录', './content')
  .option('-t, --tag-list <tags>', '待删除的tag list', 'public,favourite/1,favourite/2,favourite/3');

program.parse();

const args = program.opts();

const CONFIG = {
  inputDir: args.dir,
  tagList: args.tagList.split(',').map(t => t.trim()),
};

// 👉 统一 tag 格式（去掉开头 #）
function normalize(tag) {
  return tag.replace(/^#/, '');
}

// 👉 递归处理目录
async function processDir(dir) {
  const files = await readdir(dir);

  for (const file of files) {
    const filePath = path.join(dir, file);
    const fileStat = await stat(filePath);

    if (fileStat.isDirectory()) {
      await processDir(filePath);
      continue;
    }

    if (!file.endsWith('.md')) continue;

    try {
      const raw = await readFile(filePath, 'utf8');
      const parsed = matter(raw);

      let tags = parsed.data.tags;

      if (!tags) continue;

      // 👇 统一成数组
      if (typeof tags === 'string') {
        tags = [tags];
      }

      if (!Array.isArray(tags) || tags.length === 0) {
        continue;
      }

      const before = [...tags];

      const newTags = tags.filter(tag => {
        return !CONFIG.tagList.includes(normalize(tag));
      });

      if (newTags.length !== before.length) {
        console.log('🧹 修改文件:', filePath);
        console.log('   原 tags:', before);
        console.log('   新 tags:', newTags);

        parsed.data.tags = newTags;

        const newContent = matter.stringify(parsed.content, parsed.data);
        await writeFile(filePath, newContent);
      }
    } catch (err) {
      console.error('❌ 处理失败:', filePath, err);
    }
  }
}

// 👉 主入口
async function main() {
  console.log('🚀 开始删除 tags...');
  console.log('📁 目录:', CONFIG.inputDir);
  console.log('🏷️ 目标 tags:', CONFIG.tagList);

  await processDir(CONFIG.inputDir);

  console.log('✅ 完成');
}

main();
```
