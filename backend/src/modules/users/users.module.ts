import { Module } from '@nestjs/common';
import { SelfRegisterController } from './self-register.controller';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  controllers: [UsersController, SelfRegisterController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
