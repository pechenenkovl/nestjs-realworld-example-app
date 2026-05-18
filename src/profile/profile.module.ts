import {MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { ProfileController } from './profile.controller';
import { ProfileService } from './profile.service';
import { UserModule } from '../user/user.module';
import { User, UserSchema } from '../user/user.schema';
import { Follow, FollowSchema } from './follow.schema';
import { AuthMiddleware } from '../user/auth.middleware';

@Module({
  imports: [
    MongooseModule.forFeature([
      { name: User.name, schema: UserSchema },
      { name: Follow.name, schema: FollowSchema }
    ]),
    UserModule
  ],
  providers: [ProfileService],
  controllers: [
    ProfileController
  ],
  exports: []
})
export class ProfileModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({path: 'profiles/:username/follow', method: RequestMethod.ALL});
  }
}
