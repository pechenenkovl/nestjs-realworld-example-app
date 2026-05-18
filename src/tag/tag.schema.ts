import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type TagDocument = Tag & Document;

@Schema({ collection: 'tags' })
export class Tag {

  @Prop({ required: true })
  tag: string;
}

export const TagSchema = SchemaFactory.createForClass(Tag);
