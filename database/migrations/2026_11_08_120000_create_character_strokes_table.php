<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** Stroke outlines from Make Me a Hanzi graphics.txt (F2 worksheets). Kept apart from `characters` because the paths are large. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('character_strokes', function (Blueprint $table) {
            $table->id();
            $table->string('char', 8)->unique();
            $table->json('strokes'); // SVG path per stroke, 1024 box, y flipped (see WorksheetPdf)
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('character_strokes');
    }
};
