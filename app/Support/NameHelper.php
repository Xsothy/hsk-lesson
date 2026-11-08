<?php

namespace App\Support;

/**
 * Fun English→Chinese name helper. The syllable table is hand-written for this project:
 * each English syllable maps to a few characters with a similar sound (sound-alike, not an official name).
 */
class NameHelper
{
    /** English syllable → characters, each [char, pinyin]; the first is the default. */
    public const SYLLABLES = [
        'a' => [['阿', 'ā'], ['娅', 'yà']], 'ai' => [['艾', 'ài'], ['爱', 'ài']], 'al' => [['艾', 'ài'], ['阿', 'ā']],
        'an' => [['安', 'ān'], ['恩', 'ēn']], 'ar' => [['阿', 'ā'], ['雅', 'yǎ']],
        'ba' => [['巴', 'bā'], ['芭', 'bā']], 'be' => [['贝', 'bèi'], ['碧', 'bì']], 'bi' => [['比', 'bǐ'], ['碧', 'bì']],
        'bo' => [['波', 'bō'], ['博', 'bó']], 'br' => [['布', 'bù']],
        'ca' => [['卡', 'kǎ'], ['嘉', 'jiā']], 'ce' => [['塞', 'sāi'], ['希', 'xī']], 'ch' => [['查', 'chá'], ['琪', 'qí']],
        'ci' => [['西', 'xī'], ['茜', 'qiàn']], 'co' => [['科', 'kē'], ['可', 'kě']],
        'da' => [['达', 'dá'], ['黛', 'dài']], 'de' => [['德', 'dé'], ['黛', 'dài']], 'di' => [['迪', 'dí'], ['蒂', 'dì']],
        'do' => [['多', 'duō'], ['朵', 'duǒ']],
        'e' => [['艾', 'ài'], ['伊', 'yī']], 'el' => [['艾', 'ài'], ['埃', 'āi']], 'em' => [['艾', 'ài'], ['恩', 'ēn']],
        'en' => [['恩', 'ēn'], ['安', 'ān']], 'er' => [['尔', 'ěr'], ['儿', 'ér']],
        'fa' => [['法', 'fǎ'], ['菲', 'fēi']], 'fe' => [['菲', 'fēi'], ['费', 'fèi']], 'fi' => [['菲', 'fēi'], ['芬', 'fēn']],
        'ga' => [['嘉', 'jiā'], ['加', 'jiā']], 'ge' => [['格', 'gé'], ['吉', 'jí']], 'gi' => [['吉', 'jí'], ['琪', 'qí']],
        'ha' => [['哈', 'hā'], ['海', 'hǎi']], 'he' => [['赫', 'hè'], ['海', 'hǎi']], 'hi' => [['希', 'xī']],
        'ho' => [['霍', 'huò'], ['荷', 'hé']], 'i' => [['伊', 'yī'], ['艾', 'ài']],
        'ja' => [['杰', 'jié'], ['佳', 'jiā']], 'je' => [['杰', 'jié'], ['洁', 'jié']], 'ji' => [['吉', 'jí'], ['基', 'jī']],
        'jo' => [['乔', 'qiáo'], ['卓', 'zhuó']], 'ju' => [['朱', 'zhū'], ['茱', 'zhū']],
        'ka' => [['卡', 'kǎ'], ['凯', 'kǎi']], 'ke' => [['凯', 'kǎi'], ['克', 'kè']], 'ki' => [['琪', 'qí'], ['基', 'jī']],
        'la' => [['拉', 'lā'], ['兰', 'lán']], 'le' => [['莱', 'lái'], ['乐', 'lè']], 'li' => [['莉', 'lì'], ['丽', 'lì']],
        'lo' => [['洛', 'luò'], ['罗', 'luó']], 'lu' => [['露', 'lù'], ['卢', 'lú']], 'ly' => [['莉', 'lì'], ['丽', 'lì']],
        'ma' => [['玛', 'mǎ'], ['马', 'mǎ']], 'me' => [['梅', 'méi'], ['美', 'měi']], 'mi' => [['米', 'mǐ'], ['蜜', 'mì']],
        'mo' => [['莫', 'mò'], ['摩', 'mó']], 'na' => [['娜', 'nà'], ['纳', 'nà']], 'ne' => [['内', 'nèi'], ['妮', 'nī']],
        'ni' => [['妮', 'nī'], ['尼', 'ní']], 'no' => [['诺', 'nuò'], ['娜', 'nà']],
        'o' => [['奥', 'ào'], ['欧', 'ōu']], 'pa' => [['帕', 'pà'], ['芭', 'bā']], 'pe' => [['佩', 'pèi'], ['彼', 'bǐ']],
        'ph' => [['菲', 'fēi']], 'pi' => [['皮', 'pí'], ['琵', 'pí']],
        'ra' => [['拉', 'lā'], ['雷', 'léi']], 're' => [['雷', 'léi'], ['蕾', 'lěi']], 'ri' => [['里', 'lǐ'], ['丽', 'lì']],
        'ro' => [['罗', 'luó'], ['洛', 'luò']], 'ru' => [['鲁', 'lǔ'], ['如', 'rú']],
        'sa' => [['萨', 'sà'], ['莎', 'shā']], 'se' => [['塞', 'sāi'], ['赛', 'sài']], 'sh' => [['沙', 'shā'], ['雪', 'xuě']],
        'si' => [['西', 'xī'], ['思', 'sī']], 'so' => [['索', 'suǒ'], ['苏', 'sū']], 'su' => [['苏', 'sū'], ['素', 'sù']],
        'ta' => [['塔', 'tǎ'], ['泰', 'tài']], 'te' => [['特', 'tè'], ['泰', 'tài']], 'th' => [['瑟', 'sè'], ['西', 'xī']],
        'ti' => [['蒂', 'dì'], ['提', 'tí']], 'to' => [['托', 'tuō'], ['汤', 'tāng']],
        'u' => [['尤', 'yóu'], ['乌', 'wū']], 'va' => [['瓦', 'wǎ'], ['薇', 'wēi']], 've' => [['维', 'wéi'], ['薇', 'wēi']],
        'vi' => [['维', 'wéi'], ['薇', 'wēi']], 'wa' => [['瓦', 'wǎ'], ['华', 'huá']], 'we' => [['韦', 'wéi'], ['薇', 'wēi']],
        'wi' => [['威', 'wēi'], ['薇', 'wēi']], 'ya' => [['雅', 'yǎ'], ['娅', 'yà']], 'ye' => [['叶', 'yè']],
        'yo' => [['约', 'yuē']], 'yu' => [['玉', 'yù']], 'za' => [['扎', 'zhā'], ['莎', 'shā']], 'ze' => [['泽', 'zé']],
        'zi' => [['兹', 'zī'], ['子', 'zǐ']],
        // lone consonants (word endings such as the "n" in "Ben")
        'b' => [['布', 'bù']], 'c' => [['克', 'kè']], 'd' => [['德', 'dé']], 'f' => [['夫', 'fū']], 'g' => [['格', 'gé']],
        'h' => [['赫', 'hè']], 'j' => [['杰', 'jié']], 'k' => [['克', 'kè']], 'l' => [['尔', 'ěr']], 'm' => [['姆', 'mǔ']],
        'n' => [['恩', 'ēn']], 'p' => [['普', 'pǔ']], 'r' => [['尔', 'ěr']], 's' => [['斯', 'sī']], 't' => [['特', 'tè']],
        'v' => [['夫', 'fū']], 'w' => [['沃', 'wò']], 'x' => [['克', 'kè']], 'y' => [['伊', 'yī']], 'z' => [['兹', 'zī']],
    ];

    /** Meaning themes: label => English words looked for in `characters.definition`. */
    public const THEMES = [
        'Beautiful' => ['beautiful', 'pretty', 'graceful', 'elegant'],
        'Bright' => ['bright', 'brilliant', 'shining', 'radiant'],
        'Wise' => ['wise', 'clever', 'intelligent', 'smart', 'talent'],
        'Happy' => ['happy', 'joy', 'joyful', 'delight', 'pleasure'],
        'Lucky' => ['lucky', 'fortune', 'auspicious', 'blessing', 'prosper'],
        'Peace' => ['peace', 'peaceful', 'tranquil', 'harmony', 'calm'],
        'Kind' => ['kind', 'gentle', 'virtue', 'benevolent', 'honest', 'sincere'],
        'Strong' => ['strong', 'brave', 'courage', 'mighty', 'vigorous'],
        'Nature' => ['jade', 'pearl', 'moon', 'star', 'spring', 'flower', 'orchid', 'cloud'],
    ];

    /** Split a name into table syllables: two letters when in the table, else one. @return list<string> */
    public static function syllables(string $name): array
    {
        $out = [];
        foreach (preg_split('/[^a-z]+/', mb_strtolower($name), -1, PREG_SPLIT_NO_EMPTY) as $word) {
            for ($i = 0, $n = strlen($word); $i < $n;) {
                $two = substr($word, $i, 2);
                if (strlen($two) === 2 && isset(self::SYLLABLES[$two])) {
                    $out[] = $two;
                    $i += 2;
                } else {
                    $out[] = $word[$i++];
                }
            }
        }

        return $out;
    }

    /** @return list<array{en:string, options:list<array{char:string, pinyin:string}>}> */
    public static function suggest(string $name): array
    {
        $res = [];
        foreach (self::syllables($name) as $s) {
            if (isset(self::SYLLABLES[$s])) {
                $res[] = ['en' => $s, 'options' => array_map(fn ($o) => ['char' => $o[0], 'pinyin' => $o[1]], self::SYLLABLES[$s])];
            }
        }

        return $res;
    }
}
