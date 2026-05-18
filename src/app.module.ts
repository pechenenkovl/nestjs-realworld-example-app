import { Module } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { AppController } from './app.controller';
import { ArticleModule } from './article/article.module';
import { UserModule } from './user/user.module';
import { ProfileModule } from './profile/profile.module';
import { TagModule } from './tag/tag.module';
import { MONGO_URI } from './config';

@Module({
  imports: [
    MongooseModule.forRoot(MONGO_URI),
    ArticleModule,
    UserModule,
    ProfileModule,
    TagModule
  ],
  controllers: [
    AppController
  ],
  providers: []
})
export class ApplicationModule {}
