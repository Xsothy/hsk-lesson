<?php

use App\Http\Controllers\BrowseController;
use App\Http\Controllers\LearnController;
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
Route::get('/home', [LearnController::class, 'home'])->name('home');
Route::get('/courses', [LearnController::class, 'courses'])->name('courses');
Route::get('/data/hsk/{version}/{level}/sets', [LearnController::class, 'sets'])->whereNumber(['version', 'level']);
Route::get('/lessons/{slug}', [LearnController::class, 'lesson'])->name('lesson');
Route::get('/lessons/{slug}/reading/{n}', [LearnController::class, 'reading'])->whereNumber('n')->name('reading');
Route::get('/char/{c}', [\App\Http\Controllers\CharacterController::class, 'show'])->name('char');
Route::get('/char.html', [\App\Http\Controllers\CharacterController::class, 'legacy'])->name('char.legacy');
Route::get('/browse', [BrowseController::class, 'index'])->name('browse');
Route::get('/search', [\App\Http\Controllers\SearchController::class, 'index'])->name('search');
Route::get('/practice', [\App\Http\Controllers\PracticeController::class, 'index'])->name('practice');
Route::get('/data/practice-queue', [\App\Http\Controllers\PracticeController::class, 'queue'])->middleware('throttle:60,1');
Route::get('/review', [\App\Http\Controllers\ReviewController::class, 'index'])->name('review');
Route::get('/words', fn () => view('pages.words'))->name('words');
Route::view('/settings', 'pages.settings')->name('settings');

if (app()->environment('local', 'testing')) {
    Route::view('/dev/components', 'pages.dev-components')->name('dev.components');
}

// Public read-only JSON for the character page (no token needed).
Route::get('/data/char/{char}.json', [\App\Http\Controllers\Api\ReferenceController::class, 'character'])
    ->middleware('throttle:120,1');

// Public read-only flashcard deck for Review (lesson | HSK level/set | explicit words).
Route::get('/data/review-deck', [\App\Http\Controllers\ReviewController::class, 'deck'])->middleware('throttle:120,1');

// Public read-only HSK word search for Browse (same logic as /api/v1/hsk-words, no token).
Route::get('/data/hsk-words', [BrowseController::class, 'words'])->middleware('throttle:120,1');

// F3 · Tools
Route::prefix('tools')->group(function () {
    $c = \App\Http\Controllers\ToolsController::class;
    Route::get('/', [$c, 'index'])->name('tools');
    Route::get('/pinyin', [$c, 'pinyin'])->name('tools.pinyin');
    Route::post('/pinyin', [$c, 'convertPinyin'])->middleware('throttle:60,1');
    Route::get('/hsk-check', [$c, 'hsk'])->name('tools.hsk');
    Route::post('/hsk-check', [$c, 'checkHsk'])->middleware('throttle:30,1');
    Route::get('/name', [$c, 'name'])->name('tools.name');
    Route::get('/name/suggest', [$c, 'suggestName'])->middleware('throttle:60,1');
    Route::get('/name/meanings', [$c, 'meanings'])->middleware('throttle:60,1');
    Route::get('/zodiac', [$c, 'zodiac'])->name('tools.zodiac');
    Route::post('/zodiac', [$c, 'zodiacLookup'])->middleware('throttle:60,1');
});
