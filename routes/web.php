<?php

use App\Http\Controllers\BrowseController;
use App\Http\Controllers\LearnController;
use Illuminate\Support\Facades\Route;

// `/` is Home. Old static-site URLs 301 to their Blade equivalents (R2).
Route::get('/', [LearnController::class, 'home']);
Route::get('/index.html', fn () => redirect('/', 301));
Route::get('/lesson.html', [LearnController::class, 'legacyLesson']);
Route::get('/export-lessons.html', fn () => redirect()->route('courses', [], 301));

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

// S1 accounts: email + password, web session guard only. No email reset: owner runs `hsk:reset-password`.
Route::middleware('guest')->group(function () {
    Route::get('/login', [\App\Http\Controllers\Auth\LoginController::class, 'show'])->name('login');
    Route::post('/login', [\App\Http\Controllers\Auth\LoginController::class, 'login'])->middleware('throttle:30,1');
    Route::get('/register', [\App\Http\Controllers\Auth\RegisterController::class, 'show'])->name('register');
    Route::post('/register', [\App\Http\Controllers\Auth\RegisterController::class, 'store'])->middleware('throttle:10,1');
});
Route::middleware('auth')->group(function () {
    Route::get('/account', [\App\Http\Controllers\Auth\AccountController::class, 'show'])->name('account');
    Route::post('/logout', [\App\Http\Controllers\Auth\AccountController::class, 'logout'])->name('logout');
    Route::put('/account/password', [\App\Http\Controllers\Auth\AccountController::class, 'updatePassword'])->middleware('throttle:10,1')->name('account.password');
    Route::delete('/account', [\App\Http\Controllers\Auth\AccountController::class, 'destroy'])->middleware('throttle:10,1')->name('account.destroy');
});

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
