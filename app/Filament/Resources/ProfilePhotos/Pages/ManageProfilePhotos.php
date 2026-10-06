<?php

namespace App\Filament\Resources\ProfilePhotos\Pages;

use App\Filament\Resources\ProfilePhotos\ProfilePhotoResource;
use Filament\Actions\CreateAction;
use Filament\Resources\Pages\ManageRecords;

class ManageProfilePhotos extends ManageRecords
{
    protected static string $resource = ProfilePhotoResource::class;

    protected function getHeaderActions(): array
    {
        return [
            CreateAction::make(),
        ];
    }
}
