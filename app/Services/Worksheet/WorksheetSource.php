<?php

namespace App\Services\Worksheet;

use App\Http\Controllers\LearnController;
use App\Models\Character;
use App\Models\CharacterStroke;
use App\Models\Lesson;
use App\Services\HskWordSearch;

/** Turns a lesson, an HSK level/set or free text into worksheet characters and items. */
class WorksheetSource
{
    public const MAX_CHARS = 60;

    public function __construct(private HskWordSearch $search) {}

    /** @return array{title: string, chars: list<string>} */
    public function lesson(string $slug): array
    {
        $lesson = Lesson::where('slug', $slug)->where('is_published', true)->firstOrFail();

        return [
            'title' => 'Lesson '.$lesson->number.' · '.($lesson->en_title ?: $lesson->title),
            'chars' => self::hanzi(implode('', array_filter((array) $lesson->vocab, 'is_string'))),
        ];
    }

    /** @return array{title: string, chars: list<string>} */
    public function hsk(int $version, int $level, ?int $set): array
    {
        $query = $this->search->query(['version' => $version, 'level' => $level]);
        $title = "HSK $version.0 · Level ".LearnController::levelLabel($version, $level);
        if ($set) {
            $query->forPage($set, HskWordSearch::SET_SIZE);
            $title .= " · Set $set";
        } else {
            $query->limit(200);
        }

        return ['title' => $title, 'chars' => self::hanzi($query->pluck('simplified')->implode(''))];
    }

    /** Unique Han characters in reading order. @return list<string> */
    public static function hanzi(string $text): array
    {
        preg_match_all('/\p{Han}/u', $text, $m);

        return array_values(array_unique($m[0]));
    }

    /**
     * Characters → items with stroke data and labels from `characters`, capped at MAX_CHARS.
     * Characters without stroke data come back in `missing`.
     *
     * @param  list<string>  $chars
     * @return array{items: list<WorksheetItem>, missing: list<string>}
     */
    public function items(array $chars): array
    {
        $chars = array_slice(array_values(array_unique($chars)), 0, self::MAX_CHARS);
        $strokes = CharacterStroke::whereIn('char', $chars)->get()->keyBy('char');
        $info = Character::whereIn('char', $chars)->get(['char', 'pinyin', 'definition'])->keyBy('char');
        $items = $missing = [];
        foreach ($chars as $c) {
            if (empty($strokes[$c]?->strokes)) {
                $missing[] = $c;

                continue;
            }
            $def = $info[$c]->definition ?? null;
            $items[] = new WorksheetItem(
                char: $c,
                strokes: $strokes[$c]->strokes,
                pinyin: implode(', ', array_slice($info[$c]->pinyin ?? [], 0, 2)) ?: null,
                english: $def ? trim(explode(';', $def)[0]) : null,
            );
        }

        return ['items' => $items, 'missing' => $missing];
    }
}
