<?php

namespace App\Http\Controllers;

use App\Models\Character;
use App\Services\CharacterService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** C1 · Character page. Same data as GET /data/char/{c}.json, rendered server side. */
class CharacterController extends Controller
{
    private const STRUCTURES = [
        '⿰' => 'Left–right', '⿱' => 'Top–bottom', '⿲' => 'Left–middle–right', '⿳' => 'Top–middle–bottom',
        '⿴' => 'Full surround', '⿵' => 'Surround from above', '⿶' => 'Surround from below', '⿷' => 'Surround from left',
        '⿸' => 'Surround from upper left', '⿹' => 'Surround from upper right', '⿺' => 'Surround from lower left', '⿻' => 'Overlaid',
    ];

    public function show(string $c, CharacterService $chars): View
    {
        $c = mb_substr($c, 0, 1);
        $d = $chars->details($c);
        abort_if($d === null, 404);

        return view('pages.character', [
            'd' => $d,
            'tone' => self::tone($d['pinyin'][0] ?? ''),
            'meaning' => $d['lesson_word']['english'] ?? $d['definition'],
            'facts' => $this->facts($d),
            'note' => $this->note($d),
            'lessons' => array_map(fn ($l) => $l + ['href' => route('lesson', $l['slug'])], $d['lessons']),
            'examples' => array_map(fn ($e) => ['href' => $this->lessonHref($e['href'])] + $e, $d['examples']),
            'related' => $this->related($d),
        ]);
    }

    /** Legacy links (`char.html?c=学`, e.g. from the lesson word modal) land on the new page. */
    public function legacy(Request $request): RedirectResponse
    {
        $c = trim((string) $request->query('c'));

        return $c === '' ? redirect()->route('browse') : redirect()->route('char', mb_substr($c, 0, 1), 301);
    }

    /** Tone number 1-4 from the first syllable's diacritic, or null (neutral / unknown). */
    public static function tone(string $pinyin): ?int
    {
        foreach (['āēīōūǖ' => 1, 'áéíóúǘ' => 2, 'ǎěǐǒǔǚ' => 3, 'àèìòùǜ' => 4] as $marks => $t) {
            if (preg_match('/['.$marks.']/u', $pinyin)) {
                return $t;
            }
        }

        return null;
    }

    private function facts(array $d): array
    {
        $ids = $d['decomposition'] ?? '';
        $parts = $ids && ! str_contains($ids, '？')
            ? array_values(array_filter(mb_str_split($ids), fn ($ch) => ! isset(self::STRUCTURES[$ch])))
            : [];
        $radicalMeaning = $d['radical'] && $d['radical'] !== $d['char']
            ? Character::where('char', $d['radical'])->value('definition')
            : null;

        return array_filter([
            'Radical' => $d['radical'] ? ['char' => $d['radical'], 'meaning' => $radicalMeaning ? mb_strimwidth($radicalMeaning, 0, 32, '…') : null] : null,
            'Parts' => count($parts) > 1 ? $parts : null,
            'Structure' => self::STRUCTURES[mb_substr($ids, 0, 1)] ?? null,
            'Traditional' => $this->traditional($d['char']),
            'Unicode' => $d['unicode'],
        ]);
    }

    /** Traditional form from the HSK word list, only when it differs. */
    private function traditional(string $c): ?string
    {
        $t = \App\Models\HskWord::where('simplified', $c)->value('traditional');

        return $t && $t !== $c ? $t : null;
    }

    /** Our own lesson note first; otherwise the open-data etymology hint. */
    private function note(array $d): ?string
    {
        if ($lit = $d['lesson_word']['literal'] ?? null) {
            return $lit;
        }
        $e = $d['etymology'] ?? null;

        return ! empty($e['hint']) ? (isset($e['type']) ? ucfirst($e['type']).': ' : '').$e['hint'] : null;
    }

    private function related(array $d): array
    {
        $level = $d['hsk3_level'] === 7 ? '7–9' : $d['hsk3_level'];

        return array_values(array_filter([
            ['title' => 'Same radical '.$d['radical'], 'items' => $d['related']['same_radical']],
            ['title' => 'Same sound', 'items' => $d['related']['same_sound']],
            ['title' => 'Also HSK '.$level, 'items' => $d['related']['same_level']],
        ], fn ($g) => ! empty($g['items'])));
    }

    private function lessonHref(?string $href): ?string
    {
        return $href && preg_match('/slug=([A-Za-z0-9\-_]+)/', $href, $m) ? route('lesson', $m[1]) : $href;
    }
}
