import { Component, ElementRef, HostListener, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Task, AppUser, Files } from '@kba-models/task.model';
import { TaskService } from '@kba-services/task.service';
import { TaskProviderService } from '@kba-services/tasks-provider.service';
import { UserContextService } from '@kba-services/user.context.service';

@Component({
    standalone: false,
    selector: 'app-task-files-modal',
    templateUrl: './task-files-modal.component.html',
    styleUrls: ['./task-files-modal.component.scss'],
    // changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskFilesModalComponent implements OnInit, OnDestroy {

    // visibility
    task!: Task;

    user!: AppUser;

    private isEdited: boolean = false;

    files:Files[] = [];
    

    constructor(
        private el: ElementRef<HTMLElement>,
        private taskService: TaskService,
        public provider: TaskProviderService,
        private userCtx: UserContextService,
        private dialogRef: MatDialogRef<TaskFilesModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any

    ) { 
        const { user } = this.userCtx.requireUser();
        this.user = user;

        this.task = data.task;
    }

    // for files
    @ViewChild('fileInput') fileInputRef!: ElementRef<HTMLInputElement>;

    // paste support
    @HostListener('window:paste', ['$event'])
    onPaste(ev: ClipboardEvent) {
        const items = ev.clipboardData?.files;
        if (items && items.length) {
            this.handleFiles(Array.from(items));
        }
    }

    // ---------- SHORTCUTS / ACTIONS ----------
    @HostListener('window:keydown', ['$event'])
    handleKeydown(e: KeyboardEvent) {
        if (e.key === 'Escape') this.closeModal();
        if ((e.ctrlKey || e.metaKey) && e.key === 'Enter') {
            e.preventDefault();
            this.saveTask();
        }
    }

    // small helper to create unique ids
    private uid(prefix = 'id') {
        return prefix + Math.random().toString(36).slice(2, 9);
    }


    ngOnInit(): void {
        this.files = Object.values(this.task.attachments).flatMap(at => at.files);
    }


    ngOnDestroy(): void {
        // clean up any created object URLs
        this.files.forEach(f => {
            if (f.url) {
                try { URL.revokeObjectURL(f.url); } catch { }
            }
        });
    }

    onBackdropClick(event: MouseEvent) {
        const target = event.target as HTMLElement | null;
        if (target && target.id === 'backdrop') {
            this.closeModal();
        }
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

    // ---------- FILES ----------
    onFileInputChange(e: Event) {
        const input = e.target as HTMLInputElement;
        const files = input.files ? Array.from(input.files) : [];
        this.handleFiles(files);
        // reset input so same file can be selected again
        input.value = '';
    }

    handleFiles(files: File[]) {
        files.forEach(f => {
            const id = this.uid('f');
            const obj: any = { id, file: f, url: '', name: f.name, size: f.size };
            if (f.type.startsWith('image/')) obj.url = URL.createObjectURL(f);
            this.files.push(obj);
        });
    }

    removeFile(id: string) {
        const idx = this.files.findIndex(x => x.id === id);
        if (idx > -1) {
            const f = this.files[idx];
            if (f.url) try { URL.revokeObjectURL(f.url); } catch { }
            this.files.splice(idx, 1);
        }
    }

    // drag over/drop for dropzone
    onDropzoneDragOver(ev: DragEvent) {
        ev.preventDefault();
    }

    onDropzoneDrop(ev: DragEvent) {
        ev.preventDefault();
        const files = ev.dataTransfer?.files ? Array.from(ev.dataTransfer.files) : [];
        if (files.length) this.handleFiles(files);
    }


    async saveTask() {

        if (this.files.length > 0) {
            if (!this.task.attachments) this.task.attachments = {} as any;
            const files = this.files.map(f => ({ id: f.id, name: f.name, url: f.url, file: f.file, size: f.size }));
            this.task.attachments[this.user.uid] = { at: Date.now(), files };
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
