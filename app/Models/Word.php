<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Word extends Model
{
    protected $fillable = ['hanzi', 'pinyin', 'english', 'category', 'hsk_level', 'parts', 'literal', 'sort_order'];

    protected $casts = ['parts' => 'array', 'hsk_level' => 'integer', 'sort_order' => 'integer'];

    /** Shape used by the legacy dictionary.js file. */
    public function toDictionaryEntry(): array
    {
        return array_filter([
            'c' => $this->hanzi,
            'p' => $this->pinyin,
            'e' => $this->english,
            'cat' => $this->category,
            'hsk_level' => $this->hsk_level,
        ], fn ($v) => $v !== null);
    }
}
