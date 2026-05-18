import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as argon2 from 'argon2';

export type UserDocument = User & Document;

@Schema({ collection: 'users', timestamps: false })
export class User {

  @Prop({ required: true, unique: true })
  username: string;

  @Prop({ required: true, unique: true })
  email: string;

  @Prop({ default: '' })
  bio: string;

  @Prop({ default: '' })
  image: string;

  @Prop({ required: true })
  password: string;

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Article' }], default: [] })
  favorites: Types.ObjectId[];

  @Prop({ type: [{ type: Types.ObjectId, ref: 'Article' }], default: [] })
  articles: Types.ObjectId[];
}

export const UserSchema = SchemaFactory.createForClass(User);

UserSchema.pre<UserDocument>('save', async function () {
  if (this.isModified('password')) {
    this.password = await argon2.hash(this.password);
  }
});
