<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Character extends Model
{
    protected $fillable = [
        'char', 'pinyin', 'definition', 'radical', 'decomposition', 'etymology',
        'hsk2_level', 'hsk3_level', 'frequency',
    ];

    protected $casts = [
        'pinyin' => 'array',
        'etymology' => 'array',
        'hsk2_level' => 'integer',
        'hsk3_level' => 'integer',
        'frequency' => 'integer',
    ];
}
