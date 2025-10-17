import { CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA, NgModule } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule, ReactiveFormsModule } from '@angular/forms';
import { HttpClientModule } from '@angular/common/http';
import { SharedModule } from '../../shared/shared.module';
import { TasksRoutingModule } from './tasks-routing.module';
import { TasksComponent } from './tasks.component';
import { TaskBuilderComponent } from '@kba-components/task-builder/task-builder.component';
import { TaskModalComponent } from '@kba-components/task-modal/task-modal.component';
import { CommentsModalComponent } from '@kba-components/comments-modal/comments-modal.component';
import { ViewTaskModalComponent } from '@kba-components/view-task-modal/view-task-modal.component';
import { TaskCheckListModalComponent } from '@kba-components/task-check-list-modal/task-check-list-modal.component';
import { TaskFilterModalComponent } from '@kba-components/task-filter-modal/task-filter-modal.component';
import { TaskFilesModalComponent } from '@kba-components/task-files-modal/task-files-modal.component';


@NgModule({
  declarations: [
    TasksComponent,
    TaskBuilderComponent,
    TaskModalComponent,
    ViewTaskModalComponent,
    CommentsModalComponent,
    TaskCheckListModalComponent,
    TaskFilterModalComponent,
    TaskFilesModalComponent
  ],
  imports: [
    CommonModule,
    FormsModule,
    ReactiveFormsModule,
    TasksRoutingModule,
    SharedModule,
    HttpClientModule,
  ],
  schemas: [CUSTOM_ELEMENTS_SCHEMA, NO_ERRORS_SCHEMA],

})
export class TasksModule { }
