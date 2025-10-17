// comments-modal.component.ts
import { Component, Inject, OnDestroy, OnInit, ViewChild, ElementRef } from '@angular/core';
import { BehaviorSubject, Subscription } from 'rxjs';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { CommentService } from '@kba-services/comment.service';
import { UserContextService } from '@kba-services/user.context.service';
import { SocketService } from '@kba-services/socket.service';
import { AppUser, Comments } from '@kba-models/task.model';
import { trigger, transition, style, animate } from '@angular/animations';  // ✅ import animations
import { TaskService } from '@kba-services/task.service';
import { Task } from '@kba-models/task.model';

import { User } from '@angular/fire/auth';


@Component({
    standalone: false,
    selector: 'app-comments-modal',
    templateUrl: './comments-modal.component.html',
    styleUrls: ['./comments-modal.component.scss'],
    animations: [
        trigger('fadeIn', [
            transition(':enter', [
                style({ opacity: 0, transform: 'translateY(10px)' }),
                animate('200ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))
            ])
        ]),
        trigger('bubbleAnim', [
            transition(':enter', [
                style({ transform: 'scale(0.9)' }),
                animate('150ms ease-out', style({ transform: 'scale(1)' }))
            ])
        ])
    ]
})
export class CommentsModalComponent implements OnInit, OnDestroy {
    task: Task;
    user!: AppUser;
    comments$ = new BehaviorSubject<Comments[]>([]);
    newComment = '';
    typingUser: string | null = null;
    darkMode = false;
    loading = true;

    selectedComment: Comments | null = null;

    private subscriptions: Subscription[] = [];
    private typingTimeout: any;

    @ViewChild('scrollMe') private scrollContainer!: ElementRef;

    constructor(
        private socket: SocketService,
        private commentService: CommentService,
        private taskService: TaskService,
        private userCtx: UserContextService,
        private dialogRef: MatDialogRef<CommentsModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        const { user } = this.userCtx.requireUser();
        this.user = user;
        this.task = data.task;
    }

    ngOnInit() {
        this.loadComments();

        // 🔹 nouveaux commentaires
        const sub = this.commentService.listenComments(this.task.id).subscribe((comment: Comments) => {
            const current = this.comments$.getValue();
            if (!current.find(c => c.id === comment.id)) {
                this.comments$.next([...current, comment].sort((a, b) => a.at - b.at));
                this.scrollToBottom();
            }
        });

        // 🔹 typing indicator
        const typingSub = this.socket.onTyping(this.task.id).subscribe((userId: string) => {
            if (userId !== this.user.uid) {
                this.typingUser = userId;
                clearTimeout(this.typingTimeout);
                this.typingTimeout = setTimeout(() => this.typingUser = null, 2000);
            }
        });

        this.subscriptions.push(sub, typingSub);
    }

    ngOnDestroy() {
        this.subscriptions.forEach(s => s.unsubscribe());
    }

    // =====================
    // LOAD
    // =====================
    async loadComments() {
        // const options = await this.userCtx.authHeaders();
        // this.commentService.getComments(this.task.id, options).subscribe(res => {
        //     this.loading = false;
        //     if (res.status === 200 && res.data) {
        //         this.comments$.next(res.data.sort((a: Comments, b: Comments) => a.at - b.at));
        //         this.scrollToBottom();
        //     }
        // });
        // const task = await this.taskService.get(this.task.id);

        if (this.task) {
            this.comments$.next(
                Array.isArray(this.task.comments)
                    ? [...this.task.comments].sort((a: Comments, b: Comments) => a.at - b.at)
                    : []
            );
            this.scrollToBottom();
        }
        this.loading = false;

    }

    // =====================
    // ADD
    // =====================
    async addComment() {
        const text = this.newComment.trim();
        if (!text) return;

        const timestamp = Date.now();

        // Crée le payload (nouveau ou mis à jour)
        let payload: Comments;

        if (this.selectedComment) {
            // ✅ Mise à jour d’un commentaire existant
            payload = {
                ...this.selectedComment,
                msg: text,
                updatedAt: timestamp,
                updatedBy: this.user.uid,
            };
        } else {
            // ✅ Nouveau commentaire
            payload = {
                id: `${timestamp}-${this.user.uid}`,
                msg: text,
                by: this.user.uid,
                at: timestamp,
            };
        }

        if (this.task) {
            // Initialise la liste des commentaires si nécessaire
            if (!Array.isArray(this.task.comments)) {
                this.task.comments = [];
            }

            if (this.selectedComment) {
                // ✅ Met à jour le commentaire existant dans la liste
                const index = this.task.comments.findIndex(c => c.id === this.selectedComment?.id);
                if (index !== -1) {
                    this.task.comments[index] = payload;
                }
            } else {
                // ✅ Ajoute un nouveau commentaire
                this.task.comments.push(payload);
            }

            // ✅ Enregistre la mise à jour de la tâche
            const isOk = await this.taskService.update(this.task);
            if (isOk) {
                this.newComment = '';
                this.selectedComment = null;
                this.comments$.next(this.task.comments);
                this.scrollToBottom();
            }
        }
    }


    // =====================
    // UPDATE
    // =====================
    saveEdit(c: Comments) {
        if (!c.msg.trim()) return;
        this.setComment(c, c.msg);
    }

    // =====================
    // CANCEL EDIT
    // =====================
    cancelEdit(c: Comments) {
        const current = this.comments$.getValue();
        this.comments$.next(current.map(x => x.id === c.id ? { ...x, editing: false } : x));
    }

    // =====================
    // SET
    // =====================
    async setComment(comment: Comments, newText: string) {
        const text = newText.trim();
        if (!text || !this.task) return;

        const timestamp = Date.now();
        const payload = { ...comment, msg: text, updatedBy: this.user.uid, updatedAt: timestamp };

        const comments = this.task.comments || [];

        const index = comments.findIndex(c => c.id === comment.id);
        if (index === -1) return;

        // Modify the comment
        comments[index].msg = text;
        comments[index].updatedAt = timestamp;
        comments[index].updatedBy = this.user.uid;



        this.task.comments = comments;
        const isOk = await this.taskService.update(this.task);
        // this.commentService.emitComment(this.task.id, payload);
        if (isOk) {
            // this.commentService.emitCommentUpdate(this.task.id, payload);
            const updated = this.comments$.getValue().map(c => c.id === comment.id ? { ...payload, editing: false } : c);
            this.comments$.next(updated);
        }
    }

    // =====================
    // EDIT
    // =====================
    async editComment(comment: Comments) {
        this.selectedComment = comment;
        this.newComment = comment.msg;
    }
    async cancelSelected() {
        this.selectedComment = null;
        this.newComment = '';
    }// =====================
    // DELETE
    // =====================
    async deleteComment(comment: Comments) {
        if (!this.task || !Array.isArray(this.task.comments)) return;

        const confirmed = confirm(
            "Êtes-vous sûr de vouloir supprimer définitivement ce commentaire ?\nCette action est irréversible."
        );

        if (!confirmed) return;

        // // Marquer le commentaire comme supprimé (soft delete) 
        // const updatedComments = this.task.comments.map(c => 
        // c.id === comment.id ? { ...c, deleted: true, deletedAt: Date.now(), deletedBy: this.user.uid } : c );

        // ✅ Supprimer définitivement le commentaire du tableau
        const updatedComments = this.task.comments.filter(c => c.id !== comment.id);
        this.task.comments = updatedComments;

        // ✅ Mettre à jour la tâche dans la base
        const isOk = await this.taskService.update(this.task);

        if (isOk) {
            this.comments$.next(updatedComments);
            this.commentService.emitCommentDelete(this.task.id, comment);
        }
    }


    // =====================
    // REACTIONS
    // =====================
    async addReaction(comment: Comments, reaction: string) {
        if (!this.task || !Array.isArray(this.task.comments)) return;

        // ✅ Met à jour la liste des réactions du commentaire concerné
        const updatedComments = this.task.comments.map(c => {
            if (c.id === comment.id) {
                const updatedReactions = Array.from(new Set([...(c.reactions || []), reaction]));
                return { ...c, reactions: updatedReactions };
            }
            return c;
        });

        // ✅ Met à jour la tâche localement
        this.task.comments = updatedComments;

        // ✅ Sauvegarde dans la base
        const isOk = await this.taskService.update(this.task);

        if (isOk) {
            this.comments$.next(updatedComments);
            this.commentService.emitCommentUpdate(this.task.id, {
                ...comment,
                reactions: comment.reactions ? [...comment.reactions, reaction] : [reaction]
            });
        }
    }


    // =====================
    // TYPING
    // =====================
    onTyping() {
        this.socket.emitTyping(this.task.id, this.user.uid);
    }

    // =====================
    // UTILS
    // =====================
    trackById(index: number, item: Comments) {
        return item.id;
    }

    scrollToBottom() {
        setTimeout(() => {
            if (this.scrollContainer) {
                this.scrollContainer.nativeElement.scrollTo({
                    top: this.scrollContainer.nativeElement.scrollHeight,
                    behavior: 'smooth'
                });
            }
        }, 100);
    }

    toggleDarkMode() {
        this.darkMode = !this.darkMode;
    }

    close() {
        this.dialogRef.close();
    }
}
