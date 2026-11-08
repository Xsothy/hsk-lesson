<?php

namespace App\Services\Worksheet;

/** Layout choices for a worksheet. Built from validated request input or set directly (e.g. by F9). */
final readonly class WorksheetOptions
{
    public const GRIDS = ['tian', 'mi', 'plain'];

    public const CELLS = 12; // cells per row: 1 model + tracing copies + empty

    public function __construct(
        public string $grid = 'tian',
        public int $trace = 3,
        public bool $pinyin = true,
        public bool $english = true,
    ) {}

    public static function fromArray(array $in): self
    {
        return new self(
            grid: in_array($in['grid'] ?? null, self::GRIDS, true) ? $in['grid'] : 'tian',
            trace: max(0, min(self::CELLS - 1, (int) ($in['trace'] ?? 3))),
            pinyin: filter_var($in['pinyin'] ?? true, FILTER_VALIDATE_BOOL),
            english: filter_var($in['english'] ?? true, FILTER_VALIDATE_BOOL),
        );
    }
}
