<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /** Which of our courses a lesson belongs to: '2.0' (built on HSK 2.0) or '3.0' (HSK 3.0). */
    public function up(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->string('course', 8)->default('2.0')->index()->after('number');
        });
    }

    public function down(): void
    {
        Schema::table('lessons', function (Blueprint $table) {
            $table->dropIndex(['course']);
            $table->dropColumn('course');
        });
    }
};
