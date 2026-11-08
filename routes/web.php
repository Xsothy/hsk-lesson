<?php

use App\Http\Controllers\LegacyDataController;
use Illuminate\Support\Facades\Route;

// Static frontend lives in public/. These routes generate its data scripts from the database.
Route::get('/', fn () => response()->file(public_path('index.html')));

Route::controller(LegacyDataController::class)->group(function () {
    Route::get('/data/lessons.js', 'lessons');
    Route::get('/data/lessons/{slug}.js', 'lesson')->where('slug', '[A-Za-z0-9\-_]+');
    Route::get('/data/dictionary.js', 'dictionary');
    Route::get('/data/vocabulary.js', 'vocabulary');
    Route::get('/data/readings.js', 'readings');
    Route::get('/js/word-map.js', 'wordMap');
});

// Alpha pages (A2 skeleton). `/` still serves the legacy home until parity.
$page = fn (string $title) => fn () => view('pages.placeholder', ['title' => $title]);
Route::get('/home', $page('Today'))->name('home');
Route::get('/courses', $page('Courses'))->name('courses');
Route::get('/lessons/{slug}', fn (string $slug) => view('pages.placeholder', ['title' => 'Lesson '.$slug]))->name('lesson');
Route::get('/lessons/{slug}/reading/{n}', fn (string $slug, string $n) => view('pages.placeholder', ['title' => 'Reading']))->name('reading');
Route::get('/char/{c}', [\App\Http\Controllers\CharacterController::class, 'show'])->name('char');
Route::get('/char.html', [\App\Http\Controllers\CharacterController::class, 'legacy'])->name('char.legacy');
Route::get('/browse', $page('Browse'))->name('browse');
Route::get('/search', $page('Search'))->name('search');
Route::get('/practice', $page('Practice'))->name('practice');
Route::get('/review', $page('Review'))->name('review');
Route::get('/words', $page('My words'))->name('words');
Route::get('/settings', $page('Settings'))->name('settings');

if (app()->environment('local', 'testing')) {
    Route::view('/dev/components', 'pages.dev-components')->name('dev.components');
}

// Public read-only JSON for the character page (no token needed).
Route::get('/data/char/{char}.json', [\App\Http\Controllers\Api\ReferenceController::class, 'character'])
    ->middleware('throttle:120,1');
