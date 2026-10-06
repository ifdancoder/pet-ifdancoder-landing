<?php

namespace App\Models;

use Database\Factories\ProfilePhotoFactory;
use Illuminate\Database\Eloquent\Attributes\Fillable;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

/**
 * @property int $id
 * @property string $path
 * @property bool $is_active
 * @property int $sort_order
 */
#[Fillable(['path', 'is_active', 'sort_order'])]
class ProfilePhoto extends Model
{
    /** @use HasFactory<ProfilePhotoFactory> */
    use HasFactory;

    /**
     * @return array<string, string>
     */
    protected function casts(): array
    {
        return [
            'is_active' => 'boolean',
        ];
    }

    protected static function booted(): void
    {
        static::saved(function (ProfilePhoto $photo): void {
            if ($photo->is_active) {
                static::query()
                    ->whereKeyNot($photo->getKey())
                    ->where('is_active', true)
                    ->update(['is_active' => false]);
            }
        });
    }
}
