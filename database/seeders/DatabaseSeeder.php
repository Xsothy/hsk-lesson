<?php

namespace Database\Seeders;

use App\Models\User;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    public function run(): void
    {
        User::firstOrCreate(
            ['email' => 'admin@hsk.test'],
            ['name' => 'Content Admin', 'password' => bcrypt(str()->random(40))],
        );

        $this->call(LegacyContentSeeder::class);
    }
}
