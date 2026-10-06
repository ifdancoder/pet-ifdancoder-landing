<?php

namespace App\Http\Controllers;

use App\Models\ProfilePhoto;
use App\Models\Project;
use Illuminate\Support\Facades\Storage;
use Inertia\Inertia;
use Inertia\Response;

class HomeController extends Controller
{
    public function __invoke(): Response
    {
        $projects = Project::query()
            ->orderBy('sort_order')
            ->get()
            ->map(fn (Project $project): array => [
                'title' => $project->title,
                'slug' => $project->slug,
                'description' => $project->description,
                'stack' => $project->stack,
                'status' => $project->status,
                'url' => $project->url,
                'image' => $project->image ? Storage::url($project->image) : null,
            ]);

        $activePhoto = ProfilePhoto::query()
            ->where('is_active', true)
            ->orderBy('sort_order')
            ->first();

        return Inertia::render('welcome', [
            'projects' => $projects,
            'profilePhoto' => $activePhoto ? Storage::url($activePhoto->path) : null,
        ]);
    }
}
