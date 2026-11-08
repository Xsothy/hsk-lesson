<?php

namespace App\Support;

use Carbon\CarbonImmutable;

/** Chinese zodiac animal + element for a birth date; the year turns over at Chinese New Year (table 1900–2100). */
class Zodiac
{
    public const ANIMALS = [
        ['鼠', 'shǔ', 'Rat'], ['牛', 'niú', 'Ox'], ['虎', 'hǔ', 'Tiger'], ['兔', 'tù', 'Rabbit'],
        ['龙', 'lóng', 'Dragon'], ['蛇', 'shé', 'Snake'], ['马', 'mǎ', 'Horse'], ['羊', 'yáng', 'Goat'],
        ['猴', 'hóu', 'Monkey'], ['鸡', 'jī', 'Rooster'], ['狗', 'gǒu', 'Dog'], ['猪', 'zhū', 'Pig'],
    ];

    public const ELEMENTS = [['木', 'mù', 'Wood'], ['火', 'huǒ', 'Fire'], ['土', 'tǔ', 'Earth'], ['金', 'jīn', 'Metal'], ['水', 'shuǐ', 'Water']];

    public static function newYear(int $year): CarbonImmutable
    {
        $t = require __DIR__.'/data/lny.php';
        if (! isset($t[$year])) {
            throw new \InvalidArgumentException('Year out of range (1900–2100)');
        }

        return CarbonImmutable::parse("$year-{$t[$year]}");
    }

    /** @return array{zodiacYear:int, animal:array, element:array, lny:string, beforeNewYear:bool} */
    public static function forDate(string $date): array
    {
        $d = CarbonImmutable::createFromFormat('!Y-m-d', $date);
        $lny = self::newYear($d->year);
        $before = $d->lt($lny);
        $y = $before ? $d->year - 1 : $d->year;
        $animal = self::ANIMALS[(($y - 4) % 12 + 12) % 12];
        $element = self::ELEMENTS[intdiv((($y - 4) % 10 + 10) % 10, 2)];

        return [
            'zodiacYear' => $y, 'animal' => $animal, 'element' => $element,
            'lny' => $lny->toDateString(), 'beforeNewYear' => $before,
        ];
    }
}
