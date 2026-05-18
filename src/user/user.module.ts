import {MiddlewareConsumer, Module, NestModule, RequestMethod} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserController } from './user.controller';
import { User, UserSchema } from './user.schema';
import { UserService } from './user.service';
import { AuthMiddleware } from './auth.middleware';

@Module({
  imports: [MongooseModule.forFeature([{ name: User.name, schema: UserSchema }])],
  providers: [UserService],
  controllers: [
    UserController
  ],
  exports: [UserService]
})
export class UserModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(AuthMiddleware)
      .forRoutes({path: 'user', method: RequestMethod.GET}, {path: 'user', method: RequestMethod.PUT});
  }
}
