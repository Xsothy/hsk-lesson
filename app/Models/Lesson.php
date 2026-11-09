<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;

class Lesson extends Model
{
    protected $fillable = [
        'slug', 'number', 'course', 'title', 'zh_title', 'en_title', 'description', 'emoji', 'color',
        'emoji_color', 'grammar_label', 'is_preview', 'is_published', 'content',
        'vocab', 'grammar', 'sentences', 'dialogue',
    ];

    protected $casts = [
        'number' => 'integer',
        'is_preview' => 'boolean',
        'is_published' => 'boolean',
        'vocab' => 'array',
        'grammar' => 'array',
        'sentences' => 'array',
        'dialogue' => 'array',
    ];

    /** OC 3.0 lessons are stored as 101+ (number is unique) but numbered from 1 in the course. */
    public const COURSE3_OFFSET = 100;

    /** Number shown to learners: 1, 2, … within its own course. */
    public function getDisplayNumberAttribute(): int
    {
        return $this->course === '3.0' && $this->number > self::COURSE3_OFFSET
            ? $this->number - self::COURSE3_OFFSET : (int) $this->number;
    }

    /** "Lesson 3" — for pages that only show one HSK version. */
    public function getLabelAttribute(): string
    {
        return 'Lesson '.$this->display_number;
    }

    /** "HSK 3.0 · Lesson 3" — for lists that mix both versions. */
    public function getFullLabelAttribute(): string
    {
        return ($this->course === '3.0' ? 'HSK 3.0 · ' : '').$this->label;
    }

    public function getRouteKeyName(): string
    {
        return 'slug';
    }

    /** Shape used by the legacy lessons.js index. */
    public function toSummary(): array
    {
        return [
            'slug' => $this->slug,
            'id' => $this->number,
            'course' => $this->course ?? '2.0',
            'title' => $this->title,
            'zhTitle' => $this->zh_title,
            'enTitle' => $this->en_title,
            'description' => $this->description,
            'emoji' => $this->emoji,
            'color' => $this->color,
            'emojiColor' => $this->emoji_color,
            'grammarLabel' => $this->grammar_label,
            'isPreview' => $this->is_preview,
            'vocabularyCount' => count($this->vocab ?? []),
        ];
    }

    /** Shape used by the legacy lessons/lesson-N.js files. */
    public function toLegacy(): array
    {
        $summary = $this->toSummary();
        unset($summary['vocabularyCount']);

        return $summary + [
            'content' => $this->content ?? '',
            'vocab' => $this->vocab ?? [],
            'grammar' => $this->grammar ?? [],
            'sentences' => $this->sentences ?? [],
            'dialogue' => $this->dialogue ?? [],
        ];
    }
}
