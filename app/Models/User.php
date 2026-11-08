<?php

namespace App\Models;

// use Illuminate\Contracts\Auth\MustVerifyEmail;
use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Str;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    /**
     * Get the attributes that should be cast.
     *
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /**
     * Set a new password and sign out every web session (remember-me tokens included),
     * optionally keeping one session id (the one that made the change).
     */
    public function resetPasswordAndSessions(string $plain, ?string $keepSessionId = null): void
    {
        $this->forceFill(['password' => $plain, 'remember_token' => Str::random(60)])->save();
        DB::table('sessions')->where('user_id', $this->id)
            ->when($keepSessionId, fn ($q) => $q->where('id', '!=', $keepSessionId))
            ->delete();
    }

    /** Remove the account and everything tied to it. Includes the S2 sync snapshot. */
    public function deleteAccount(): void
    {
        DB::transaction(function () {
            DB::table('sessions')->where('user_id', $this->id)->delete();
            $this->tokens()->delete();
            DB::table('sync_states')->where('user_id', $this->id)->delete();
            $this->delete();
        });
    }
}
