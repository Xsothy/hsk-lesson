<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Reading extends Model
{
    protected $fillable = [
        'lesson_number', 'type', 'difficulty', 'title', 'title_en', 'emoji',
        'lines', 'questions', 'focus_words', 'grammar_focus', 'is_published',
    ];

    protected $casts = [
        'lesson_number' => 'integer',
        'difficulty' => 'integer',
        'is_published' => 'boolean',
        'lines' => 'array',
        'questions' => 'array',
        'focus_words' => 'array',
        'grammar_focus' => 'array',
    ];

    /** Shape used by the legacy readings.js file. */
    public function toLegacy(): array
    {
        return array_filter([
            'id' => $this->id,
            'lesson' => $this->lesson_number,
            'type' => $this->type,
            'difficulty' => $this->difficulty,
            'title' => $this->title,
            'titleEn' => $this->title_en,
            'emoji' => $this->emoji,
            'lines' => $this->lines ?? [],
            'questions' => $this->questions ?? [],
            'focusWords' => $this->focus_words,
            'grammarFocus' => $this->grammar_focus,
        ], fn ($v) => $v !== null);
    }
}
