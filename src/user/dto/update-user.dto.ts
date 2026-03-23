import { ApiPropertyOptional } from '@nestjs/swagger';

export class UpdateUserDto {
  @ApiPropertyOptional()
  readonly username: string;

  @ApiPropertyOptional()
  readonly email: string;

  @ApiPropertyOptional()
  readonly bio: string;

  @ApiPropertyOptional()
  readonly image: string;
}

export class UpdateUserRequestDto {
  @ApiPropertyOptional({ type: UpdateUserDto })
  readonly user: UpdateUserDto;
}