<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    public function up(): void
    {
        Schema::create('readings', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('lesson_number')->nullable()->index(); // legacy "lesson"
            $table->string('type')->default('story');
            $table->unsignedTinyInteger('difficulty')->default(1);
            $table->string('title');
            $table->string('title_en')->nullable();
            $table->string('emoji')->nullable();
            $table->json('lines')->nullable();      // [{zh, en, words[]}]
            $table->json('questions')->nullable();  // [{id, type, question, questionEn, options, answer}]
            $table->json('focus_words')->nullable();
            $table->json('grammar_focus')->nullable();
            $table->boolean('is_published')->default(true);
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('readings');
    }
};
