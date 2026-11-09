<?php

namespace App\Http\Controllers;

use App\Services\GuideService;
use Illuminate\Http\Request;

/** F6 · Guides: /guides (filterable index) and /guides/{slug}. */
class GuideController extends Controller
{
    public function __construct(private GuideService $guides) {}

    public function index(Request $r)
    {
        $all = $this->guides->all();
        $levels = array_values(array_unique(array_column($all, 'level')));
        $tags = array_values(array_unique(array_merge([], ...array_column($all, 'tags'))));
        sort($tags);
        $level = (string) $r->query('level', '');
        $tag = (string) $r->query('tag', '');
        $list = array_values(array_filter($all, fn ($g) => ($level === '' || $g['level'] === $level) && ($tag === '' || in_array($tag, $g['tags'], true))));

        // Open the first "Start here" guide (titles without "vs"), as the canvas does.
        $start = collect($list)->first(fn ($g) => ! str_contains($g['title'], ' vs ')) ?? ($list[0] ?? null);
        $guide = $start ? $this->guides->find($start['slug']) : null;

        return view('pages.guides.index', ['list' => $list, 'guide' => $guide, 'all' => $list]);
    }

    public function show(string $slug)
    {
        $guide = $this->guides->find($slug) ?? abort(404);

        return view('pages.guides.show', ['guide' => $guide, 'all' => $this->guides->all()]);
    }
}
