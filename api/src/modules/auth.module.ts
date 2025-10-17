import { Module } from '@nestjs/common';
import { FirebaseAdminProvider } from '../firebase-admin.providers';
import { AuthController } from '../controllers/auth.controller';
import { AuthService } from '../services/auth.service';
import { NotificationsModule } from 'src/notifications/notifications.module';
import { EmailService } from 'src/services/email.service';

@Module({
    controllers: [
        AuthController
    ],
    imports: [NotificationsModule],
    providers: [AuthService, EmailService, FirebaseAdminProvider],
    exports: [AuthService, EmailService, ]
})
export class AuthModule { }

