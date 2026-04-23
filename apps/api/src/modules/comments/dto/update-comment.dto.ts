import { IsString, IsOptional, IsBoolean } from 'class-validator'

export class UpdateCommentDto {
  @IsOptional()
  @IsString()
  body?: string

  @IsOptional()
  @IsBoolean()
  resolved?: boolean
}
