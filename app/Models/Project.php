<?php

namespace App\Models;

use Database\Factories\ProjectFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $title
 * @property string $slug
 * @property string $description
 * @property string $stack
 * @property string $status
 * @property string|null $url
 * @property string|null $image
 * @property int $sort_order
 */
#[Fillable(['title', 'slug', 'description', 'stack', 'status', 'url', 'image', 'sort_order'])]
class Project extends Model
{
    /** @use HasFactory<ProjectFactory> */
    use HasFactory;
}
