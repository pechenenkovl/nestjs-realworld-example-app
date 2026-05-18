import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document } from 'mongoose';

export type CommentDocument = Comment & Document;

@Schema({ timestamps: true })
export class Comment {

  @Prop({ required: true })
  body: string;
}

export const CommentSchema = SchemaFactory.createForClass(Comment);
