<?php

namespace Database\Seeders;

use App\Models\ProfilePhoto;
use App\Models\Project;
use App\Models\User;
use Illuminate\Database\Console\Seeds\WithoutModelEvents;
use Illuminate\Database\Seeder;

class DatabaseSeeder extends Seeder
{
    use WithoutModelEvents;

    /**
     * Seed the application's database.
     */
    public function run(): void
    {
        // User::factory(10)->create();

        User::factory()->create([
            'name' => 'Test User',
            'email' => 'test@example.com',
        ]);

        Project::create([
            'title' => 'payments-core',
            'slug' => 'payments-core',
            'description' => 'Сервис обработки платежей: идемпотентность, очереди, ретраи без дублей.',
            'stack' => 'Laravel · PostgreSQL · RabbitMQ',
            'status' => 'in production',
            'sort_order' => 1,
        ]);

        Project::create([
            'title' => 'realtime-sync',
            'slug' => 'realtime-sync',
            'description' => 'Синхронизация данных между сервисами в реальном времени без потери консистентности.',
            'stack' => 'Go · Redis · gRPC',
            'status' => 'case study soon',
            'sort_order' => 2,
        ]);

        Project::create([
            'title' => 'infra-toolkit',
            'slug' => 'infra-toolkit',
            'description' => 'Внутренние инструменты для деплоя, мониторинга и быстрого расследования инцидентов.',
            'stack' => 'Docker · Kubernetes · CI/CD',
            'status' => 'concept',
            'sort_order' => 3,
        ]);

        ProfilePhoto::create([
            'path' => 'profile-photos/profile.jpg',
            'is_active' => true,
            'sort_order' => 1,
        ]);
    }
}
