<?php

namespace App\Services;

use App\Models\Character;
use App\Support\Pinyin;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;

/**
 * Character parts explorer (/parts). Real data only:
 *  - meaning / sound clue = the part's role in Make Me a Hanzi etymology (`semantic` / `phonetic`) of HSK characters;
 *  - parts with no etymology role fall back to the `character_parts` table ("Part").
 */
class PartsService
{
    public const MIN_USES = 3;

    public const EXAMPLES = 6;

    /** Every part used as a clue in at least MIN_USES HSK characters, most used first. */
    public function all(): array
    {
        $count = Character::whereNotNull('etymology')->count();

        return Cache::remember("parts.index.v1.$count", 86400, function () {
            $hsk = fn ($q) => $q->whereNotNull('hsk2_level')->orWhereNotNull('hsk3_level');
            $roles = [];
            foreach (['meaning' => '$.semantic', 'sound' => '$.phonetic'] as $kind => $path) {
                $rows = Character::query()->where($hsk)
                    ->selectRaw("json_extract(etymology, '$path') as part, count(*) as n")
                    ->whereRaw("json_extract(etymology, '$path') is not null")
                    ->groupBy('part')->get();
                foreach ($rows as $r) {
                    $roles[$r->part][$kind] = (int) $r->n;
                }
            }
            $roles = array_filter($roles, fn ($r) => max($r) >= self::MIN_USES);
            $info = Character::whereIn('char', array_keys($roles))->get(['char', 'pinyin', 'definition'])->keyBy('char');

            $out = [];
            foreach ($roles as $part => $r) {
                if (mb_strlen($part) !== 1) {
                    continue;
                }
                $kind = ($r['meaning'] ?? 0) >= ($r['sound'] ?? 0) ? 'meaning' : 'sound';
                $c = $info[$part] ?? null;
                $py = $c ? (array_values(array_filter((array) $c->pinyin))[0] ?? '') : '';
                $out[] = [
                    'char' => $part, 'kind' => $kind, 'uses' => $r[$kind], 'pinyin' => $py,
                    'gloss' => self::gloss($c?->definition), 'definition' => (string) $c?->definition,
                ];
            }
            usort($out, fn ($a, $b) => $b['uses'] <=> $a['uses'] ?: strcmp($a['char'], $b['char']));

            return $out;
        });
    }

    /** Filter by kind (all|meaning|sound) and a query (hanzi, pinyin with or without tones, English). */
    public function filter(string $kind, string $q): array
    {
        $q = trim($q);
        $plain = mb_strtolower(Pinyin::toneless($q));

        return array_values(array_filter($this->all(), function ($p) use ($kind, $q, $plain) {
            if ($kind !== 'all' && $p['kind'] !== $kind) {
                return false;
            }
            if ($q === '') {
                return true;
            }
            if (preg_match('/\p{Han}/u', $q)) {
                return str_contains($q, $p['char']) || $this->contains($q, $p['char']);
            }

            return ($plain !== '' && Pinyin::toneless($p['pinyin']) === $plain)
                || str_contains(mb_strtolower($p['definition']), mb_strtolower($q));
        }));
    }

    /** Detail for one part: role, explanation built from the data, and up to six HSK example characters. */
    public function detail(string $part): ?array
    {
        $entry = collect($this->all())->firstWhere('char', $part);
        $c = Character::where('char', $part)->first(['char', 'pinyin', 'definition', 'radical']);
        $kind = $entry['kind'] ?? 'part';

        $base = Character::query()
            ->where(fn ($q) => $q->whereNotNull('hsk2_level')->orWhereNotNull('hsk3_level'))
            ->where('char', '!=', $part);
        $base = match ($kind) {
            'meaning' => $base->whereRaw("json_extract(etymology, '$.semantic') = ?", [$part]),
            'sound' => $base->whereRaw("json_extract(etymology, '$.phonetic') = ?", [$part]),
            default => $base->whereIn('char', DB::table('character_parts')->where('part', $part)->select('char')),
        };
        $total = (clone $base)->count();
        if (! $entry && $total === 0) {
            return null;
        }
        $rows = $base->orderByRaw('COALESCE(hsk3_level, hsk2_level)')->orderByRaw('COALESCE(frequency, 999999)')
            ->get(['char', 'pinyin', 'definition']);
        $examples = $rows->take(self::EXAMPLES)->map(fn ($r) => [
            'char' => $r->char, 'pinyin' => array_values(array_filter((array) $r->pinyin))[0] ?? '',
            'meaning' => self::gloss($r->definition),
        ])->all();

        $py = $c ? (array_values(array_filter((array) $c->pinyin))[0] ?? '') : '';
        $gloss = self::gloss($c?->definition);
        $syl = Pinyin::toneless($py);
        $isRadical = Character::where('radical', $part)->exists();

        if ($kind === 'sound') {
            $same = $syl ? $rows->filter(fn ($r) => in_array($syl, array_map(fn ($p) => Pinyin::toneless($p), (array) $r->pinyin), true))->count() : 0;
            $name = ucfirst($syl ?: $part).' sound family';
            $hint = $syl ? 'sounds like '.$syl : 'sound clue';
            $about = "A sound clue in $total HSK ".str('character')->plural($total).'.'
                .($syl ? " $same of them are read $syl in some tone; the other part gives the meaning." : ' The other part gives the meaning.');
        } elseif ($kind === 'meaning') {
            $name = ucfirst($gloss ?: $part).($isRadical ? ' radical' : ' part');
            $hint = $gloss ?: 'meaning clue';
            $about = "A meaning clue in $total HSK ".str('character')->plural($total).'.'
                .($gloss ? " Characters with it usually relate to “{$gloss}”." : '');
        } else {
            $name = ($gloss ? ucfirst($gloss) : 'Part').' '.$part;
            $hint = $gloss ?: 'part';
            $about = "Appears as a written part in $total HSK ".str('character')->plural($total).'. It is not marked as a meaning or sound clue in the etymology data.';
        }

        return [
            'char' => $part, 'kind' => $kind, 'name' => $name, 'pinyin' => $py, 'hint' => $hint,
            'about' => $about, 'total' => $total, 'examples' => $examples, 'has_page' => (bool) $c,
        ];
    }

    /** Whether hanzi $q contains $part as one of its written parts. */
    private function contains(string $q, string $part): bool
    {
        return DB::table('character_parts')->whereIn('char', mb_str_split($q))->where('part', $part)->exists();
    }

    /** First short sense of a definition ("water", "man", …). */
    public static function gloss(?string $def): string
    {
        $g = trim(preg_split('/[;,]/', (string) $def)[0] ?? '');

        return mb_strlen($g) > 22 ? rtrim(mb_substr($g, 0, 21)).'…' : $g;
    }
}
