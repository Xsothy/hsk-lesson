<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class HskWord extends Model
{
    protected $fillable = [
        'simplified', 'traditional', 'pinyin', 'pinyin_plain', 'meanings', 'pos',
        'radical', 'frequency', 'hsk2_level', 'hsk3_level',
    ];

    protected $casts = [
        'meanings' => 'array',
        'pos' => 'array',
        'frequency' => 'integer',
        'hsk2_level' => 'integer',
        'hsk3_level' => 'integer',
    ];

    public static function plain(string $pinyin): string
    {
        $map = ['ā' => 'a', 'á' => 'a', 'ǎ' => 'a', 'à' => 'a', 'ē' => 'e', 'é' => 'e', 'ě' => 'e', 'è' => 'e',
            'ī' => 'i', 'í' => 'i', 'ǐ' => 'i', 'ì' => 'i', 'ō' => 'o', 'ó' => 'o', 'ǒ' => 'o', 'ò' => 'o',
            'ū' => 'u', 'ú' => 'u', 'ǔ' => 'u', 'ù' => 'u', 'ǖ' => 'v', 'ǘ' => 'v', 'ǚ' => 'v', 'ǜ' => 'v', 'ü' => 'v'];

        return preg_replace('/[^a-z]/', '', strtr(mb_strtolower($pinyin), $map));
    }
}
