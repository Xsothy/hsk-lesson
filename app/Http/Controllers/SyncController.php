<?php

namespace App\Http\Controllers;

use Illuminate\Http\JsonResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

/**
 * S2 · Cross-device sync. The client (public/js/sync.js) merges; the server stores one validated snapshot per user
 * with a revision number. A push must name the revision it merged against, else 409 and the client pulls again.
 */
class SyncController extends Controller
{
    public const MAX_BYTES = 1_000_000;

    /** Domain => expected JSON shape. */
    public const DOMAINS = ['progress' => 'object', 'srs' => 'object', 'saved' => 'array', 'streak' => 'object',
        'settings' => 'object', 'activity' => 'object', 'quiz' => 'object', 'last' => 'object', 'lists' => 'object', 'match' => 'object'];

    public function pull(Request $request): JsonResponse
    {
        $row = DB::table('sync_states')->where('user_id', $request->user()->id)->first();

        return response()->json([
            'rev' => $row ? (int) $row->rev : 0,
            'state' => $row ? json_decode($row->state, true) : null,
        ]);
    }

    public function push(Request $request): JsonResponse
    {
        if (strlen($request->getContent()) > self::MAX_BYTES) {
            return response()->json(['message' => 'Payload too large.'], 413);
        }
        $rev = $request->input('rev');
        $state = self::clean($request->input('state'));
        if (! is_int($rev) || $rev < 0 || $state === null) {
            return response()->json(['message' => 'Invalid sync payload.'], 422);
        }

        $userId = $request->user()->id;
        $json = json_encode($state, JSON_UNESCAPED_UNICODE);

        return DB::transaction(function () use ($userId, $rev, $json) {
            $current = (int) (DB::table('sync_states')->where('user_id', $userId)->lockForUpdate()->value('rev') ?? 0);
            if ($current !== $rev) {
                return response()->json(['message' => 'Stale revision.', 'rev' => $current], 409);
            }
            $now = now();
            if ($current === 0 && ! DB::table('sync_states')->where('user_id', $userId)->exists()) {
                DB::table('sync_states')->insert(['user_id' => $userId, 'rev' => 1, 'state' => $json, 'created_at' => $now, 'updated_at' => $now]);
            } else {
                DB::table('sync_states')->where('user_id', $userId)->update(['rev' => $current + 1, 'state' => $json, 'updated_at' => $now]);
            }

            return response()->json(['rev' => $current + 1]);
        });
    }

    /** Structural validation: v=1, known domains with the right shape, numeric stamps. Unknown domains are dropped. */
    public static function clean(mixed $state): ?array
    {
        if (! is_array($state) || ($state['v'] ?? null) !== 1 || ! is_array($state['data'] ?? null)) {
            return null;
        }
        $data = [];
        foreach (self::DOMAINS as $key => $shape) {
            if (! array_key_exists($key, $state['data']) || $state['data'][$key] === null) {
                continue;
            }
            $v = $state['data'][$key];
            $ok = is_array($v) && ($shape === 'array' ? array_is_list($v) : ($v === [] || ! array_is_list($v)));
            if (! $ok) {
                return null;
            }
            if ($key === 'saved' && array_filter($v, fn ($w) => ! is_string($w))) {
                return null;
            }
            $data[$key] = $v === [] && $shape === 'object' ? new \stdClass : $v;
        }
        $stamps = $state['stamps'] ?? [];
        if (! is_array($stamps) || ($stamps !== [] && array_is_list($stamps))) {
            return null;
        }
        foreach ($stamps as $k => $t) {
            if (! is_string($k) || ! is_numeric($t) || $t < 0) {
                return null;
            }
        }

        return ['v' => 1, 'data' => $data, 'stamps' => $stamps === [] ? new \stdClass : $stamps];
    }
}
