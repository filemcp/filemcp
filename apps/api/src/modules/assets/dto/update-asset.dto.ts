import { IsString, IsOptional, IsEnum } from 'class-validator'
import { Visibility } from '@prisma/client'

export class UpdateAssetDto {
  @IsOptional()
  @IsString()
  title?: string

  @IsOptional()
  @IsEnum(Visibility)
  visibility?: Visibility
}
