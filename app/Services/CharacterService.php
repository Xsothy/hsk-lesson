<?php

namespace App\Services;

use App\Models\Character;
use App\Models\HskWord;
use App\Models\Lesson;
use App\Models\Reading;
use App\Models\Word;

/** Everything the character page needs, merging reference data with our own lessons. */
class CharacterService
{
    public function details(string $char): ?array
    {
        $c = Character::where('char', $char)->first();
        if (! $c) {
            return null;
        }

        $plain = array_map(fn ($p) => HskWord::plain($p), $c->pinyin ?? []);

        return [
            'char' => $c->char,
            'pinyin' => $c->pinyin,
            'definition' => $c->definition,
            'radical' => $c->radical,
            'decomposition' => $c->decomposition,
            'etymology' => $c->etymology,
            'hsk2_level' => $c->hsk2_level,
            'hsk3_level' => $c->hsk3_level,
            'unicode' => sprintf('U+%04X', mb_ord($c->char)),
            'lesson_word' => Word::where('hanzi', $c->char)->whereNotNull('pinyin')->first(['hanzi', 'pinyin', 'english', 'parts', 'literal']),
            'words' => $this->wordsContaining($c->char),
            'lessons' => $this->lessonsUsing($c->char),
            'examples' => $this->examples($c->char),
            'related' => [
                'same_radical' => $this->charList(Character::where('radical', $c->radical)->where('char', '!=', $c->char)),
                'same_sound' => $plain ? $this->sameSound($c, $plain) : [],
                'same_level' => $c->hsk3_level ? $this->charList(Character::where('hsk3_level', $c->hsk3_level)->where('char', '!=', $c->char)) : [],
            ],
        ];
    }

    private function wordsContaining(string $char): array
    {
        return HskWord::where('simplified', 'like', "%$char%")
            ->where('simplified', '!=', $char)
            ->orderByRaw('COALESCE(hsk3_level, 10), COALESCE(frequency, 999999)')
            ->limit(12)
            ->get(['simplified', 'pinyin', 'meanings', 'hsk2_level', 'hsk3_level'])
            ->map(fn ($w) => [
                'word' => $w->simplified,
                'pinyin' => $w->pinyin,
                'meaning' => implode('; ', array_slice($w->meanings ?? [], 0, 2)),
                'hsk2_level' => $w->hsk2_level,
                'hsk3_level' => $w->hsk3_level,
            ])->all();
    }

    /** Our differentiator: where this character is taught in our own course. */
    private function lessonsUsing(string $char): array
    {
        return Lesson::where('is_published', true)->orderBy('number')->get()
            ->filter(fn (Lesson $l) => collect($l->vocab ?? [])->contains(fn ($v) => str_contains($v, $char))
                || collect(array_merge($l->sentences ?? [], $l->dialogue ?? []))->contains(fn ($s) => str_contains($s['zh'] ?? '', $char)))
            ->map(fn (Lesson $l) => [
                'slug' => $l->slug,
                'number' => $l->number,
                'zh_title' => $l->zh_title,
                'en_title' => $l->en_title,
                'in_vocab' => collect($l->vocab ?? [])->contains(fn ($v) => str_contains($v, $char)),
            ])->values()->all();
    }

    /** Example sentences come from our own lessons and readings (no third-party sentences). */
    private function examples(string $char): array
    {
        $out = [];
        foreach (Lesson::where('is_published', true)->orderBy('number')->get() as $l) {
            foreach (array_merge($l->sentences ?? [], $l->dialogue ?? []) as $s) {
                if (str_contains($s['zh'] ?? '', $char)) {
                    $out[] = ['zh' => $s['zh'], 'en' => $s['en'] ?? null, 'source' => "Lesson {$l->number}", 'href' => "lesson.html?slug={$l->slug}"];
                }
            }
        }
        foreach (Reading::where('is_published', true)->orderBy('id')->get() as $r) {
            foreach ($r->lines ?? [] as $s) {
                if (str_contains($s['zh'] ?? '', $char)) {
                    $out[] = ['zh' => $s['zh'], 'en' => $s['en'] ?? null, 'source' => $r->title, 'href' => null];
                }
            }
        }

        return array_slice($out, 0, 6);
    }

    private function sameSound(Character $c, array $plain): array
    {
        return Character::where('char', '!=', $c->char)
            ->whereNotNull('hsk3_level')
            ->get(['char', 'pinyin', 'definition', 'hsk3_level'])
            ->filter(fn ($o) => array_intersect($plain, array_map(fn ($p) => HskWord::plain($p), $o->pinyin ?? [])))
            ->sortBy('hsk3_level')->take(8)
            ->map(fn ($o) => $this->charRow($o))->values()->all();
    }

    private function charList($query): array
    {
        return $query->whereNotNull('hsk3_level')->orderBy('hsk3_level')->orderByRaw('COALESCE(frequency, 999999)')
            ->limit(8)->get(['char', 'pinyin', 'definition', 'hsk3_level'])
            ->map(fn ($o) => $this->charRow($o))->all();
    }

    private function charRow(Character $o): array
    {
        return [
            'char' => $o->char,
            'pinyin' => $o->pinyin[0] ?? null,
            'meaning' => mb_strimwidth((string) $o->definition, 0, 40, '…'),
            'hsk3_level' => $o->hsk3_level,
        ];
    }
}
