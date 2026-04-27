import { IsEmail, IsIn, IsOptional, IsString, MaxLength } from 'class-validator'

export class ShareAssetDto {
  @IsEmail()
  email: string

  @IsString()
  @IsIn(['comments', 'view'])
  mode: 'comments' | 'view'

  @IsOptional()
  @IsString()
  @MaxLength(500)
  note?: string
}
