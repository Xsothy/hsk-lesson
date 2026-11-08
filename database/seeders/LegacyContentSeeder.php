<?php

namespace Database\Seeders;

use App\Models\Category;
use App\Models\Lesson;
use App\Models\Reading;
use App\Models\Word;
use Illuminate\Database\Seeder;
use Illuminate\Support\Facades\DB;

/**
 * Imports the original static-site content (database/legacy/content.json,
 * converted from the old data/*.js files) into the database.
 */
class LegacyContentSeeder extends Seeder
{
    public function run(): void
    {
        $data = json_decode(file_get_contents(database_path('legacy/content.json')), true, flags: JSON_THROW_ON_ERROR);

        DB::transaction(function () use ($data) {
            Reading::query()->delete();
            Lesson::query()->delete();
            Word::query()->delete();
            Category::query()->delete();

            $i = 0;
            foreach ($data['categories'] as $key => $label) {
                Category::create(['key' => $key, 'label' => $label, 'sort_order' => $i++]);
            }

            $vocabulary = $data['vocabulary'];
            $i = 0;
            foreach ($data['words'] as $w) {
                $breakdown = $vocabulary[$w['c']] ?? null;
                Word::create([
                    'hanzi' => $w['c'],
                    'pinyin' => $w['p'] ?? null,
                    'english' => $w['e'] ?? null,
                    'category' => $w['cat'] ?? null,
                    'hsk_level' => $w['hsk_level'] ?? null,
                    'parts' => $breakdown['parts'] ?? null,
                    'literal' => $breakdown['literal'] ?? null,
                    'sort_order' => $i++,
                ]);
            }

            // Breakdowns for words that were never in the dictionary.
            $known = array_column($data['words'], 'c');
            foreach ($vocabulary as $hanzi => $breakdown) {
                if (! in_array($hanzi, $known, true)) {
                    Word::create([
                        'hanzi' => $hanzi,
                        'parts' => $breakdown['parts'] ?? null,
                        'literal' => $breakdown['literal'] ?? null,
                        'sort_order' => $i++,
                    ]);
                }
            }

            foreach ($data['lessons'] as $l) {
                Lesson::create([
                    'slug' => $l['slug'],
                    'number' => $l['id'],
                    'title' => $l['title'],
                    'zh_title' => $l['zhTitle'] ?? null,
                    'en_title' => $l['enTitle'] ?? null,
                    'description' => $l['description'] ?? null,
                    'emoji' => $l['emoji'] ?? null,
                    'color' => $l['color'] ?? null,
                    'emoji_color' => $l['emojiColor'] ?? null,
                    'grammar_label' => $l['grammarLabel'] ?? null,
                    'is_preview' => $l['isPreview'] ?? false,
                    'content' => $l['content'] ?? null,
                    'vocab' => $l['vocab'] ?? [],
                    'grammar' => $l['grammar'] ?? [],
                    'sentences' => $l['sentences'] ?? [],
                    'dialogue' => $l['dialogue'] ?? [],
                ]);
            }

            foreach ($data['readings'] as $r) {
                Reading::forceCreate([
                    'id' => $r['id'],
                    'lesson_number' => $r['lesson'] ?? null,
                    'type' => $r['type'] ?? 'story',
                    'difficulty' => $r['difficulty'] ?? 1,
                    'title' => $r['title'],
                    'title_en' => $r['titleEn'] ?? null,
                    'emoji' => $r['emoji'] ?? null,
                    'lines' => $r['lines'] ?? [],
                    'questions' => $r['questions'] ?? [],
                    'focus_words' => $r['focusWords'] ?? null,
                    'grammar_focus' => $r['grammarFocus'] ?? null,
                ]);
            }
        });
    }
}
