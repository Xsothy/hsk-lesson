<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Make Me a Hanzi stroke data: one SVG path and one median per stroke, in stroke order, plus the radical's stroke indices. */
class CharacterStroke extends Model
{
    public $timestamps = false;

    protected $fillable = ['char', 'strokes', 'medians', 'rad_strokes'];

    protected $casts = ['strokes' => 'array', 'medians' => 'array', 'rad_strokes' => 'array'];
}
