<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;
use Illuminate\Support\Str;

/** Owner-only password reset (the app sends no email). Prints a temporary password once. */
class ResetPassword extends Command
{
    protected $signature = 'hsk:reset-password {email : The account email}';

    protected $description = 'Give a user a random temporary password and sign out all their sessions';

    public function handle(): int
    {
        $user = User::where('email', Str::lower(trim($this->argument('email'))))->first();
        if (! $user) {
            $this->error('No user with that email.');

            return self::FAILURE;
        }

        $temp = Str::password(16, symbols: false);
        $user->resetPasswordAndSessions($temp);

        $this->line('Temporary password for '.$user->email.': '.$temp);
        $this->line('Shown once. All their sessions and remember-me logins were ended; ask them to change it on /account.');

        return self::SUCCESS;
    }
}
