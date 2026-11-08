<?php

namespace App\Services;

use App\Models\HskWord;
use App\Support\Pinyin;
use Illuminate\Database\Eloquent\Builder;

/**
 * Search and filter `hsk_words` — shared by the agent API (`/api/v1/hsk-words`),
 * the public `/data/hsk-words` endpoint and the Browse page.
 *
 * `q` matches hanzi (simplified/traditional), pinyin in any form ("xue", "xué", "xue2", "xue xi")
 * or English ("study"). Results are ranked: exact > prefix > contains, then by frequency,
 * HSK level and length. Without `q`, words are ordered by level then frequency — the same order
 * the Courses study sets use, so set N of a level is page N with 15 per page.
 */
class HskWordSearch
{
    public const SET_SIZE = 15;

    /**
     * @param  array{q?:?string, version?:int|string|null, level?:int|string|null, hsk2_level?:mixed, hsk3_level?:mixed}  $o
     */
    public function query(array $o): Builder
    {
        $q = HskWord::query();
        $version = in_array((int) ($o['version'] ?? 0), [2, 3], true) ? (int) $o['version'] : null;
        $levelCol = $version ? self::column($version) : null;

        if ($levelCol) {
            $q->whereNotNull($levelCol);
            if (! empty($o['level'])) {
                $q->where($levelCol, (int) $o['level']);
            }
        }
        foreach (['hsk2_level', 'hsk3_level'] as $f) {
            if (isset($o[$f]) && $o[$f] !== '') {
                $q->where($f, (int) $o[$f]);
            }
        }

        $term = trim((string) ($o['q'] ?? ''));
        if ($term !== '') {
            [$rank, $bindings] = $this->rank($term, true);
            // Partly toned input ("xuexi2") matches nothing tone-exact: fall back to toneless.
            if (Pinyin::hasTones($term) && ! (clone $q)->whereRaw("($rank) < 3", $bindings)->exists()) {
                [$rank, $bindings] = $this->rank($term, false);
            }
            $q->whereRaw("($rank) < 3", $bindings)->orderByRaw($rank, $bindings);
        } elseif ($levelCol) {
            $q->orderBy($levelCol);
        }

        $q->orderByRaw('COALESCE(frequency, 999999)');
        if ($term !== '') {
            $q->orderByRaw('COALESCE('.($levelCol ?? 'hsk3_level').', hsk2_level, 99)')->orderByRaw('length(simplified)');
        }

        return $q->orderBy('id');
    }

    public static function column(int $version): string
    {
        return $version === 2 ? 'hsk2_level' : 'hsk3_level';
    }

    /**
     * Rank expression for a query: 0 = exact, 1 = prefix, 2 = contains, 3 = no match.
     *
     * @return array{0:string, 1:array<int,string>}
     */
    private function rank(string $term, bool $tones): array
    {
        if (preg_match('/\p{Han}/u', $term)) {
            $h = preg_replace('/[^\p{Han}]/u', '', $term);
            $like = self::escape($h);
            $rank = "CASE WHEN simplified = ? OR traditional = ? THEN 0
                WHEN simplified LIKE ? ESCAPE '\\' OR traditional LIKE ? ESCAPE '\\' THEN 1
                WHEN simplified LIKE ? ESCAPE '\\' OR traditional LIKE ? ESCAPE '\\' THEN 2 ELSE 3 END";

            return [$rank, [$h, $h, "$like%", "$like%", "%$like%", "%$like%"]];
        }

        // Latin input: could be pinyin or English — match both, keep the best rank.
        $conds = [];   // [sql, rank, bindings]
        $lower = mb_strtolower($term);

        if ($tones && Pinyin::hasTones($lower)) {
            $m = self::escape(Pinyin::compactMarked($lower));
            $col = "REPLACE(REPLACE(lower(pinyin), ' ', ''), '''', '')";
            $conds[] = ["$col = ?", 0, [Pinyin::compactMarked($lower)]];
            $conds[] = ["$col LIKE ? ESCAPE '\\'", 1, ["$m%"]];
            if (mb_strlen($m) >= 3) {
                $conds[] = ["$col LIKE ? ESCAPE '\\'", 2, ["%$m%"]];
            }
        } elseif (($plain = Pinyin::toneless($lower)) !== '') {
            $conds[] = ['pinyin_plain = ?', 0, [$plain]];
            $conds[] = ['pinyin_plain LIKE ?', 1, ["$plain%"]];  // a–z only: no wildcards to escape
            if (strlen($plain) >= 3) {
                $conds[] = ['pinyin_plain LIKE ?', 2, ["%$plain%"]];
            }
        }

        // English: meanings is a JSON array of strings, e.g. ["to learn","to study"].
        $en = preg_replace('/^to\s+/', '', preg_replace('/\s+/', ' ', $lower));
        if ($en !== '' && ! preg_match('/[0-9āáǎàēéěèīíǐìōóǒòūúǔùǖǘǚǜ]/u', $en)) {
            $e = self::escape(str_replace('"', '', $en));
            $conds[] = ["(meanings LIKE ? ESCAPE '\\' OR meanings LIKE ? ESCAPE '\\')", 0, ["%\"$e\"%", "%\"to $e\"%"]];
            $conds[] = ["(meanings LIKE ? ESCAPE '\\' OR meanings LIKE ? ESCAPE '\\')", 1, ["%\"$e %", "%\"to $e %"]];
            if (mb_strlen($e) >= 3) {
                $conds[] = ["meanings LIKE ? ESCAPE '\\'", 2, ["%$e%"]];
            }
        }

        if (! $conds) {
            return ['3', []];
        }

        usort($conds, fn ($a, $b) => $a[1] <=> $b[1]);
        $rank = 'CASE '.implode(' ', array_map(fn ($c) => "WHEN {$c[0]} THEN {$c[1]}", $conds)).' ELSE 3 END';

        return [$rank, array_merge(...array_column($conds, 2))];
    }

    private static function escape(string $s): string
    {
        return str_replace(['\\', '%', '_'], ['\\\\', '\\%', '\\_'], $s);
    }
}
