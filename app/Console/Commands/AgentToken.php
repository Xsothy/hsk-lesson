<?php

namespace App\Console\Commands;

use App\Models\User;
use Illuminate\Console\Command;

class AgentToken extends Command
{
    protected $signature = 'hsk:agent-token
        {name : A label for the agent, e.g. "claude-content-bot"}
        {--read-only : Grant only content:read}
        {--email=admin@hsk.test : User account that owns the token}';

    protected $description = 'Create an API token for an AI agent to manage lesson content';

    public function handle(): int
    {
        $user = User::firstOrCreate(
            ['email' => $this->option('email')],
            ['name' => 'Content Admin', 'password' => bcrypt(str()->random(40))],
        );

        $abilities = $this->option('read-only') ? ['content:read'] : ['content:read', 'content:write'];
        $token = $user->createToken($this->argument('name'), $abilities);

        $this->info('Token created for "'.$this->argument('name').'" with abilities: '.implode(', ', $abilities));
        $this->line($token->plainTextToken);
        $this->comment('Store it now; it cannot be shown again. Use: Authorization: Bearer <token>');

        return self::SUCCESS;
    }
}
