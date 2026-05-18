import { MiddlewareConsumer, Module, NestModule, RequestMethod } from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ArticleController } from './article.controller';
import { Article, ArticleSchema } from './article.schema';
import { User, UserSchema } from '../user/user.schema';
import { Follow, FollowSchema } from '../profile/follow.schema';
import { ArticleService } from './article.service';
import { AuthMiddleware } from '../user/auth.middleware';
import { UserModule } from '../user/user.module';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: Article.name, schema: ArticleSchema },
      { name: User.name, schema: UserSchema },
      { name: Follow.name, schema: FollowSchema }
    ]),
    UserModule
  ],
  providers: [ArticleService],
  controllers: [
    ArticleController
  ]
})
export class ArticleModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes(
        {path: 'articles/feed', method: RequestMethod.GET},
        {path: 'articles', method: RequestMethod.POST},
        {path: 'articles/:slug', method: RequestMethod.DELETE},
        {path: 'articles/:slug', method: RequestMethod.PUT},
        {path: 'articles/:slug/comments', method: RequestMethod.POST},
        {path: 'articles/:slug/comments/:id', method: RequestMethod.DELETE},
        {path: 'articles/:slug/favorite', method: RequestMethod.POST},
        {path: 'articles/:slug/favorite', method: RequestMethod.DELETE});
  }
}
