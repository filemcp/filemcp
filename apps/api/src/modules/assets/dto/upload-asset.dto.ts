import { IsString, IsOptional, IsEnum } from 'class-validator'
import { Visibility } from '@prisma/client'

export class UploadAssetDto {
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
