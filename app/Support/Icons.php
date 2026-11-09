<?php

namespace App\Support;

/** One inline SVG stroke icon set (24×24 viewBox, stroke = currentColor). Used by <x-icon> and components that take an icon name. */
class Icons
{
    public const PATHS = [
        'book' => '<path d="M4 5.5A2.5 2.5 0 0 1 6.5 3H20v15H6.5A2.5 2.5 0 0 0 4 20.5z"/><path d="M4 20.5A2.5 2.5 0 0 0 6.5 23H20v-5"/>',
        'pen' => '<path d="M4 20l4-1 11-11-3-3L5 16z"/><path d="M14 6l3 3"/>',
        'repeat' => '<path d="M17 2l3 3-3 3"/><path d="M4 11V9a4 4 0 0 1 4-4h12"/><path d="M7 22l-3-3 3-3"/><path d="M20 13v2a4 4 0 0 1-4 4H4"/>',
        'hanzi' => '<rect x="3" y="3" width="18" height="18" rx="3"/><path d="M7 9h10M12 6v12M8 14l-1 3M16 14l1 3"/>',
        'clock' => '<circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/>',
        'star' => '<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1-4.4-4.3 6.1-.9z"/>',
        'bookmark' => '<path d="M6 3h12v18l-6-4-6 4z"/>',
        'cards' => '<rect x="3" y="7" width="13" height="14" rx="2"/><path d="M8 3h11a2 2 0 0 1 2 2v12"/>',
        'arrow-right' => '<path d="M5 12h14M13 6l6 6-6 6"/>',
        'audio' => '<path d="M11 5L6 9H3v6h3l5 4z"/><path d="M15.5 8.5a5 5 0 0 1 0 7M18.5 5.5a9 9 0 0 1 0 13"/>',
        'search' => '<circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/>',
        'settings' => '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
        'user' => '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
        'close' => '<path d="M6 6l12 12M18 6L6 18"/>',
        'chevron-right' => '<path d="M9 6l6 6-6 6"/>',
        'chevron-down' => '<path d="M6 9l6 6 6-6"/>',
        'speech' => '<path d="M21 12a8 8 0 0 1-11.6 7.1L4 20l1-4.4A8 8 0 1 1 21 12z"/>',
        'pinyin' => '<path d="M4 18V8l4 6 4-6v10"/><path d="M15 6l2-2 2 2M17 18v-8"/>',
        'chart' => '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
        'tag' => '<path d="M3 12V4h8l10 10-8 8z"/><circle cx="7.5" cy="8.5" r="1.5"/>',
        'calendar' => '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
        'home' => '<path d="M3 11l9-8 9 8"/><path d="M5 9.5V21h14V9.5"/>',
        'layers' => '<path d="M12 3l9 5-9 5-9-5z"/><path d="M3 13l9 5 9-5"/>',
        'lesson' => '<path d="M4 19V6a2 2 0 0 1 2-2h12v15H6a2 2 0 0 0-2 2z"/><path d="M8 8h6"/>',
        'pencil' => '<path d="M4 20l4-1 10-10-3-3L5 16z"/><path d="M13 8l3 3"/>',
        'more' => '<circle cx="5" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="12" cy="12" r="1.8" fill="currentColor" stroke="none"/><circle cx="19" cy="12" r="1.8" fill="currentColor" stroke="none"/>',
        'tools' => '<path d="M14.7 6.3a4 4 0 0 0-5.4 5.4L3 18l3 3 6.3-6.3a4 4 0 0 0 5.4-5.4l-2.5 2.5-2.4-.6-.6-2.4z"/>',
    ];

    /** Emoji the old markup passed as an icon → icon name, so existing call sites keep working. */
    public const EMOJI = [
        '📖' => 'book', '✍️' => 'pen', '✍' => 'pen', '🔁' => 'repeat', '🔤' => 'hanzi', '⏰' => 'clock', '⭐' => 'star',
        '🔖' => 'bookmark', '🧠' => 'cards', '➡️' => 'arrow-right', '📚' => 'layers', '🏠' => 'home', '📊' => 'chart', '📛' => 'tag', '🐲' => 'calendar', '🔊' => 'audio', '🔍' => 'search', '⚙️' => 'settings', '👤' => 'user',
    ];

    /** Quiz answer mark (canvas "✓ " / "✕ " prefix) as an inline SVG. */
    public static function mark(bool $correct): string
    {
        $d = $correct ? 'M5 12.5l4.5 4.5L19 7.5' : 'M6 6l12 12M18 6L6 18';

        return '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="'.$d.'"/></svg>';
    }

    /** Icon name for an icon prop (name or legacy emoji), or null when it is something else. */
    public static function resolve(?string $icon): ?string
    {
        if ($icon === null || $icon === '') {
            return null;
        }
        if (isset(self::PATHS[$icon])) {
            return $icon;
        }

        return self::EMOJI[$icon] ?? null;
    }
}
