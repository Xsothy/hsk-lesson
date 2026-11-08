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

// Public read-only JSON for the character page (no token needed).
Route::get('/data/char/{char}.json', [\App\Http\Controllers\Api\ReferenceController::class, 'character'])
    ->middleware('throttle:120,1');
