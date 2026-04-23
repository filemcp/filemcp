import { IsString, MinLength } from 'class-validator'

export class CreateKeyDto {
  @IsString()
  @MinLength(1)
  name!: string
}
