import { Injectable, Logger } from '@nestjs/common';
import * as admin from 'firebase-admin';
import * as nodemailer from 'nodemailer';
import { ENV } from 'src/env';

const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS, SMTP_FROM } = ENV;

@Injectable()
export class NotificationsService {
  private messaging: admin.messaging.Messaging;
  private readonly logger = new Logger(NotificationsService.name);

  private transporter = nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT),
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });

  constructor() {
    this.messaging = admin.messaging();
  }

  /**
   * Envoyer une notification à un device via son token
   */
  async sendToDevice(token: string, title: string, body: string, data: Record<string, string> = {}) {
    try {
      const message = {
        notification: { title, body },
        token,
        data,
      };
      const response = await this.messaging.send(message);
      this.logger.log(`Notification envoyée: ${response}`);
      return response;
    } catch (error: any) {
      this.logger.error(`Erreur envoi notification: ${error.message}`);
      throw error;
    }
  }

  /**
   * Envoyer à plusieurs devices
   */
  async sendToDevices(tokens: string[], title: string, body: string, data: Record<string, string> = {}) {
    try {
      const message = {
        notification: { title, body },
        tokens,
        data,
      };
      const response = this.messaging.sendEachForMulticast(message);
      this.logger.log(`✅ Notifications envoyées à ${tokens.length} devices`);
      return response;
    } catch (err: any) {
      this.logger.error(`❌ Erreur envoi notifications: ${err.message}`);
      throw err;
    }
  }

  /**
   * Envoyer à un topic (ex: "tasks")
   */
  async sendToTopic(topic: string, title: string, body: string, data: Record<string, string> = {}) {
    try {
      const message = {
        notification: { title, body },
        topic,
        data,
      };
      const response = this.messaging.send(message);
      this.logger.log(`✅ Notification envoyée au topic "${topic}" - id: ${response}`);
      return response;
    } catch (err: any) {
      this.logger.error(`❌ Erreur envoi notification topic: ${err.message}`);
      throw err;
    }
  }

  /** Envoi d'email via nodemailer */
  async sendEmail(to: string, subject: string, html: string) {

    await this.transporter.sendMail({
      from: SMTP_FROM,
      to,
      subject,
      html,
    });
  }
}
