import { IsEmail, IsOptional, IsString, MaxLength, MinLength, Matches } from 'class-validator'

export class RegisterDto {
  @IsEmail()
  email: string

  @IsString()
  @Matches(/^[a-z0-9_-]{3,30}$/, {
    message: 'Username must be 3-30 chars, lowercase letters, numbers, hyphens, underscores only',
  })
  username: string

  @IsString()
  @MinLength(8)
  password: string

  @IsOptional()
  @IsString()
  @MaxLength(80)
  orgName?: string
}
