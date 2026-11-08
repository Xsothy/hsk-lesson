<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

// S1 accounts: passwordless users (magic link / Google). Passwords stay nullable-compatible for the agent user.
return new class extends Migration
{
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            $table->string('name')->nullable()->change();
            $table->string('password')->nullable()->change();
            $table->string('google_id')->nullable()->unique();
        });

        // Only a SHA-256 hash of each magic-link token is stored.
        Schema::create('login_tokens', function (Blueprint $table) {
            $table->id();
            $table->string('email')->index();
            $table->string('token_hash', 64)->unique();
            $table->timestamp('expires_at');
            $table->timestamp('used_at')->nullable();
            $table->timestamps();
        });
    }

    public function down(): void
    {
        Schema::dropIfExists('login_tokens');
        Schema::table('users', function (Blueprint $table) {
            $table->dropUnique(['google_id']);
            $table->dropColumn('google_id');
        });
    }
};
