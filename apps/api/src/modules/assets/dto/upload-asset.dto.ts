import { IsString, IsOptional, IsEnum, Matches } from 'class-validator'
import { Visibility } from '@prisma/client'

export class UploadAssetDto {
  @IsOptional()
  @IsString()
  @Matches(/^[a-z0-9-]+$/, { message: 'Slug must be lowercase letters, numbers, and hyphens only' })
  slug?: string

  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsString()
  description?: string

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility
}
