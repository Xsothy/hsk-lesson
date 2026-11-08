<?php

namespace App\Console\Commands;

use App\Models\HskWord;
use Illuminate\Console\Command;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Http;

/**
 * Imports open reference datasets into `characters` and `hsk_words`.
 * Files are cached in database/sources/ (git-ignored) and downloaded when missing.
 */
class ImportReferenceData extends Command
{
    protected $signature = 'hsk:import-reference {--fresh : Re-download the source files}';

    protected $description = 'Import character (Make Me a Hanzi) and HSK 2.0/3.0 word data';

    private const SOURCES = [
        'makemeahanzi-dictionary.txt' => 'https://raw.githubusercontent.com/skishore/makemeahanzi/master/dictionary.txt',
        'complete-hsk.json' => 'https://raw.githubusercontent.com/drkameleon/complete-hsk-vocabulary/main/complete.json',
    ];

    public function handle(): int
    {
        $dir = database_path('sources');
        if (! is_dir($dir)) {
            mkdir($dir, 0755, true);
        }
        foreach (self::SOURCES as $file => $url) {
            $path = "$dir/$file";
            if ($this->option('fresh') || ! file_exists($path)) {
                $this->info("Downloading $file …");
                file_put_contents($path, Http::timeout(120)->get($url)->throw()->body());
            }
        }

        $hsk = $this->importHskWords("$dir/complete-hsk.json");
        $chars = $this->importCharacters("$dir/makemeahanzi-dictionary.txt", $hsk);

        $this->info("Imported $chars characters and ".count($hsk['rows']).' HSK words.');

        return self::SUCCESS;
    }

    /** @return array{rows: array, charLevels: array<string, array{0:?int,1:?int,2:?int}>} */
    private function importHskWords(string $path): array
    {
        $data = json_decode(file_get_contents($path), true, flags: JSON_THROW_ON_ERROR);
        $rows = [];
        $charLevels = []; // char => [hsk2, hsk3, frequency]
        $now = now();

        foreach ($data as $entry) {
            $old = $new = null;
            foreach ($entry['level'] ?? [] as $lv) {
                if (preg_match('/^old-(\d)$/', $lv, $m)) {
                    $old = (int) $m[1];
                } elseif (preg_match('/^new-(\d)$/', $lv, $m)) {
                    $new = (int) $m[1]; // 7 = levels 7–9 band
                }
            }
            if ($old === null && $new === null) {
                continue;
            }
            $form = $entry['forms'][0] ?? [];
            $pinyin = $form['transcriptions']['pinyin'] ?? null;
            $rows[] = [
                'simplified' => $entry['simplified'],
                'traditional' => $form['traditional'] ?? null,
                'pinyin' => $pinyin,
                'pinyin_plain' => $pinyin ? HskWord::plain($pinyin) : null,
                'meanings' => json_encode($form['meanings'] ?? [], JSON_UNESCAPED_UNICODE),
                'pos' => json_encode($entry['pos'] ?? []),
                'radical' => $entry['radical'] ?? null,
                'frequency' => $entry['frequency'] ?? null,
                'hsk2_level' => $old,
                'hsk3_level' => $new,
                'created_at' => $now,
                'updated_at' => $now,
            ];
            if (mb_strlen($entry['simplified']) === 1) {
                $charLevels[$entry['simplified']] = [$old, $new, $entry['frequency'] ?? null];
            }
        }

        DB::transaction(function () use ($rows) {
            DB::table('hsk_words')->delete();
            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('hsk_words')->insert($chunk);
            }
        });

        return ['rows' => $rows, 'charLevels' => $charLevels];
    }

    private function importCharacters(string $path, array $hsk): int
    {
        $levels = $hsk['charLevels'];
        $now = now();
        $rows = [];

        foreach (new \SplFileObject($path) as $line) {
            if (trim($line) === '') {
                continue;
            }
            $c = json_decode($line, true);
            if (! $c || empty($c['pinyin'])) {
                continue; // skip bare radical forms
            }
            $lv = $levels[$c['character']] ?? [null, null, null];
            $rows[] = [
                'char' => $c['character'],
                'pinyin' => json_encode($c['pinyin'], JSON_UNESCAPED_UNICODE),
                'definition' => $c['definition'] ?? null,
                'radical' => $c['radical'] ?? null,
                'decomposition' => $c['decomposition'] ?? null,
                'etymology' => isset($c['etymology']) ? json_encode($c['etymology'], JSON_UNESCAPED_UNICODE) : null,
                'hsk2_level' => $lv[0],
                'hsk3_level' => $lv[1],
                'frequency' => $lv[2],
                'created_at' => $now,
                'updated_at' => $now,
            ];
        }

        DB::transaction(function () use ($rows) {
            DB::table('characters')->delete();
            foreach (array_chunk($rows, 500) as $chunk) {
                DB::table('characters')->insert($chunk);
            }
        });

        return count($rows);
    }
}
