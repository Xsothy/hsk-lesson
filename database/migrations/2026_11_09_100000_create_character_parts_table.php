<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/** F5: one row per (character, component) parsed from the Make Me a Hanzi decomposition. */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('character_parts', function (Blueprint $table) {
            $table->id();
            $table->string('char', 8);
            $table->string('part', 8);
            $table->index('part');
            $table->index(['char', 'part']);
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('character_parts');
    }
};
