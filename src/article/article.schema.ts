import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import { CommentSchema } from './comment.schema';

export type ArticleDocument = Article & Document;

@Schema({ collection: 'articles', timestamps: true })
export class Article {

  @Prop({ required: true, unique: true })
  slug: string;

  @Prop({ required: true })
  title: string;

  @Prop({ default: '' })
  description: string;

  @Prop({ default: '' })
  body: string;

  @Prop({ type: [String], default: [] })
  tagList: string[];

  @Prop({ type: Types.ObjectId, ref: 'User' })
  author: Types.ObjectId;

  @Prop({ type: [CommentSchema], default: [] })
  comments: Array<{ _id: Types.ObjectId; body: string; createdAt?: Date }>;

  @Prop({ default: 0 })
  favoriteCount: number;
}

export const ArticleSchema = SchemaFactory.createForClass(Article);
