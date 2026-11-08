<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

/** Make Me a Hanzi stroke outlines: one SVG path per stroke, in stroke order. */
class CharacterStroke extends Model
{
    public $timestamps = false;

    protected $fillable = ['char', 'strokes'];

    protected $casts = ['strokes' => 'array'];
}
