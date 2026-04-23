import { IsString, MinLength, Matches } from 'class-validator'

export class CreateOrgDto {
  @IsString()
  @MinLength(2)
  @Matches(/^[a-z0-9-]+$/, { message: 'slug must be lowercase alphanumeric with hyphens' })
  slug: string

  @IsString()
  @MinLength(1)
  name: string
}
