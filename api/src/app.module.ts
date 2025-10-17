import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';

import { AuthModule } from './modules/auth.module';
import { TasksModule } from './modules/tasks.module';
import { NotificationsModule } from './notifications/notifications.module';
import { FirebaseAdminProvider } from './firebase-admin.providers';
import { AuthController } from './controllers/auth.controller';
import { UsersModule } from './modules/users.module';

@Module({
  controllers: [AuthController],
  imports: [
    // Load environment variables
    ConfigModule.forRoot({ isGlobal: true }),

    AuthModule,
    TasksModule,
    UsersModule,
    
    NotificationsModule,
  ],
  providers: [FirebaseAdminProvider],
  exports: [FirebaseAdminProvider],
})
export class AppModule {}
