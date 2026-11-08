<?php

namespace App\Services\Worksheet;

/** One practice row: a character, its stroke outlines (Make Me a Hanzi) and optional labels. */
final readonly class WorksheetItem
{
    /** @param list<string> $strokes SVG path per stroke, in stroke order */
    public function __construct(
        public string $char,
        public array $strokes,
        public ?string $pinyin = null,
        public ?string $english = null,
    ) {}
}
