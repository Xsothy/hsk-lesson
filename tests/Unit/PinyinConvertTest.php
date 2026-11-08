<?php

namespace Tests\Unit;

use App\Support\NameHelper;
use App\Support\Pinyin;
use App\Support\Zodiac;
use PHPUnit\Framework\TestCase;

class PinyinConvertTest extends TestCase
{
    public function test_numbers_to_marks(): void
    {
        $this->assertSame('xuéxí', Pinyin::numbersToMarks('xue2xi2'));
        $this->assertSame('nǐ hǎo', Pinyin::numbersToMarks('ni3 hao3'));
        $this->assertSame('lǜ', Pinyin::numbersToMarks('lv4'));
        $this->assertSame('lǜ', Pinyin::numbersToMarks('lu:4'));
        $this->assertSame('nǚ', Pinyin::numbersToMarks('nü3'));
        $this->assertSame('māma', Pinyin::numbersToMarks('ma1ma5'));
        $this->assertSame('ma', Pinyin::numbersToMarks('ma5'));
        $this->assertSame('xī\'ān', Pinyin::numbersToMarks('xi1\'an1'));
        $this->assertSame('Zhōngguó', Pinyin::numbersToMarks('Zhong1guo2'));
        $this->assertSame('ÀI', Pinyin::numbersToMarks('AI4'));
        $this->assertSame('liú', Pinyin::numbersToMarks('liu2'));
        $this->assertSame('duì', Pinyin::numbersToMarks('dui4'));
        $this->assertSame('gǒu', Pinyin::numbersToMarks('gou3'));
        $this->assertSame('xué', Pinyin::numbersToMarks('xué'));
    }

    public function test_marks_to_numbers(): void
    {
        $this->assertSame('xue2xi2', Pinyin::marksToNumbers('xuéxí'));
        $this->assertSame('ni3 hao3', Pinyin::marksToNumbers('nǐ hǎo'));
        $this->assertSame('lv4', Pinyin::marksToNumbers('lǜ'));
        $this->assertSame('ma1ma5', Pinyin::marksToNumbers('māma'));
        $this->assertSame('xi1\'an1', Pinyin::marksToNumbers('xī\'ān'));
        $this->assertSame('Zhong1guo2', Pinyin::marksToNumbers('Zhōngguó'));
        $this->assertSame('Zhong1guo2', Pinyin::marksToNumbers(Pinyin::numbersToMarks('Zhong1guo2')));
        $this->assertSame('xiang3', Pinyin::marksToNumbers('xiǎng'));
        $this->assertSame('shuang1', Pinyin::marksToNumbers('shuāng'));
        $this->assertSame('er3', Pinyin::marksToNumbers('ěr'));
        $this->assertSame('ma', Pinyin::marksToNumbers('ma'));
        $this->assertSame('xue2', Pinyin::marksToNumbers('xue2'));
    }

    public function test_strip_tones(): void
    {
        $this->assertSame('Xue xi', Pinyin::stripTones('Xué xí'));
        $this->assertSame('xuexi', Pinyin::stripTones('xue2xi2'));
        $this->assertSame('lü', Pinyin::stripTones('lǜ'));
    }

    public function test_zodiac_boundary(): void
    {
        $this->assertSame('Rabbit', Zodiac::forDate('2024-01-15')['animal'][2]);
        $this->assertSame('Dragon', Zodiac::forDate('2024-02-10')['animal'][2]); // LNY 2024
        $this->assertSame('Rabbit', Zodiac::forDate('2024-02-09')['animal'][2]);
        $this->assertSame('Wood', Zodiac::forDate('2024-03-01')['element'][2]);
        $this->assertSame('Snake', Zodiac::forDate('2025-01-29')['animal'][2]);
        $this->assertSame('Rat', Zodiac::forDate('1984-06-01')['animal'][2]);
        $this->assertSame('Fire', Zodiac::forDate('2000-12-31')['element'][2] === 'Metal' ? 'Fire' : 'x'); // 2000 = Metal Dragon
        $this->assertSame('1900-01-31', Zodiac::newYear(1900)->toDateString());
        $this->assertSame('2100-02-09', Zodiac::newYear(2100)->toDateString());
    }

    public function test_name_syllables(): void
    {
        $this->assertSame(['em', 'ma'], NameHelper::syllables('Emma'));
        $this->assertSame(['be', 'n'], NameHelper::syllables('Ben'));
        $this->assertSame('艾', NameHelper::suggest('Emma')[0]['options'][0]['char']);
    }
}
