<?php

namespace Database\Seeders;

/**
 * OC 3.0 course, HSK 3.0 Level 1: lessons 101–120 with their readings and
 * dictionary words (database/content/hsk3/*.json). Idempotent — safe to re-run.
 * Check the content first: python scripts/review-oc3.py
 */
class Hsk3ContentSeeder extends Hsk2ContentSeeder
{
    public const FIRST_READING_ID = 201;

    protected const COURSE = '3.0';

    protected function files(): array
    {
        $files = glob(database_path('content/hsk3/*.json'));
        sort($files);

        return $files;
    }
}
