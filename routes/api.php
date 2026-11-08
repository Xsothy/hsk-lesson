<?php

use App\Http\Controllers\Api\CategoryController;
use App\Http\Controllers\Api\LessonController;
use App\Http\Controllers\Api\ReadingController;
use App\Http\Controllers\Api\ReferenceController;
use App\Http\Controllers\Api\ToolsController;
use App\Http\Controllers\Api\WordController;
use Illuminate\Support\Facades\Route;

/*
| Content API for AI agents. Authenticate with a Sanctum token
| (php artisan hsk:agent-token "agent name").
*/
Route::prefix('v1')->middleware(['auth:sanctum', 'throttle:120,1'])->group(function () {
    Route::middleware('ability:content:read,content:write')->group(function () {
        Route::get('/', [ToolsController::class, 'manifest']);
        Route::get('validate', [ToolsController::class, 'validateContent']);
        Route::get('export', [ToolsController::class, 'export']);
        Route::post('tokenize', [ToolsController::class, 'tokenize']);

        Route::get('lessons', [LessonController::class, 'index']);
        Route::get('lessons/{lesson}', [LessonController::class, 'show']);
        Route::get('words', [WordController::class, 'index']);
        Route::get('words/lookup/{hanzi}', [WordController::class, 'lookup']);
        Route::get('words/{word}', [WordController::class, 'show'])->whereNumber('word');
        Route::get('categories', [CategoryController::class, 'index']);
        Route::get('readings', [ReadingController::class, 'index']);
        Route::get('readings/{reading}', [ReadingController::class, 'show']);

        Route::get('characters', [ReferenceController::class, 'characters']);
        Route::get('characters/{char}', [ReferenceController::class, 'character']);
        Route::get('hsk-words', [ReferenceController::class, 'hskWords']);
    });

    Route::middleware('abilities:content:write')->group(function () {
        Route::post('lessons', [LessonController::class, 'store']);
        Route::patch('lessons/{lesson}', [LessonController::class, 'update']);
        Route::delete('lessons/{lesson}', [LessonController::class, 'destroy']);

        Route::post('words/bulk', [WordController::class, 'bulkUpsert']);
        Route::post('words', [WordController::class, 'store']);
        Route::patch('words/{word}', [WordController::class, 'update'])->whereNumber('word');
        Route::delete('words/{word}', [WordController::class, 'destroy'])->whereNumber('word');

        Route::post('categories', [CategoryController::class, 'store']);
        Route::patch('categories/{category:key}', [CategoryController::class, 'update']);
        Route::delete('categories/{category:key}', [CategoryController::class, 'destroy']);

        Route::post('readings', [ReadingController::class, 'store']);
        Route::patch('readings/{reading}', [ReadingController::class, 'update']);
        Route::delete('readings/{reading}', [ReadingController::class, 'destroy']);
    });
});
