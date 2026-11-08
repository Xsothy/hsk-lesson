<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('lessons', function (Blueprint $table) {
            $table->id();
            $table->string('slug')->unique();
            $table->unsignedInteger('number')->unique();   // legacy "id" shown in the UI
            $table->string('title');
            $table->string('zh_title')->nullable();
            $table->string('en_title')->nullable();
            $table->text('description')->nullable();
            $table->string('emoji')->nullable();
            $table->string('color')->nullable();
            $table->string('emoji_color')->nullable();
            $table->string('grammar_label')->nullable();
            $table->boolean('is_preview')->default(false);
            $table->boolean('is_published')->default(true);
            $table->longText('content')->nullable();
            $table->json('vocab')->nullable();      // ["你好", ...]
            $table->json('grammar')->nullable();    // [{title, pattern, note}]
            $table->json('sentences')->nullable();  // [{zh, en, words[]}]
            $table->json('dialogue')->nullable();   // [{speaker, zh, en, words[]}]
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('lessons');
    }
};
