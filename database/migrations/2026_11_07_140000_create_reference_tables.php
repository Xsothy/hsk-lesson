<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

/**
 * Reference data imported from open datasets (see docs/merged-roadmap.md).
 * Kept separate from `words` (the curated lesson dictionary) so lessons stay small.
 */
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('characters', function (Blueprint $table) {
            $table->id();
            $table->string('char', 8)->unique();
            $table->json('pinyin')->nullable();
            $table->text('definition')->nullable();
            $table->string('radical', 8)->nullable()->index();
            $table->string('decomposition')->nullable();
            $table->json('etymology')->nullable();
            $table->unsignedTinyInteger('hsk2_level')->nullable()->index();
            $table->unsignedTinyInteger('hsk3_level')->nullable()->index();
            $table->unsignedInteger('frequency')->nullable();
            $table->timestamps();
        });

        Schema::create('hsk_words', function (Blueprint $table) {
            $table->id();
            $table->string('simplified')->index();
            $table->string('traditional')->nullable();
            $table->string('pinyin')->nullable();
            $table->string('pinyin_plain')->nullable()->index(); // toneless, for search
            $table->json('meanings')->nullable();
            $table->json('pos')->nullable();
            $table->string('radical', 8)->nullable();
            $table->unsignedInteger('frequency')->nullable();
            $table->unsignedTinyInteger('hsk2_level')->nullable()->index();
            $table->unsignedTinyInteger('hsk3_level')->nullable()->index();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('hsk_words');
        Schema::dropIfExists('characters');
    }
};
