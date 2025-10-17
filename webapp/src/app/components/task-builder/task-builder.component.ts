import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { CommentsModalComponent } from '@kba-components/comments-modal/comments-modal.component';
import { ColumnId, Task, Tag, Attachment, Priority } from '@kba-models/task.model';
import { MatDialog } from '@angular/material/dialog';
import { UserContextService } from '@kba-services/user.context.service';
import { TaskService } from '@kba-services/task.service';
import { ViewTaskModalComponent } from '@kba-components/view-task-modal/view-task-modal.component';
import { TaskCheckListModalComponent } from '@kba-components/task-check-list-modal/task-check-list-modal.component';
import { TaskProviderService } from '@kba-services/tasks-provider.service';
import { TaskFilesModalComponent } from '@kba-components/task-files-modal/task-files-modal.component';


@Component({
    standalone: false,
    selector: 'app-task-builder',
    templateUrl: './task-builder.component.html',
    styleUrls: ['./task-builder.component.scss'],
    //   changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskBuilderComponent implements OnInit {
    @Input() userId!: string;
    @Input() task!: Task;
    @Input() columnId!: ColumnId;

    /** Bubble up drag events to parent */
    @Output() onDragStartTask = new EventEmitter<{ event: DragEvent; task: Task }>();
    @Output() onTaskUpdated = new EventEmitter<Task>();

    @Output() onEditTask = new EventEmitter<Task>();
    @Output() onDeleteTask = new EventEmitter<Task>();
    @Output() onShareTask = new EventEmitter<Task>();
    @Output() onAssignTask = new EventEmitter<Task>();

    // Track which task's dropdown is open
    openDropdownTagId: string | null = null;
    openDropdownPriorityId: string | null = null;

    tagsList: Tag[] = [];
    openMenuId: string | null = null;

    constructor(private dialog: MatDialog, private userCtx: UserContextService, private taskService: TaskService, public provider: TaskProviderService) {
        const { uid } = this.userCtx.requireUser();
        this.userId = uid;
        // this.tagsList = this.taskService.tagsList;
    }

    ngOnInit(): void {
        // this.initComponentElements();
    }

    async openViewsModal() {
        this.task.views[this.userId] = { at: Date.now() };

        const isOk = await this.taskService.update(this.task);


        const dialogRef = this.dialog.open(ViewTaskModalComponent, {
            width: '500px',
            maxHeight: '80vh',
            data: { task: this.task }
        });

        dialogRef.afterClosed().subscribe((result: any) => {
            if (result) {
            }
        });
    }

    openCommentsModal() {
        const dialogRef = this.dialog.open(CommentsModalComponent, {
            width: '500px',
            maxHeight: '80vh',
            data: { task: this.task }
        });

        dialogRef.afterClosed().subscribe((result: any) => {
            if (result) {
                console.log('New comment received:', result);
                // ✅ push to task.comments or refresh from Firebase
                // task.comments.push(result);
            }
        });
    }

    openCheckListModal() {
        const dialogRef = this.dialog.open(TaskCheckListModalComponent, {
            width: '500px',
            maxHeight: '80vh',
            data: { task: this.task }
        });

        dialogRef.afterClosed().subscribe((result: any) => {
            if (result) {
            }
        });
    }

    openTaskFilesModal() {
        const dialogRef = this.dialog.open(TaskFilesModalComponent, {
            width: '500px',
            maxHeight: '80vh',
            data: { task: this.task }
        });

        dialogRef.afterClosed().subscribe((result: any) => {
            if (result) {
            }
        });
    }




    initComponentElements() {
        // Show/hide more menu
        document.querySelectorAll('.more-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                e.stopPropagation(); // prevent closing immediately
                const menu: any = btn.nextElementSibling;
                // Hide other open menus
                document.querySelectorAll('.more-menu').forEach((m: any) => {
                    if (m !== menu) m.style.display = 'none';
                });
                // Toggle this menu
                menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
            });
        });

        // Hide menu on click outside
        document.addEventListener('click', () => {
            document.querySelectorAll('.more-menu').forEach((m: any) => m.style.display = 'none');
        });
    }

    getObjectTotal(data: { [item: string]: any }): number {
        if (!data) return 0;
        return Object.keys(data).length;
    }

    getAttachmentsTotal(attachments: { [by: string]: Attachment }, countUrls: boolean = true) {
        if (!attachments) return 0;
        if (countUrls) {
            return Object.values(attachments).reduce((total, a) => total + (a.files?.length || 0), 0);
        }
        return attachments ? Object.keys(attachments).length : 0;
    }

    onDragStart(ev: DragEvent, colId: ColumnId) {
        this.onDragStartTask.emit({ event: ev, task: this.task });
        if (ev.dataTransfer) {
            ev.dataTransfer.setData('text/plain', this.task.id);
            ev.dataTransfer.effectAllowed = 'move';
        }
    }

    toggleMenu(ev: Event) {
        ev.stopPropagation();
        this.openMenuId = this.openMenuId === this.task.id ? null : this.task.id;
    }

    editTask() {
        this.onEditTask.emit(this.task);
        this.openMenuId = null;
    }

    deleteTask() {
        const confirmed = confirm('Voulez-vous vraiment supprimer cette tâche ?');
        if (confirmed) {
            this.onDeleteTask.emit(this.task);
            this.openMenuId = null;
        }
    }


    shareTask() {
        this.onShareTask.emit(this.task);
        this.openMenuId = null;
    }

    assignTask() {
        this.onAssignTask.emit(this.task);
        this.openMenuId = null;
    }

    getTagClass(tag: string): string {
        switch (tag.toLowerCase()) {
            case 'urgent':
                return 'tag-urgent';
            case 'bug':
                return 'tag-bug';
            case 'feature':
                return 'tag-feature';
            case 'review':
                return 'tag-review';
            default:
                return 'tag-default';
        }
    }

    toggleDropdownTag(ev?: Event) {
        // if (ev) ev.stopPropagation();
        const tagId = this.task.tag?.id;
        this.openDropdownTagId = !tagId || this.openDropdownTagId === tagId ? null : tagId;
    }

    selectedTag(): Tag {
        return (this.provider.tagsList.find(t => t.id == this.task.tag?.id)) || this.provider.defaultTag;
    }

    selectTag(tag: Tag) {
        this.task.tag = tag;
        this.taskService.update(this.task);
    }




    toggleDropdownPriority(ev?: Event) {
        // if (ev) ev.stopPropagation();
        const pId = this.task.priority?.id;
        this.openDropdownPriorityId = !pId || this.openDropdownPriorityId === pId ? null : pId;
    }

    selectedPriority(): Priority {
        return (this.provider.prioritiesList.find(p => p.id == this.task.priority?.id)) || this.provider.defaultPriority;
    }

    selectPriority(p: Priority) {
        this.task.priority = p;
        this.taskService.update(this.task);
    }











    isChecklistFinished(): boolean {
        const doneLen = this.task.checklist ? this.task.checklist.filter(c => c.done?.ok == true).length : 0;
        const listLen = this.task.checklist ? this.task.checklist.length : 0
        return listLen > 0 && doneLen === listLen && this.task.columnId == 'done';
    }

    getChecklistProgress(): string {
        return this.task.checklist
            ? `${this.task.checklist.filter(c => c.done?.ok == true).length}/${this.task.checklist.length}`
            : '0/0';
    }

}
