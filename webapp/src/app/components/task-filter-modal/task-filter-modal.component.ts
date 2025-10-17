import { ChangeDetectionStrategy, Component, Inject, Input, OnInit, OnDestroy } from '@angular/core';
import { MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { TaskFilter } from '@kba-models/task.model';
import { TaskProviderService } from '@kba-services/tasks-provider.service';
import { UserContextService } from '@kba-services/user.context.service';
import { UserService } from '@kba-services/user.service';

interface Options { value: any, label: string }

@Component({
    standalone: false,
    selector: 'app-task-filter-modal',
    templateUrl: './task-filter-modal.component.html',
    styleUrls: ['./task-filter-modal.component.scss'],
    changeDetection: ChangeDetectionStrategy.OnPush,
})
export class TaskFilterModalComponent implements OnInit, OnDestroy {
    @Input() userId!: string;
    @Input() filter!: TaskFilter;

    prioritiesList: Options[] = [];
    assignedList: Options[] = [];
    tagsList: Options[] = [];

    constructor(
        private provider: TaskProviderService,
        private userService: UserService,
        private userCtx: UserContextService,
        private dialogRef: MatDialogRef<TaskFilterModalComponent>,
        @Inject(MAT_DIALOG_DATA) public data: any
    ) {
    }

    ngOnInit(): void {
        this.initialiseApp();
    }

    ngOnDestroy(): void { }


    async initialiseApp(){
        const { uid } = this.userCtx.requireUser();
        this.userId = uid;

        const usersList = await this.userService.getUsers()
        this.assignedList = usersList.map(u => ({ value: u.uid, label: `${u.displayName ?? ''}  ${u.email ? ('(' + u.email + ')') : ''}` }));
        this.tagsList = this.provider.tagsList.map(u => ({ value: u.id, label: u.name }));
        this.prioritiesList = this.provider.prioritiesList.map(u => ({ value: u.id, label: u.name }));

        this.filter = this.data.filter || {
            priority: null,
            assigned: null,
            tag: null,
            startDate: null,
            endDate: null,
        };
    }


    onApply(): void {
        // Optionally validate date range
        if (this.filter.startDate && this.filter.endDate && this.filter.startDate > this.filter.endDate) {
            alert('La date de début ne peut pas être postérieure à la date de fin.');
            return;
        }

        this.dialogRef.close(this.filter);
    }

    onClose(): void {
        this.dialogRef.close();
    }
}
