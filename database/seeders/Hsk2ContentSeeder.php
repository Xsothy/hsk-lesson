<?php

namespace Database\Seeders;

use App\Models\Lesson;
use App\Models\Reading;
use App\Models\Word;
use App\Services\ContentService;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * HSK 2 course: lessons 13–24 with their readings and any dictionary words
 * they need (database/content/hsk2.json). Idempotent — safe to re-run.
 */
class Hsk2ContentSeeder extends Seeder
{
    public const FIRST_READING_ID = 25;

    public function run(): void
    {
        $data = json_decode(file_get_contents(database_path('content/hsk2.json')), true, flags: JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($data) {
            $order = (int) Word::max('sort_order') + 1;
            foreach ($data['words'] as $w) {
                $existing = Word::where('hanzi', $w['c'])->whereNotNull('pinyin')->orderBy('sort_order')->first();
                if (! $existing && ($stub = Word::where('hanzi', $w['c'])->whereNull('pinyin')->first())) {
                    // Breakdown-only row: replace with a full entry, keeping its breakdown.
                    $w['parts'] ??= $stub->parts;
                    $w['literal'] ??= $stub->literal;
                    $stub->delete();
                }
                if ($existing) {
                    if (! $existing->parts && ! empty($w['parts'])) {
                        $existing->update(['parts' => $w['parts'], 'literal' => $w['literal'] ?? null]);
                    }
                    continue;
                }
                Word::create([
                    'hanzi' => $w['c'],
                    'pinyin' => $w['p'],
                    'english' => $w['e'],
                    'category' => $w['cat'] ?? null,
                    'hsk_level' => array_key_exists('hsk', $w) ? $w['hsk'] : 2,
                    'parts' => $w['parts'] ?? null,
                    'literal' => $w['literal'] ?? null,
                    'sort_order' => $order++,
                ]);
            }

            // Fresh instance so the word map includes the words just added.
            $content = new ContentService;
            $lines = fn (array $rows) => $content->normalizeLines($rows);

            $readingId = self::FIRST_READING_ID;
            foreach ($data['lessons'] as $l) {
                Lesson::updateOrCreate(['slug' => 'lesson-'.$l['id']], [
                    'number' => $l['id'],
                    'course' => '2.0',
                    'title' => 'Lesson '.$l['id'],
                    'zh_title' => $l['zhTitle'],
                    'en_title' => $l['enTitle'],
                    'description' => $l['description'],
                    'emoji' => $l['emoji'],
                    'color' => $l['color'],
                    'emoji_color' => $l['emojiColor'],
                    'grammar_label' => $l['grammarLabel'],
                    'is_preview' => false,
                    'is_published' => true,
                    'content' => '',
                    'vocab' => $l['vocab'],
                    'grammar' => $l['grammar'],
                    'sentences' => $lines($l['sentences']),
                    'dialogue' => $lines($l['dialogue']),
                ]);

                foreach ($l['readings'] as $r) {
                    (Reading::find($readingId) ?? new Reading)->forceFill([
                        'id' => $readingId,
                        'lesson_number' => $l['id'],
                        'type' => $r['type'],
                        'difficulty' => $r['difficulty'],
                        'title' => $r['title'],
                        'title_en' => $r['titleEn'],
                        'emoji' => $r['emoji'],
                        'lines' => $lines($r['lines']),
                        'questions' => $r['questions'],
                        'focus_words' => $r['focusWords'],
                        'grammar_focus' => $r['grammarFocus'],
                    ])->save();
                    $readingId++;
                }
            }
        });
    }
}
