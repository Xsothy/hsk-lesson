<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('words', function (Blueprint $table) {
            $table->id();
            $table->string('hanzi')->index();                 // legacy "c"
            $table->string('pinyin')->nullable();             // legacy "p"
            $table->string('english')->nullable();            // legacy "e"
            $table->string('category')->nullable()->index();  // legacy "cat" (categories.key)
            $table->unsignedTinyInteger('hsk_level')->nullable()->index();
            $table->json('parts')->nullable();                // breakdown from vocabulary.js
            $table->string('literal')->nullable();
            $table->unsignedInteger('sort_order')->default(0);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('words');
    }
};
