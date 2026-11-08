<?php

namespace App\Models;

use Database\Factories\UserFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Attributes\Hidden;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Foundation\Auth\User as Authenticatable;
use Illuminate\Notifications\Notifiable;
use Illuminate\Support\Facades\DB;
use Laravel\Sanctum\HasApiTokens;

#[Fillable(['name', 'email', 'password'])]
#[Hidden(['password', 'remember_token', 'google_id'])]
class User extends Authenticatable
{
    /** @use HasFactory<UserFactory> */
    use HasApiTokens, HasFactory, Notifiable;

    protected function casts(): array
    {
        return [
            'email_verified_at' => 'datetime',
            'password' => 'hashed',
        ];
    }

    /** Find or create the account for an email address that was just proven (magic link / Google). */
    public static function forVerifiedEmail(string $email): self
    {
        $user = self::firstOrCreate(['email' => strtolower(trim($email))]);
        if (! $user->email_verified_at) {
            $user->forceFill(['email_verified_at' => now()])->save();
        }

        return $user;
    }

    /** Remove the account and everything tied to it. S2: delete the user's sync rows here too (or FK cascade). */
    public function deleteAccount(): void
    {
        DB::transaction(function () {
            DB::table('sessions')->where('user_id', $this->id)->delete();
            $this->tokens()->delete();
            LoginToken::where('email', $this->email)->delete();
            $this->delete();
        });
    }
}
