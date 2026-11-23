import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from './user.entity';
import { Module } from '@nestjs/common/decorators/modules/module.decorator';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [TypeOrmModule.forFeature([User]), MailModule],
  controllers: [UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
