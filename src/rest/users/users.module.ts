import { Module } from '@nestjs/common';
import { UserRepositoryModule } from '../../repositories/user/user.module';
import { UsersController } from './users.controller';
import { UsersService } from './users.service';

@Module({
  imports: [UserRepositoryModule],
  controllers: [UsersController],
  providers: [UsersService],
})
export class UsersModule {}
