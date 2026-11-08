<?php

namespace App\Services;

use App\Models\Lesson;
use Illuminate\Support\Facades\Blade;

/**
 * F7 · Sentence practice: sentence items from lesson content (lesson sentences, dialogue lines,
 * grammar examples when a grammar point has zh+en examples). Each item carries word tiles for
 * "build the sentence", English choices for "pick the meaning", and an x-ruby-line rendering.
 */
class SentencePool
{
    public const MAX = 20;

    public function __construct(private RubyTokens $ruby) {}

    /** @return array{label: string, items: array}|null  null = unknown lesson */
    public function queue(?string $slug): ?array
    {
        $q = Lesson::where('is_published', true)->orderBy('number');
        if ($slug !== null && $slug !== '') {
            $lesson = (clone $q)->where('slug', $slug)->first();
            if (! $lesson) {
                return null;
            }
            $lessons = collect([$lesson]);
            $label = 'Lesson '.$lesson->number.' sentences';
        } else {
            $lessons = $q->get();
            $label = 'Sentences from all lessons';
        }

        $lines = [];
        foreach ($lessons as $l) {
            foreach ($this->linesOf($l) as $line) {
                $lines[$line['zh']] ??= $line; // de-duplicate repeated lines
            }
        }
        $lines = array_values($lines);
        $picked = array_slice($lines, 0, self::MAX);

        // Distractor meanings: other lines first, then lines from every lesson when the pool is small.
        $pool = array_column($lines, 'en');
        if (count(array_unique($pool)) < 4) {
            foreach (Lesson::where('is_published', true)->orderBy('number')->get() as $l) {
                foreach ($this->linesOf($l) as $line) {
                    $pool[] = $line['en'];
                }
            }
        }
        $pool = array_values(array_unique($pool));

        $items = [];
        foreach ($picked as $k => $line) {
            $tokens = $this->ruby->forLine($line);
            $others = array_values(array_filter($pool, fn ($e) => $e !== $line['en']));
            // Deterministic spread so neighbouring items don't share distractors.
            $choices = [];
            for ($j = 0, $n = count($others); $j < $n && count($choices) < 3; $j++) {
                $choices[] = $others[($k * 3 + $j * 7) % $n];
                $choices = array_values(array_unique($choices));
            }
            $choices[] = $line['en'];
            $items[] = [
                'id' => $line['id'],
                'source' => $line['source'],
                'zh' => $line['zh'],
                'en' => $line['en'],
                'tiles' => $this->tiles($line, $tokens),
                'choices' => $choices,
                'ruby' => trim(Blade::render('<x-ruby-line :tokens="$t" :audio="$a" />', ['t' => $tokens, 'a' => $line['zh']])),
            ];
        }

        return ['label' => $label, 'items' => $items];
    }

    /** Usable lines of one lesson: zh + en + (optional) words. */
    private function linesOf(Lesson $l): array
    {
        $out = [];
        $add = function (array $row, string $source, int $i) use (&$out, $l) {
            $zh = trim((string) ($row['zh'] ?? ''));
            $en = trim((string) ($row['en'] ?? ''));
            if ($zh === '' || $en === '' || ! preg_match('/\p{Han}/u', $zh) || str_contains($zh, '[')) {
                return;
            }
            $out[] = ['id' => $l->slug.'/'.$source.'/'.$i, 'source' => $source, 'zh' => $zh, 'en' => $en, 'words' => $row['words'] ?? null];
        };
        foreach ($l->sentences ?? [] as $i => $s) {
            $add((array) $s, 'sentence', $i);
        }
        foreach ($l->dialogue ?? [] as $i => $s) {
            $add((array) $s, 'dialogue', $i);
        }
        foreach ($l->grammar ?? [] as $i => $g) {
            foreach ((array) ($g['examples'] ?? []) as $j => $ex) {
                if (is_array($ex)) {
                    $add($ex, 'grammar', $i * 100 + $j);
                }
            }
        }

        return $out;
    }

    /** Word tiles in sentence order, punctuation dropped. */
    private function tiles(array $line, array $tokens): array
    {
        $words = is_array($line['words'] ?? null) && $line['words'] ? $line['words'] : array_column($tokens, 'zh');
        $out = [];
        foreach ($words as $w) {
            $w = preg_replace('/[^\p{L}\p{N}]/u', '', (string) $w);
            if ($w !== '') {
                $out[] = $w;
            }
        }

        return $out;
    }
}
