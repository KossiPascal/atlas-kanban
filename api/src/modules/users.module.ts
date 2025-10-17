import { Module } from '@nestjs/common';
import { UsersController } from '../controllers/users.controller';
import { FirebaseAdminProvider } from '../firebase-admin.providers';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AuthModule } from 'src/modules/auth.module';
import { UsersService } from '../services/users.service';

@Module({
  controllers: [
    UsersController
  ],
  imports: [AuthModule, NotificationsModule],
  providers: [
    UsersService,
    FirebaseAdminProvider, 
  ],
  exports: [UsersService]
})
export class UsersModule {}
