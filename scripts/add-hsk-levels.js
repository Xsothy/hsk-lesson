const fs = require('fs');
const path = require('path');

const dictionaryPath = path.join(__dirname, '../data/dictionary.js');
const backupPath = path.join(__dirname, '../data/backups/dictionary.js.backup');

// Standard HSK1 word list (~150 words)
// Source: Official HSK vocabulary list
const HSK1_WORDS = [
  // Pronouns
  '我', '你', '他', '她', '它', '我们', '你们', '他们', '这', '那', '哪',
  
  // Numbers
  '零', '一', '二', '三', '四', '五', '六', '七', '八', '九', '十', '百', '千', '两',
  
  // Time words
  '今天', '明天', '昨天', '年', '月', '日', '号', '星期', '上午', '中午', '下午', '现在', '时候', '点', '分钟',
  
  // People & Family
  '人', '名字', '家', '爸爸', '妈妈', '儿子', '女儿', '老师', '学生', '朋友', '医生', '同学',
  
  // Places
  '中国', '北京', '学校', '医院', '饭店', '商店', '火车站',
  
  // Objects
  '电话', '电脑', '手机', '电视', '书', '水', '饭', '菜', '茶', '米饭', '水果', '苹果',
  '钱', '块', '衣服', '猫', '狗', '飞机', '出租车', '天气', '岁', '课', '汉语', '字',
  '桌子', '椅子', '杯子',
  
  // Verbs
  '是', '有', '叫', '说', '看', '听', '写', '读', '学习', '工作', '喜欢', '爱', '想', '要',
  '会', '能', '去', '来', '回', '住', '坐', '走', '开', '买', '卖', '吃', '喝', '睡觉',
  '起床', '打电话', '认识', '知道', '谢谢', '请', '再见', '你好', '对不起', '没关系',
  
  // Adjectives
  '好', '大', '小', '多', '少', '高', '冷', '热', '漂亮', '快', '慢', '贵', '忙', '累', '高兴',
  
  // Question words
  '吗', '呢', '什么', '谁', '哪儿', '怎么', '怎么样', '多少', '几', '为什么',
  
  // Adverbs
  '不', '没', '很', '太', '也', '都', '真', '还', '再',
  
  // Prepositions
  '在', '从', '到', '对', '比', '给',
  
  // Particles
  '的', '了', '过', '着',
  
  // Measure words
  '个', '本', '些', '张', '件',
  
  // Conjunctions
  '和', '但是', '因为', '所以', '如果',
  
  // Common phrases
  '今年', '没有', '吃饭', '上课', '下课', '回家', '看电视',
  
  // Additional common words
  '一样', '不舒服', '发烧', '唱歌', '头', '手', '新', '旧', '早上', '晚上', '最',
  '有点儿', '每天', '游泳', '然后', '电影', '白色', '眼睛', '红色', '跑步', '运动', '音乐', '黑色',
  
  // Single characters that are part of common words
  '今', '天', '明', '昨', '现', '分', '钟', '星', '期', '上', '下', '中', '午',
  '爸', '妈', '儿', '子', '女', '朋', '友', '见', '谢', '起', '没', '关', '系', '名',
  '衣', '服', '床', '觉', '打', '话', '舒', '发', '烧', '唱', '歌', '早', '晚',
  '每', '游', '泳', '然', '后', '影', '白', '色', '眼', '睛', '红', '跑', '步',
  '运', '动', '音', '乐', '黑'
];

// HSK2+ words - words that appear in the dictionary but are not HSK1
// These will be tagged as level 2 by default (can be adjusted manually later if needed)
const HSK2_WORDS = [
  '喜', '欢', '电', '视', '医', '院', '漂', '亮', '店', '米', '果', '苹', '老', '师',
  '学', '同', '校', '习', '工', '作', '汉', '语', '飞', '机', '出', '租', '车', '火',
  '站', '商', '气', '兴', '怎', '么', '样', '睡', '介', '与', '为', '京', '什',
  '以', '们', '但', '位', '体', '便', '候', '健', '先', '刻', '北', '半', '华',
  '受', '可', '右', '吧', '因', '国', '如', '宜', '常', '康', '得', '感', '或', '所',
  '描', '数', '方', '时', '李', '杯', '桌', '椅', '法', '活', '海', '物', '王',
  '疼', '知', '碗', '绍', '者', '脑', '芳', '行', '认', '识', '购', '趣', '身',
  '边', '远', '述', '道', '里', '问', '间', '陪', '颜', '食', '饮', '龄'
];

function readDictionaryFile() {
  const content = fs.readFileSync(dictionaryPath, 'utf-8');
  return content;
}

function addHskLevels(content) {
  // Parse the dictionary content
  // We'll use regex to find and modify each word entry
  
  let modifiedContent = content;
  let hsk1Count = 0;
  let hsk2Count = 0;
  let totalCount = 0;
  
  // Pattern to match word entries: { "c": "...", "p": "...", "e": "...", "cat": "..." }
  const entryPattern = /(\{\s*"c":\s*"([^"]+)",\s*"p":\s*"([^"]+)",\s*"e":\s*"([^"]+)",\s*"cat":\s*"([^"]+)"\s*\})/g;
  
  modifiedContent = content.replace(entryPattern, (match, fullMatch, c, p, e, cat) => {
    totalCount++;
    
    // Determine HSK level
    let hskLevel;
    if (HSK1_WORDS.includes(c)) {
      hskLevel = 1;
      hsk1Count++;
    } else if (HSK2_WORDS.includes(c)) {
      hskLevel = 2;
      hsk2Count++;
    } else {
      // Default to level 2 for unknown words (can be adjusted later)
      hskLevel = 2;
      hsk2Count++;
    }
    
    // Add hsk_level field before closing brace
    return `{\n      "c": "${c}",\n      "p": "${p}",\n      "e": "${e}",\n      "cat": "${cat}",\n      "hsk_level": ${hskLevel}\n    }`;
  });
  
  return {
    content: modifiedContent,
    stats: {
      total: totalCount,
      hsk1: hsk1Count,
      hsk2: hsk2Count
    }
  };
}

function validateHskLevels(content) {
  // Check that all entries have hsk_level field
  const entriesWithoutLevel = [];
  const invalidLevels = [];
  
  const entryPattern = /\{\s*"c":\s*"([^"]+)"[\s\S]*?\}/g;
  let match;
  
  while ((match = entryPattern.exec(content)) !== null) {
    const entry = match[0];
    const c = match[1];
    
    const levelMatch = entry.match(/"hsk_level":\s*(\d+)/);
    if (!levelMatch) {
      entriesWithoutLevel.push(c);
    } else {
      const level = parseInt(levelMatch[1]);
      if (level < 1 || level > 6) {
        invalidLevels.push({ word: c, level });
      }
    }
  }
  
  return {
    valid: entriesWithoutLevel.length === 0 && invalidLevels.length === 0,
    entriesWithoutLevel,
    invalidLevels
  };
}

// Main execution
console.log('Adding HSK level metadata to dictionary...\n');

// Create backup
console.log('Creating backup...');
const originalContent = readDictionaryFile();
fs.writeFileSync(backupPath, originalContent, 'utf-8');
console.log(`✓ Backup created at ${backupPath}\n`);

// Add HSK levels
console.log('Adding hsk_level field to entries...');
const { content: updatedContent, stats } = addHskLevels(originalContent);

// Validate
console.log('\nValidating HSK levels...');
const validation = validateHskLevels(updatedContent);

if (!validation.valid) {
  console.error('❌ Validation failed!');
  if (validation.entriesWithoutLevel.length > 0) {
    console.error('  Entries without hsk_level:', validation.entriesWithoutLevel.join(', '));
  }
  if (validation.invalidLevels.length > 0) {
    console.error('  Entries with invalid levels:', validation.invalidLevels);
  }
  process.exit(1);
}

// Write updated dictionary
console.log('✓ All entries validated\n');
console.log('Writing updated dictionary...');
fs.writeFileSync(dictionaryPath, updatedContent, 'utf-8');

console.log('\n✅ Successfully added HSK levels to dictionary!\n');
console.log('Statistics:');
console.log(`  Total entries processed: ${stats.total}`);
console.log(`  HSK Level 1 words: ${stats.hsk1}`);
console.log(`  HSK Level 2+ words: ${stats.hsk2}`);
console.log(`\nBackup saved at: ${backupPath}`);
console.log('Updated file: data/dictionary.js\n');
