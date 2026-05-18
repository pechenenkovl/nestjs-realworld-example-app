import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model } from 'mongoose';
import { Tag, TagDocument } from './tag.schema';

@Injectable()
export class TagService {
  constructor(
    @InjectModel(Tag.name)
    private readonly tagModel: Model<TagDocument>
  ) {}

  async findAll(): Promise<TagDocument[]> {
    return await this.tagModel.find().exec();
  }

}
