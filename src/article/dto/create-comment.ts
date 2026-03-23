import { ApiProperty } from '@nestjs/swagger';

export class CreateCommentDto {
  @ApiProperty()
  readonly body: string;
}

export class CreateCommentRequestDto {
  @ApiProperty({ type: CreateCommentDto })
  readonly comment: CreateCommentDto;
}