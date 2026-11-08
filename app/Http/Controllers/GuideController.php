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

        return view('pages.guides.index', compact('list', 'levels', 'tags', 'level', 'tag'));
    }

    public function show(string $slug)
    {
        $guide = $this->guides->find($slug) ?? abort(404);

        return view('pages.guides.show', compact('guide'));
    }
}
