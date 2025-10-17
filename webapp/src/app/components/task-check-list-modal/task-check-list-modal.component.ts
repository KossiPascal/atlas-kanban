import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Inject, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { CommentsModalComponent } from '@kba-components/comments-modal/comments-modal.component';
import { Task, CheckItem, AppUser } from '@kba-models/task.model';
import { TaskService } from '@kba-services/task.service';
import { UserContextService } from '@kba-services/user.context.service';


@Component({
    standalone: false,
    selector: 'app-task-check-list-modal',
    templateUrl: './task-check-list-modal.component.html',
    styleUrls: ['./task-check-list-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskCheckListModalComponent implements OnInit, OnDestroy {

    // visibility
    @Input() task!: Task;
    @Output() save = new EventEmitter<Task>();
    @Output() close = new EventEmitter<boolean>();

    user!: AppUser;

    draggingId: string | null = null;

    state = {
        checklist: [] as CheckItem[],
        newCheckText: '',
    };

    private isEdited: boolean = false;


    constructor(
        private userCtx: UserContextService,
        private taskService: TaskService,
        private dialogRef: MatDialogRef<TaskCheckListModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
        const { user } = this.userCtx.requireUser();
        this.user = user;
        this.task = data.task;
    }

    // for files
    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;


    // ---------- SHORTCUTS / ACTIONS ----------
    @HostListener('window:keydown', ['$event'])
    handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') this.closeModal();
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.saveTask();
        }
    }


    ngOnInit(): void {
        this.initializeApp()
    }

    initializeApp() {
        this.state.checklist = this.task.checklist ?? [];
    }

    ngOnDestroy(): void {
    }

    onBackdropClick(e: MouseEvent) {
        // const target = e.target as HTMLElement | null;
        // if (target && target.id === 'backdrop') {
        //     this.closeModal();
        // }
    }

    getInitials(name: string): string {
        if (!name) return '';
        return name
            .split(' ')
            .map(part => part[0])
            .slice(0, 2)
            .join('')
            .toUpperCase();
    }

    withOpacity(hex: string, alpha: number): string {
        // On enlève le '#' si présent
        hex = hex.replace('#', '');

        // Si format court (#f00), on l’étend (#ff0000)
        if (hex.length === 3) {
            hex = hex.split('').map(c => c + c).join('');
        }

        // Clamp alpha entre 0 et 1
        alpha = Math.max(0, Math.min(1, alpha));

        // Conversion alpha en 2 caractères hex
        const alphaHex = Math.round(alpha * 255).toString(16).padStart(2, '0');

        return `#${hex}${alphaHex}`;
    }

    // small helper to create unique ids
    private uid(prefix = 'id') {
        return prefix + Math.random().toString(36).slice(2, 9);
    }

    // ---------- CHECKLIST ----------
    onDoneChange(event: Event, ck: CheckItem) {
        const checked = (event.target as HTMLInputElement).checked;
        const currentUser = this.user.uid ?? 'Unknown User';

        // Toujours créer l'objet done s'il n'existe pas
        ck.done = {
            ok: checked,
            by: checked ? currentUser : '',
            at: checked ? Date.now() : 0
        };
        this.isEdited = true;
    }

    addCheckItem() {
        const v = this.state.newCheckText.trim();
        if (!v) return;
        const currentUser = this.user.uid ?? 'Unknown User';

        const check: CheckItem = {
            id: this.uid('ck'),
            name: v,
            created: { by: currentUser, at: Date.now() }
        }
        this.state.checklist.push(check);
        this.state.newCheckText = '';
        this.isEdited = true;
    }
    removeCheckItem(id: string) {
        this.state.checklist = this.state.checklist.filter(c => c.id !== id);
        this.isEdited = true;
    }
    duplicateCheckItem(id: string) {
        const it = this.state.checklist.find(c => c.id === id);
        if (!it) return;
        const currentUser = this.user.uid ?? 'Unknown User';
        const dup: CheckItem = {
            id: this.uid('ck'),
            name: it.name,
            done: { ok: false, by: '', at: 0 },
            created: { by: currentUser, at: Date.now() }
        };
        const idx = this.state.checklist.findIndex(c => c.id === id);
        (this.state.checklist as CheckItem[]).splice(idx + 1, 0, dup);
        this.isEdited = true;
    }
    onCheckDragStart(ev: DragEvent, id: string) {
        this.draggingId = id;
        ev.dataTransfer?.setData('text/plain', id);
        setTimeout(() => { }, 10);
    }
    onCheckDragEnd() {
        this.draggingId = null;
        this.isEdited = true;
    }

    onCheckDragOver(ev: DragEvent, overId: string) {
        ev.preventDefault();
        if (!this.draggingId || this.draggingId === overId) return;
        const fromIdx = this.state.checklist.findIndex(c => c.id === this.draggingId);
        const toIdx = this.state.checklist.findIndex(c => c.id === overId);
        if (fromIdx === -1 || toIdx === -1) return;
        // move element
        const [item] = this.state.checklist.splice(fromIdx, 1);
        this.state.checklist.splice(toIdx, 0, item);
    }


    async saveTask() {
        if (this.state.checklist && this.state.checklist.length > 0) {
            this.task.checklist = this.state.checklist.flatMap(c => {
                return { id: c.id, name: c.name, done: c.done, created: c.created, updated: c.updated };
            });
        }

        const isOk = await this.taskService.update(this.task);
        if (isOk) {
            this.isEdited = false;
            this.closeModal();
        }
    }

    closeModal() {
        let isConfirmed = false;

        if (this.isEdited) {
            isConfirmed = confirm(
                "Vous n'avez pas sauvegardé vos modifications.\n" +
                "Si vous continuez, les changements non enregistrés seront perdus. Voulez-vous vraiment poursuivre ?"
            );
        }

        if (!this.isEdited || isConfirmed) {
            this.dialogRef.close();
        }
    }


}
