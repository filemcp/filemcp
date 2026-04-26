import { IsString, IsOptional, IsEnum, IsNumber, IsEmail, Min, Max } from 'class-validator'
import { AnchorType } from '@prisma/client'

export class CreateCommentDto {
  @IsString()
  body: string

  // Required for top-level comments. Replies inherit versionId from parent — omit when parentId is set.
  @IsOptional()
  @IsString()
  versionId?: string

  @IsOptional()
  @IsEnum(AnchorType)
  anchorType?: AnchorType

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  xPct?: number

  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(1)
  yPct?: number

  @IsOptional()
  @IsString()
  selectorHint?: string

  @IsOptional()
  @IsNumber()
  lineStart?: number

  @IsOptional()
  @IsNumber()
  lineEnd?: number

  @IsOptional()
  @IsString()
  parentId?: string

  @IsOptional()
  @IsString()
  anonName?: string

  @IsOptional()
  @IsEmail()
  anonEmail?: string
}
