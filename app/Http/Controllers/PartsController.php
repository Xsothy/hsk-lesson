<?php

namespace App\Http\Controllers;

use App\Services\PartsService;
use Illuminate\Http\Request;
use Illuminate\View\View;

/** Character parts explorer: meaning clues and sound families, from real etymology data. */
class PartsController extends Controller
{
    public const SHOWN = 24;

    public const FILTERS = ['all' => 'All', 'meaning' => 'Meaning clues', 'sound' => 'Sound families'];

    /** GET /parts?c=氵&kind=all|meaning|sound&q= */
    public function index(Request $request, PartsService $parts): View
    {
        $kind = array_key_exists((string) $request->query('kind'), self::FILTERS) ? (string) $request->query('kind') : 'all';
        $q = mb_substr(trim((string) $request->query('q', '')), 0, 40);
        $items = $parts->filter($kind, $q);

        $c = mb_substr(trim((string) $request->query('c', '')), 0, 1);
        $sel = $c !== '' ? $parts->detail($c) : null;
        if (! $sel && $items) {
            $sel = $parts->detail($items[0]['char']);
        }

        $all = $request->boolean('all') || $q !== '';
        $total = count($items);
        $shown = $all ? $items : array_slice($items, 0, self::SHOWN);
        if ($sel && ! in_array($sel['char'], array_column($shown, 'char'), true) && ($hit = collect($items)->firstWhere('char', $sel['char']))) {
            $shown[] = $hit; // keep the selected part visible
        }

        return view('pages.parts', [
            'kind' => $kind, 'q' => $q, 'items' => $shown, 'total' => $total, 'all' => $all, 'sel' => $sel,
            'filters' => self::FILTERS,
            'link' => fn (array $extra) => route('parts', array_filter(
                ['kind' => $kind === 'all' ? null : $kind, 'q' => $q === '' ? null : $q, ...$extra],
                fn ($v) => $v !== null && $v !== '',
            )),
        ]);
    }
}
