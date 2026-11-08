<?php

namespace Tests\Feature;

use PHPUnit\Framework\TestCase;

/**
 * Alpha content rule (docs/alpha-plan.md §3.7): never copy hanzistroke.com content or
 * bundle publisher textbook word lists. Mentions are allowed inside docs/ only.
 */
class ContentRulesTest extends TestCase
{
    /** Directories scanned (docs/, vendor/, node_modules/, database/sources/ are excluded). */
    private const ROOTS = ['app', 'config', 'resources', 'routes', 'public', 'database/seeders', 'database/migrations', 'database/legacy', 'tests', 'scripts'];

    private const FORBIDDEN = [
        'hanzistroke',
        'integrated chinese',
        'new practical chinese reader',
        'hsk standard course',
        'boya chinese',
        'developing chinese',
    ];

    public function test_repo_has_no_hanzistroke_or_publisher_content(): void
    {
        $base = dirname(__DIR__, 2);
        $self = realpath(__FILE__);
        $hits = [];

        foreach (array_merge(self::ROOTS, ['README.md']) as $root) {
            $path = $base.'/'.$root;
            if (! file_exists($path)) {
                continue;
            }
            $files = is_dir($path)
                ? new \RecursiveIteratorIterator(new \RecursiveDirectoryIterator($path, \FilesystemIterator::SKIP_DOTS))
                : [new \SplFileInfo($path)];
            foreach ($files as $f) {
                if (! $f->isFile() || realpath($f->getPathname()) === $self) {
                    continue;
                }
                if (! preg_match('/\.(php|js|css|html|json|md|txt|csv|blade\.php)$/i', $f->getFilename()) || $f->getSize() > 5_000_000) {
                    continue;
                }
                $text = strtolower((string) file_get_contents($f->getPathname()));
                foreach (self::FORBIDDEN as $needle) {
                    if (str_contains($text, $needle)) {
                        $hits[] = str_replace($base.DIRECTORY_SEPARATOR, '', $f->getPathname())." contains \"{$needle}\"";
                    }
                }
            }
        }

        $this->assertSame([], $hits, "Forbidden third-party content references:\n".implode("\n", $hits));
    }
}
