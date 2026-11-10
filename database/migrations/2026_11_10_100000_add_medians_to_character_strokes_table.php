<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// Self-hosted stroke data for Hanzi Writer (/data/strokes/{char}.json): medians drive the animation and the
// writing quiz, rad_strokes are the stroke indices of the radical. Filled by `hsk:import-reference`.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('character_strokes', function (Blueprint $table) {
            $table->json('medians')->nullable();
            $table->json('rad_strokes')->nullable();
        });
    }

    public function down(): void
    {
        Schema::table('character_strokes', function (Blueprint $table) {
            $table->dropColumn(['medians', 'rad_strokes']);
        });
    }
};
