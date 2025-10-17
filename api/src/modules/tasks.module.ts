import { Module } from '@nestjs/common';
import { TasksController } from '../controllers/tasks.controller';
import { TasksService } from '../services/tasks.service';
import { FirebaseAdminProvider } from '../firebase-admin.providers';
import { TasksGateway } from '../gateway/tasks.gateway';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { AuthModule } from 'src/modules/auth.module';

@Module({
  controllers: [
    TasksController
  ],
  imports: [AuthModule, NotificationsModule],
  providers: [
    TasksService, 
    FirebaseAdminProvider, 
    TasksGateway
  ],
  exports: [TasksService]
})
export class TasksModule {}
