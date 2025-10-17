// socket.service.ts
import { Injectable, NgZone, OnDestroy } from '@angular/core';
import { io, Socket } from 'socket.io-client';
import { Observable, Subject, Subscription, timer, interval } from 'rxjs';
import { environment } from '@kba-environments/environment';
import { UserContextService } from './user.context.service';

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket?: Socket;
  private reconnectBackoffMs = 2000;
  private reconnectSubscription?: Subscription;
  private refreshSubscription?: Subscription;

  // Local simulation
  private localTaskUpdate$ = new Subject<any>();
  private localNotification$ = new Subject<any>();
  private localComment$ = new Subject<any>();

  constructor(private userCtx: UserContextService, private ngZone: NgZone) {}

  /**
   * Connect WebSocket with auth (remote mode) or simulate locally.
   */
  async connect(url?: string, useLocal = false): Promise<void> {
    if (useLocal) {
      console.warn('[SocketService] Running in LOCAL simulation mode');
      return;
    }

    const token = await this.userCtx.getIdToken();
    if (!token) throw new Error('User not authenticated');

    this.socket = io(url || environment.backendUrl, {
      transports: ['websocket'],
      auth: { token },
    });

    this.socket.on('connect', () =>
      console.log('[SocketService] Connected:', this.socket?.id)
    );

    this.socket.on('disconnect', (reason) => {
      console.warn('[SocketService] Disconnected:', reason);
      this.scheduleReconnect();
    });

    this.socket.on('connect_error', (err) => {
      console.error('[SocketService] Connect error:', err);
      this.scheduleReconnect();
    });

    // Auto-refresh token every 15min
    this.refreshSubscription = interval(15 * 60 * 1000).subscribe(() =>
      this.refreshToken()
    );
  }

  /**
   * Refresh auth token and reconnect safely.
   */
  private async refreshToken(): Promise<void> {
    if (!this.socket) return;

    const newToken = await this.userCtx.getIdToken(true);
    if (!newToken) {
      console.warn('[SocketService] Cannot refresh token, user may be logged out');
      return;
    }

    (this.socket.io.opts as any).auth = { token: newToken };
    if (this.socket.connected) {
      this.socket.disconnect();
      this.socket.connect();
    } else {
      this.socket.connect();
    }
  }

  private scheduleReconnect() {
    this.reconnectSubscription?.unsubscribe();
    this.reconnectSubscription = timer(this.reconnectBackoffMs).subscribe(() => {
      console.log('[SocketService] Trying reconnect...');
      this.refreshToken().catch((err) => {
        console.error('[SocketService] Reconnect failed:', err);
        this.scheduleReconnect();
      });
    });
  }

  // =====================
  // 🔹 TASK EVENTS
  // =====================
  emitTaskUpdate(task: any): void {
    if (this.socket) this.socket.emit('tasks:update', task);
    else this.localTaskUpdate$.next(task);
  }

  onTaskUpdate(): Observable<any> {
    return this.listenOrSimulate('tasks:updated', this.localTaskUpdate$);
  }

  // =====================
  // 🔹 NOTIFICATION EVENTS
  // =====================
  emitNotification(notification: any): void {
    if (this.socket) this.socket.emit('notification:update', notification);
    else this.localNotification$.next(notification);
  }

  onNotification(): Observable<any> {
    return this.listenOrSimulate('notification:update', this.localNotification$);
  }

  // =====================
  // 🔹 COMMENT EVENTS
  // =====================
  emitComment(comment: any): void {
    if (this.socket) this.socket.emit('comments:add', comment);
    else this.localComment$.next(comment);
  }

  onComment(taskId: string): Observable<any> {
    if (this.socket) {
      return new Observable((observer) => {
        this.socket?.on('comments:added', (msg: any) => {
          if (msg.taskId === taskId) {
            this.ngZone.run(() => observer.next(msg));
          }
        });
        return () => this.socket?.off('comments:added');
      });
    } else {
      return this.localComment$.asObservable();
    }
  }

  // =====================
  // 🔹 GENERIC API
  // =====================
  emit(event: string, data?: any): void {
    if (this.socket) this.socket.emit(event, data);
  }

  on<T>(event: string, callback: (data: T) => void): void {
    this.socket?.on(event, (data: T) => this.ngZone.run(() => callback(data)));
  }

  private listenOrSimulate(event: string, subject: Subject<any>): Observable<any> {
    if (this.socket) {
      return new Observable((observer) => {
        this.socket?.on(event, (msg: any) =>
          this.ngZone.run(() => observer.next(msg))
        );
        return () => this.socket?.off(event);
      });
    } else {
      return subject.asObservable();
    }
  }

  // =====================
  // 🔹 CLEANUP
  // =====================
  disconnect(): void {
    this.refreshSubscription?.unsubscribe();
    this.reconnectSubscription?.unsubscribe();
    this.socket?.disconnect();
    this.socket = undefined;
  }

  ngOnDestroy(): void {
    this.disconnect();
  }

  isConnected(): boolean {
    return !!this.socket?.connected;
  }



  // =====================
  // 🔹 TYPING
  // =====================
  onTyping(taskId: string): Observable<string> {
    return new Observable(observer => {
      this.socket?.on(`typing:${taskId}`, (userId: string) => {
        observer.next(userId);
      });
    });
  }

  emitTyping(taskId: string, userId: string): void {
    this.socket?.emit('typing', { taskId, userId });
  }
}
