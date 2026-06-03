const words = [
  "喜欢", "电视", "医生", "医院", "漂亮", "多少", "今年", "饭店", "米饭", "水果", "苹果", "老师", "学生", "同学", "学校", "学习", "工作", "汉语", "哪儿", "飞机", "出租车", "火车站", "商店", "天气", "高兴", "怎么样", "衣服", "没有", "起床", "睡觉", "吃饭", "上课", "下课", "回家", "看电视", "打电话"
];

const dictionary = {
  "喜欢": "to like",
  "电视": "television",
  "医生": "doctor",
  "医院": "hospital",
  "漂亮": "beautiful",
  "多少": "how much/many",
  "今年": "this year",
  "饭店": "restaurant",
  "米饭": "cooked rice",
  "水果": "fruit",
  "苹果": "apple",
  "老师": "teacher",
  "学生": "student",
  "同学": "classmate",
  "学校": "school",
  "学习": "to study",
  "工作": "to work",
  "汉语": "Chinese language",
  "哪儿": "where",
  "飞机": "airplane",
  "出租车": "taxi",
  "火车站": "train station",
  "商店": "shop",
  "天气": "weather",
  "高兴": "happy",
  "怎么样": "how is it?",
  "衣服": "clothes",
  "没有": "not have",
  "起床": "to get up",
  "睡觉": "to sleep",
  "吃饭": "to eat a meal",
  "上课": "to attend class",
  "下课": "class ends",
  "回家": "to go home",
  "看电视": "to watch TV",
  "打电话": "to phone"
};

words.forEach(w => {
    const parts = w.split('');
    const literal = parts.join(' + ') + ' = ' + (dictionary[w] || '');
    console.log(`  "${w}": {`);
    console.log(`    parts: ${JSON.stringify(parts)},`);
    console.log(`    literal: ${JSON.stringify(literal)}`);
    console.log(`  },`);
});
