import { ApiProperty } from '@nestjs/swagger';

export class CreateArticleDto {
  @ApiProperty()
  readonly title: string;

  @ApiProperty()
  readonly description: string;

  @ApiProperty()
  readonly body: string;

  @ApiProperty({ type: [String] })
  readonly tagList: string[];
}

export class CreateArticleRequestDto {
  @ApiProperty({ type: CreateArticleDto })
  readonly article: CreateArticleDto;
}
