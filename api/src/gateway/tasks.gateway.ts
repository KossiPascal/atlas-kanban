import {
  WebSocketGateway,
  WebSocketServer,
  OnGatewayConnection,
  OnGatewayDisconnect,
  OnGatewayInit,
  SubscribeMessage,
  MessageBody,
  ConnectedSocket,
} from '@nestjs/websockets';
import { Logger } from '@nestjs/common';
import { Server, Socket } from 'socket.io';

@WebSocketGateway({
  cors: {
    origin: '*', // ⚠️ à restreindre en prod
  },
  namespace: '/tasks', // namespace dédié
})
export class TasksGateway implements OnGatewayInit, OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(TasksGateway.name);

  /** Initialisation du Gateway */
  afterInit(server: Server) {
    this.logger.log('✅ WebSocket Gateway initialisé');
  }

  /** Quand un client se connecte */
  handleConnection(client: Socket) {
    this.logger.log(`📡 Client connecté: ${client.id}`);
  }

  /** Quand un client se déconnecte */
  handleDisconnect(client: Socket) {
    this.logger.warn(`❌ Client déconnecté: ${client.id}`);
  }

  /**
   * Broadcast générique pour mise à jour de tâches
   */
  broadcastTaskUpdate(event: string, payload: any) {
    if (this.server) {
      this.server.emit('task:update', { event, payload });
      this.logger.debug(`📢 Broadcast event "${event}"`);
    }
  }

  /** Diffuser une notification */
  broadcastNotification(message: string, userId?: string) {
    if (this.server) {
      this.server.emit('notification', { message, userId });
    }
  }

  /**
   * Émission ciblée à un client
   */
  sendToClient(clientId: string, event: string, payload: any) {
    const client = this.server.sockets.sockets.get(clientId);
    if (client) {
      client.emit(event, payload);
      this.logger.debug(`🎯 Event "${event}" envoyé à ${clientId}`);
    }
  }

  /**
   * Émission à une room (par ex. "project:123")
   */
  sendToRoom(room: string, event: string, payload: any) {
    this.server.to(room).emit(event, payload);
    this.logger.debug(`🏠 Event "${event}" envoyé à la room ${room}`);
  }

  /**
   * Permet à un client de rejoindre une room spécifique
   */
  @SubscribeMessage('joinRoom')
  handleJoinRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    client.join(data.room);
    this.logger.log(`👥 Client ${client.id} a rejoint la room ${data.room}`);
    return { status: 'ok', room: data.room };
  }

  /**
   * Permet à un client de quitter une room
   */
  @SubscribeMessage('leaveRoom')
  handleLeaveRoom(@MessageBody() data: { room: string }, @ConnectedSocket() client: Socket) {
    client.leave(data.room);
    this.logger.log(`👤 Client ${client.id} a quitté la room ${data.room}`);
    return { status: 'ok', room: data.room };
  }

  /**
   * Notifications spécifiques aux tâches
   */
  notifyTaskCreated(task: any) {
    this.broadcastTaskUpdate('created', task);
  }

  notifyTaskUpdated(task: any) {
    this.broadcastTaskUpdate('updated', task);
  }

  notifyTaskDeleted(taskId: string) {
    this.broadcastTaskUpdate('deleted', { id: taskId });
  }
}
