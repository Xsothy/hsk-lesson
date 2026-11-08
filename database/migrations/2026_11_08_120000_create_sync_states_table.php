<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// S2 · Cross-device sync: one JSON snapshot per user (progress, saved, srs, streak, settings, activity, quiz, last + item stamps).
return new class extends Migration
{
    public function up(): void
    {
        Schema::create('sync_states', function (Blueprint $table) {
            $table->foreignId('user_id')->primary()->constrained()->cascadeOnDelete();
            $table->unsignedInteger('rev')->default(0);
            $table->longText('state');
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('sync_states');
    }
};
