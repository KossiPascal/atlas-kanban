import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Observable, Subject } from 'rxjs';
import { environment } from '@kba-environments/environment';
import { Comments, TableName } from '@kba-models/task.model';
import { SocketService } from './socket.service';


@Injectable({ providedIn: 'root' })
export class CommentService {
    private modalSubject = new Subject<void>();
    tableName: TableName = 'tasks';
    private readonly base = environment.backendUrl;

    constructor(private http: HttpClient, private socket: SocketService) { }

    // =====================
    // 🔹 HTTP COMMENTS
    // =====================

    getComments(taskId: string, options: { headers: HttpHeaders }): Observable<{ status: number; data: any }> {
        return this.http.get<{ status: number; data: any }>(`${this.base}/api/${this.tableName}/${taskId}/comments`, options);
    }

    addComment(taskId: string, comment: { by: string, at: number, msg: any }, options: { headers: HttpHeaders } ): Observable<{ status: number; data: any }> {
        return this.http.post<{ status: number; data: any }>(`${this.base}/api/${this.tableName}/${taskId}/comments`, comment, options);
    }

    updateComment(taskId: string, comment: { id: string, by: string, at: number, msg: any }, options: { headers: HttpHeaders }): Observable<{ status: number; data: any }> {
        return this.http.put<{ status: number; data: any }>(`${this.base}/api/${this.tableName}/${taskId}/comments/${comment.id}`, comment, options);
    }

    deleteComment(taskId: string,commentId: string,options: { headers: HttpHeaders }): Observable<{ status: number; data: any }> {
        return this.http.delete<{ status: number; data: any }>(`${this.base}/api/${this.tableName}/${taskId}/comments/${commentId}`, options);
    }

    //   getComments(taskId: string, options: { headers: HttpHeaders }): Observable<Output> {
    //     return this.http.get<Output>(`${this.base}/api/${this.tableName}/${taskId}/comments`, options);
    //   }

    //   addComment(
    //     taskId: string,
    //     payload: { text: string; author: string;  },
    //     options: { headers: HttpHeaders }
    //   ): Observable<Output> {
    //     return this.http.post<Output>(
    //       `${this.base}/api/${this.tableName}/${taskId}/comments`,
    //       payload,
    //       options
    //     );
    //   }

    //   updateComment(
    //     taskId: string,
    //     commentId: string,
    //     payload: { text?: string;  },
    //     options: { headers: HttpHeaders }
    //   ): Observable<Output> {
    //     return this.http.put<Output>(
    //       `${this.base}/api/${this.tableName}/${taskId}/comments/${commentId}`,
    //       payload,
    //       options
    //     );
    //   }

    //   deleteComment(taskId: string, commentId: string, options: { headers: HttpHeaders }): Observable<Output> {
    //     return this.http.delete<Output>(
    //       `${this.base}/api/${this.tableName}/${taskId}/comments/${commentId}`,
    //       options
    //     );
    //   }


    // =====================
// 🔹 REAL-TIME COMMENTS
// =====================
listenComments(taskId: string): Observable<any> {
  // Returns an observable of incoming comments for this task
  return this.socket.onComment(taskId);
}

emitComment(  taskId: string, payload: { by: string, at: number, msg: any }): void {
  // Emit new comment with taskId, author, and timestamp
  this.socket.emitComment({ ...payload, taskId });
}

emitCommentUpdate(taskId: string, comment: Comments): void {
  // Emit updated comment with author + timestamp as key
  this.socket.emit('comments:update', { ...comment, taskId });
}

emitCommentDelete(taskId: string, comment: Comments): void {
  // Emit deleted comment with author + timestamp
  this.socket.emit('comments:delete', { ...comment, taskId });
}



    // // =====================
    // // 🔹 REAL-TIME COMMENTS
    // // =====================
    // listenComments(taskId: string): Observable<any> {
    //     return this.socket.onComment(taskId);
    // }

    // emitComment(taskId: string, payload: { text: string; author: string;  }): void {
    //     this.socket.emitComment({ ...payload, taskId });
    // }

    // emitCommentUpdate(taskId: string, comment: any): void {
    //     this.socket.emit('comments:update', { ...comment, taskId });
    // }

    // emitCommentDelete(taskId: string, commentId: string): void {
    //     this.socket.emit('comments:delete', { commentId, taskId });
    // }

    // =====================
    // 🔹 MODAL CONTROL
    // =====================
    closeModal(): void {
        this.modalSubject.next();
    }

    onModalClose(): Observable<void> {
        return this.modalSubject.asObservable();
    }
}
