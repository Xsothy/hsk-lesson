<?php

namespace App\Support;

use Normalizer;

/**
 * Stroke counts for radicals as they appear in `characters.radical` (Make Me a Hanzi).
 *
 * The 214 Kangxi radicals come from the Unicode Kangxi Radicals block (U+2F00–U+2FD5, ordered by
 * stroke count; NFKC maps each to its CJK ideograph). Simplified and positional variants are listed
 * explicitly with the stroke count of the form as written.
 */
class Radicals
{
    /** Index (1-based) of the first Kangxi radical with N strokes. */
    private const KANGXI_STARTS = [1 => 1, 2 => 7, 3 => 30, 4 => 61, 5 => 95, 6 => 118, 7 => 147, 8 => 167,
        9 => 176, 10 => 187, 11 => 197, 12 => 201, 13 => 205, 14 => 209, 15 => 211, 16 => 212, 17 => 214];

    private const VARIANTS = [
        '⺀' => 2, '⺊' => 2, '⺌' => 3, '⺍' => 3, '⺗' => 4, '⺮' => 6, '⺳' => 4, '⺼' => 4, '㔾' => 2,
        '丬' => 3, '丷' => 2, '乚' => 1, '乛' => 1, '亻' => 2, '兀' => 3, '刁' => 2, '刂' => 2, '卤' => 7,
        '孑' => 3, '尣' => 3, '巳' => 3, '彑' => 3, '忄' => 3, '扌' => 3, '攵' => 4, '旡' => 4, '歺' => 4,
        '母' => 5, '民' => 5, '氵' => 3, '氺' => 4, '灬' => 4, '炏' => 8, '爫' => 4, '犭' => 3, '王' => 4,
        '礻' => 4, '糹' => 6, '纟' => 3, '罒' => 5, '罓' => 4, '羋' => 6, '耂' => 4, '肀' => 4, '艹' => 3,
        '衤' => 5, '西' => 6, '覀' => 6, '见' => 4, '訁' => 7, '讠' => 2, '贝' => 4, '车' => 4, '辶' => 3,
        '釒' => 8, '钅' => 5, '镸' => 8, '长' => 4, '门' => 3, '阝' => 2, '青' => 8, '韦' => 4, '页' => 6,
        '风' => 4, '飞' => 3, '飠' => 8, '饣' => 3, '马' => 3, '鱼' => 8, '鸟' => 5, '麦' => 7, '黄' => 11,
        '黾' => 8, '齐' => 6, '齿' => 8, '龙' => 5, '龟' => 7, '虎' => 8, '川' => 3, '户' => 4,
    ];

    private static ?array $map = null;

    public static function strokes(string $radical): ?int
    {
        return self::map()[$radical] ?? null;
    }

    /** @return array<string,int> radical → strokes */
    public static function map(): array
    {
        if (self::$map !== null) {
            return self::$map;
        }
        $map = [];
        $bounds = self::KANGXI_STARTS + [18 => 215];
        for ($n = 1; $n <= 17; $n++) {
            for ($i = $bounds[$n]; $i < $bounds[$n + 1]; $i++) {
                $kangxi = mb_chr(0x2F00 + $i - 1);
                $map[Normalizer::normalize($kangxi, Normalizer::FORM_KC)] = $n;
            }
        }

        return self::$map = self::VARIANTS + $map;
    }
}
