<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Support\Str;

/** Single-use magic-link token; only its SHA-256 hash is persisted. */
class LoginToken extends Model
{
    public const TTL_MINUTES = 15;

    protected $fillable = ['email', 'token_hash', 'expires_at', 'used_at'];

    protected function casts(): array
    {
        return ['expires_at' => 'datetime', 'used_at' => 'datetime'];
    }

    /** @return array{0: self, 1: string} the stored row and the plain token (never persisted or logged) */
    public static function issue(string $email): array
    {
        $plain = Str::random(64);
        $row = self::create([
            'email' => $email,
            'token_hash' => hash('sha256', $plain),
            'expires_at' => now()->addMinutes(self::TTL_MINUTES),
        ]);

        return [$row, $plain];
    }

    /** Atomically consume a valid token; returns the row, or null if unknown, used or expired. */
    public static function consume(string $plain): ?self
    {
        $row = self::where('token_hash', hash('sha256', $plain))->first();
        if (! $row || $row->used_at || $row->expires_at->isPast()) {
            return null;
        }
        $claimed = self::whereKey($row->id)->whereNull('used_at')->update(['used_at' => now()]);

        return $claimed ? $row : null;
    }
}
