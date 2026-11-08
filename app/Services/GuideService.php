<?php

namespace App\Services;

use Illuminate\Support\Facades\Blade;
use Illuminate\Support\Str;

/**
 * F6 · Guides: Markdown articles in resources/guides/*.md.
 *
 * Front matter (between `---` lines): title, summary, level (beginner|elementary|intermediate), tags (comma list), order (int).
 * Chinese examples go in a fenced block tagged `zh`, one example per line, "汉字 | English gloss";
 * each hanzi line renders through <x-ruby-line> (tone-coloured pinyin). Everything else is plain Markdown.
 */
class GuideService
{
    public function __construct(private RubyTokens $ruby) {}

    private function dir(): string
    {
        return resource_path('guides');
    }

    /** @return array<int, array{slug:string,title:string,summary:string,level:string,tags:array<string>,order:int}> */
    public function all(): array
    {
        $out = [];
        foreach (glob($this->dir().'/*.md') ?: [] as $file) {
            $out[] = $this->parse(basename($file, '.md'), (string) file_get_contents($file))['meta'];
        }
        usort($out, fn ($a, $b) => [$a['order'], $a['title']] <=> [$b['order'], $b['title']]);

        return $out;
    }

    public function find(string $slug): ?array
    {
        if (! preg_match('/^[a-z0-9-]+$/', $slug) || ! is_file($f = $this->dir()."/$slug.md")) {
            return null;
        }
        $p = $this->parse($slug, (string) file_get_contents($f));

        return $p['meta'] + ['html' => $this->render($p['body'])];
    }

    private function parse(string $slug, string $raw): array
    {
        $fm = [];
        $body = $raw;
        if (preg_match('/\A---\R(.*?)\R---\R?(.*)\z/s', $raw, $m)) {
            foreach (preg_split('/\R/', $m[1]) as $line) {
                if (str_contains($line, ':')) {
                    [$k, $v] = explode(':', $line, 2);
                    $fm[trim($k)] = trim($v);
                }
            }
            $body = $m[2];
        }

        return [
            'meta' => [
                'slug' => $slug,
                'title' => $fm['title'] ?? $slug,
                'summary' => $fm['summary'] ?? '',
                'level' => $fm['level'] ?? 'beginner',
                'tags' => array_values(array_filter(array_map('trim', explode(',', $fm['tags'] ?? '')))),
                'order' => (int) ($fm['order'] ?? 99),
            ],
            'body' => $body,
        ];
    }

    private function render(string $body): string
    {
        $parts = preg_split('/^```zh[ \t]*\R(.*?)^```[ \t]*$/ms', $body, -1, PREG_SPLIT_DELIM_CAPTURE);
        $html = '';
        foreach ($parts as $i => $part) {
            if ($i % 2 === 0) {
                $html .= Str::markdown($part, ['html_input' => 'strip', 'allow_unsafe_links' => false]);

                continue;
            }
            $html .= '<div class="guide-examples">';
            foreach (preg_split('/\R/', trim($part)) as $line) {
                if (trim($line) === '') {
                    continue;
                }
                [$zh, $en] = array_pad(array_map('trim', explode('|', $line, 2)), 2, '');
                $row = Blade::render('<x-ruby-line :tokens="$t" :audio="$zh" />', ['t' => $this->ruby->forText($zh), 'zh' => $zh]);
                $html .= '<div class="guide-ex">'.$row.($en !== '' ? '<p class="guide-gloss">'.e($en).'</p>' : '').'</div>';
            }
            $html .= '</div>';
        }

        return $html;
    }
}
