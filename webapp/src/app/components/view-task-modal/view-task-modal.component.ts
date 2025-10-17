import { Component, Inject, Input, OnDestroy, OnInit } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { Task, CheckItem, Tag, Files, AppUser, Priority } from '@kba-models/task.model';
import { TaskProviderService } from '@kba-services/tasks-provider.service';
import { UserContextService } from '@kba-services/user.context.service';
import { UserService } from '@kba-services/user.service';

@Component({
    standalone: false,
    selector: 'app-view-task-modal',
    templateUrl: './view-task-modal.component.html',
    styleUrls: ['./view-task-modal.component.scss'],
    // changeDetection: ChangeDetectionStrategy.OnPush
})
export class ViewTaskModalComponent implements OnInit, OnDestroy {

    // visibility
    @Input() task!: Task ;
    @Input() user!: AppUser;

    state = {
        tags: [] as Tag[],
        assignees: [] as AppUser[],
        checklist: [] as CheckItem[],
        files: [] as Files[],

        assigneeQuery: '',
        newCheckText: '',
        priority: '',
        newTag: { name: '', color: '#ff7a7a' },

        usersList: [] as AppUser[],
        prioritiesList: [] as Priority[],
    };



    constructor(
        private userCtx: UserContextService,
        private taskProvider: TaskProviderService,
        private userService: UserService,
        private dialogRef: MatDialogRef<ViewTaskModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) { 
        this.initializeApp()
    }




    ngOnInit(): void {
    }

    async initializeApp() {
        
        this.task = this.data.task;
        
        const { user } = this.userCtx.requireUser();

        this.state.usersList = await this.userService.getUsers();

        this.user = user;

        this.state.tags = [...this.taskProvider.tagsList];

        this.state.prioritiesList = this.taskProvider.prioritiesList;

        this.state.assignees = this.state.usersList.filter(u => Object.keys(this.task.assignTo ?? {}).includes(u.uid)) as any[];
        this.state.checklist = (this.task.checklist ?? []);
        this.state.files = Object.values(this.task.attachments).flatMap(at => at.files);
    }

    ngOnDestroy(): void {
        // clean up any created object URLs
        this.state.files.forEach(f => {
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



    closeModal() {
        this.dialogRef.close();
    }

}
