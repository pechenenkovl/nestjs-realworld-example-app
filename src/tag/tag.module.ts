import {MiddlewareConsumer, Module, NestModule} from '@nestjs/common';
import { MongooseModule } from '@nestjs/mongoose';
import { UserModule } from '../user/user.module';
import { TagService } from './tag.service';
import { Tag, TagSchema } from './tag.schema';
import { TagController } from './tag.controller';

@Module({
  imports: [MongooseModule.forFeature([{ name: Tag.name, schema: TagSchema }]), UserModule],
  providers: [TagService],
  controllers: [
    TagController
  ],
  exports: []
})
export class TagModule implements NestModule {
  public configure(consumer: MiddlewareConsumer) {
  }
}
