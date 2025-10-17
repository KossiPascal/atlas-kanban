import { Component, OnInit } from '@angular/core';
import { MatDialog } from '@angular/material/dialog';
import { TaskFilterModalComponent } from '@kba-components/task-filter-modal/task-filter-modal.component';
import { ColumnId, Column, Task, TaskFilter } from '@kba-models/task.model';
import { ColumnService } from '@kba-services/column.service';
import { TaskService } from '@kba-services/task.service';
import { TaskProviderService } from '@kba-services/tasks-provider.service';
import { UserContextService } from '@kba-services/user.context.service';

@Component({
  standalone: false,
  selector: 'app-tasks',
  templateUrl: './tasks.component.html',
  styleUrls: ['./tasks.component.scss']
})
export class TasksComponent implements OnInit {
  userId: string;

  columns: Column[] = [];
  tasksMap: { [columnId: string]: Task[] } = {};

  modalOpen = false;
  modalColumnId!: ColumnId;
  selectedTask: Task | null = null;
  openMenuId: string | null = null;

  // Drag & Drop state
  draggedTask: Task | null = null;
  dragOverColId: ColumnId | null = null;
  ghostEl: HTMLElement | null = null;
  draggedTaskHeight: number | null = null;
  draggedFrom: { colId: ColumnId, index: number } | null = null;
  dropIndex: { colId: string; taskIndex: number } | null = null;

  filter: TaskFilter = {
    priority: null,
    assigned: null,
    tag: null,
    startDate: null,
    endDate: null,
  };

  filterCount: number = 0;

  constructor(
    private taskService: TaskService,
    private columnService: ColumnService,
    private userCtx: UserContextService,
    private dialog: MatDialog,
    private provider: TaskProviderService
  ) {
    this.userId = this.userCtx.requireUser()?.uid;
  }


  async ngOnInit(): Promise<void> {
    this.columns = await this.columnService.list();
    // await this.taskService.syncFromServer();
    await this.generateTasks();
  }

  // ---------------------- Tasks ----------------------
  // private async loadTasks() {
  //   for (const col of this.columns) {
  //     if (col?.id) {
  //       try {
  //         this.tasksMap[col.id] = await this.taskService.getByField('columnId', col.id);
  //       } catch {
  //         this.tasksMap[col.id] = [];
  //       }
  //     }
  //   }
  // }

  openFilterModal() {
    const dialogRef = this.dialog.open(TaskFilterModalComponent, {
      width: '500px',
      maxHeight: '80vh',
      data: { userId: this.userId, filter: this.filter }
    });

    dialogRef.afterClosed().subscribe((res?: TaskFilter) => {
      if (res) {

        const priorityCount = res.priority && res.priority.length > 0 ? 1 : 0;
        const assignedCount = res.assigned && res.assigned.length > 0 ? 1 : 0;
        const tagCount = res.tag && res.tag.length > 0 ? 1 : 0;
        const dateCount = res.startDate && res.startDate.length > 0 ? 1 : 0;

        this.filterCount = priorityCount + assignedCount + tagCount + dateCount;

        this.filter = res;

        this.generateTasks();
      }
    });


  }

  async generateTasks(forceUseRemote: boolean = false) {
    let tasksResp: Task[] = [];

    try {
      const ids = this.columns.map(c => c.id);
      tasksResp = await this.taskService.bulkGet<Task>(
        { field: "columnId", value: ids },
        forceUseRemote
      );
    } catch (error) {
      console.error("Failed to load tasks:", error);
      tasksResp = [];
    }

    // ✅ Destructure filters
    const { priority, assigned, tag, startDate, endDate } = this.filter;

    // ✅ Apply filters only if provided
    const filteredTasks = tasksResp.filter(task => {

      if (task.deleted == true) {
        return false;
      } 

      let match = true;

      if (!task.priority) {
        task.priority = this.provider.defaultPriority;
      }

      // 🔹 Priority filter
      if (priority && priority.length > 0 && !priority.includes(task.priority.id)) {
        match = false;
      }

      // 🔹 Assigned filter
      if (assigned && assigned.length > 0) {
        const assignedUsers = task.assignTo ? Object.keys(task.assignTo) : [];
        const hasMatch = assigned.some(user => assignedUsers.includes(user));
        if (!hasMatch) match = false;
      }

      // 🔹 Tag filter
      if (tag && tag.length > 0) {
        const tagId = typeof task.tag === 'object' ? (task.tag as any).id : task.tag;
        if (!tag.includes(tagId)) match = false;
      }

      // 🔹 Date filters (on due)
      if (startDate && task.due && task.due >= new Date(startDate).getTime()) {
        match = false;
      }

      if (endDate && task.due && task.due <= new Date(endDate).getTime()) {
        match = false;
      }

      return match;
    });

    // ✅ Group and sort by column
    for (const col of this.columns) {
      if (!col?.id) continue;

      const tasks = filteredTasks
        .filter(t => t.columnId === col.id)
        .sort((a, b) => {
          const ao = (a as any).order ?? Number.MAX_SAFE_INTEGER;
          const bo = (b as any).order ?? Number.MAX_SAFE_INTEGER;
          if (ao !== bo) return ao - bo;
          return (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
        });

      this.tasksMap[col.id] = tasks.length > 0 ? tasks : [];
    }
    // let tasksResp: Task[] = [];

    // try {
    //   const ids = this.columns.map(c => c.id)
    //   tasksResp = await this.taskService.bulkGet<Task>({ field: "columnId", value: ids }, forceUseRemote);
    // } catch (error) {
    //   console.error("Failed to load tasks:", error);
    //   tasksResp = [];
    // }


    // for (const col of this.columns) {
    //   if (!col?.id) continue;
    //   const tasks = tasksResp.filter(t => t.columnId == col.id);

    //   // Trier par order si présent, sinon par updatedAt pour consistance
    //   tasks.sort((a, b) => {
    //     const ao = (a as any).order ?? Number.MAX_SAFE_INTEGER;
    //     const bo = (b as any).order ?? Number.MAX_SAFE_INTEGER;
    //     if (ao !== bo) return ao - bo;
    //     return (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
    //   });
    //   this.tasksMap[col.id] = tasks && tasks.length > 0 ? tasks : [];
    // }


    // for (const col of this.columns) {
    //   if (!col?.id) continue;
    //   try {
    //     const tasks = await this.taskService.getByField("columnId", col.id);

    //     console.log(tasks)
    //     // Trier par order si présent, sinon par updatedAt pour consistance
    //     tasks.sort((a, b) => {
    //       const ao = (a as any).order ?? Number.MAX_SAFE_INTEGER;
    //       const bo = (b as any).order ?? Number.MAX_SAFE_INTEGER;
    //       if (ao !== bo) return ao - bo;
    //       return (a.updatedAt ?? 0) - (b.updatedAt ?? 0);
    //     });
    //     this.tasksMap[col.id] = tasks;
    //   } catch (error) {
    //     console.error("Failed to load tasks for column:", col.id, error);
    //     this.tasksMap[col.id] = [];
    //   }
    // }
  }

  getColumnTaks(colId: ColumnId): Task[] {
    return this.tasksMap[colId] || [];
  }


  getPlaceholderIndex(colId: ColumnId): number | null {
    return this.dropIndex?.colId === colId ? this.dropIndex.taskIndex : null;
  }


  // dans la classe du component
  private originalDragEl: HTMLElement | null = null;

  // ---------------------- Drag & Drop ----------------------
  onDragTaskStart(ev: DragEvent, task: Task, index: number, colId: ColumnId) {
    if (!ev.dataTransfer) return;
    const el = ev.target as HTMLElement;

    this.originalDragEl = el;
    this.draggedTask = task;
    this.draggedFrom = { colId, index };

    // Capturer la hauteur de l'élément source
    this.draggedTaskHeight = el.offsetHeight; // <- stocke dans une propriété de la classe

    // Créer le clone (ghost) et appliquer styles INLINE (important)
    const ghost = el.cloneNode(true) as HTMLElement;

    // Copier les styles calculés
    // const style = window.getComputedStyle(el);
    // for (let i = 0; i < style.length; i++) {
    //   const prop = style.item(i);
    //   ghost.style.setProperty(
    //     prop,
    //     style.getPropertyValue(prop),
    //     style.getPropertyPriority(prop)
    //   );
    // }

    ghost.classList.add('ghost-clone');

    // Styles inline sûrs pour apparaître incliné et propre
    ghost.style.position = 'absolute';
    ghost.style.top = '-9999px';    // hors écran (visible mais hors écran)
    ghost.style.left = '0';
    ghost.style.pointerEvents = 'none';
    ghost.style.zIndex = '999999';
    ghost.style.opacity = '1';
    // ghost.style.transform = 'rotate(30deg) scale(1.02)'; // ROTATION -> 30deg
    ghost.style.transformOrigin = 'center center';
    ghost.style.boxShadow = '0 10px 30px rgba(0,0,0,0.25)';
    ghost.style.borderRadius = window.getComputedStyle(el).borderRadius || '4px';
    ghost.style.width = `${el.offsetWidth}px`; // préserver la taille
    ghost.style.height = `${el.offsetHeight}px`;
    ghost.style.overflow = 'hidden';

    // Ajouter dans le DOM temporairement
    document.body.appendChild(ghost);

    // Sauvegarder le ghost pour le nettoyer plus tard
    this.ghostEl = ghost;


    // Utiliser comme image fantôme
    ev.dataTransfer.setDragImage(ghost, 120, 30);
    // ev.dataTransfer.setDragImage(ghost, ghost.offsetWidth / 2, ghost.offsetHeight / 2);
    ev.dataTransfer.effectAllowed = 'move';

    // Masquer uniquement la source (opacity 0 + height 0)
    requestAnimationFrame(() => {
      try {
        // centrer l'image fantôme sous le curseur
        const offsetX = Math.round(ghost.offsetWidth / 2);
        const offsetY = Math.round(ghost.offsetHeight / 2);
        ev.dataTransfer?.setDragImage(ghost, offsetX, offsetY);
      } catch (err) {
        // certains navigateurs/browsers peuvent échouer silencieusement
        // on ignore l'erreur pour ne pas casser le drag
        // console.warn('setDragImage failed', err);
      }

      // masquer visuellement la source (classe CSS existante)
      // préfère ne pas utiliser display:none (doit garder le flux) — classe avec opacity/height 0
      el.classList.add('drag-source-hidden');
    });
  }

  onDragTaskEnd(ev: DragEvent) {
    // Nettoyer ghost & Restaurer avec animation inverse
    this.cleanupDrag(ev);
  }

  // onDragOverColumn(ev: DragEvent, colId: ColumnId, colTasks: Task[]) {
  //   ev.preventDefault();
  //   if (!this.draggedTask) return;

  //   const container = ev.currentTarget as HTMLElement;
  //   const yLocal = ev.clientY - container.getBoundingClientRect().top;

  //   const taskEls = Array.from(container.querySelectorAll<HTMLElement>('.task-item'))
  //     .filter(el => !el.classList.contains('drag-source-hidden'));

  //   let insertIndex = taskEls.length;
  //   for (let i = 0; i < taskEls.length; i++) {
  //     const rect = taskEls[i].getBoundingClientRect();
  //     const midpoint = rect.top - container.getBoundingClientRect().top + rect.height / 2;
  //     if (yLocal < midpoint) {
  //       insertIndex = i;
  //       break;
  //     }
  //   }

  //   // Correction pour la même colonne
  //   if (this.draggedFrom?.colId === colId && Number.isFinite(this.draggedFrom.index)) {
  //     const fromIndex = this.draggedFrom.index;
  //     // si on descend dans la même colonne, le nouvel index doit inclure l’élément déplacé
  //     if (insertIndex > fromIndex) insertIndex--;
  //     // si on remonte, l’index est correct
  //   }

  //   insertIndex = Math.max(0, Math.min(insertIndex, colTasks.length));

  //   this.dropIndex = { colId, taskIndex: insertIndex };
  //   this.dragOverColId = colId;
  // }


  private lastDragOver = 0; // throttling pour dragover

  placeholderIndexMap: { [colId: string]: number } = {};

  onDragOverColumn(ev: DragEvent, colId: ColumnId, colTasks: Task[]) {
    ev.preventDefault();
    if (!this.draggedTask) return;

    // Throttling léger
    const now = performance.now();
    if (now - (this.lastDragOver ?? 0) < 12) return;
    this.lastDragOver = now;

    this.dragOverColId = colId;

    const container = ev.currentTarget as HTMLElement;
    if (!container) return;

    const containerRect = container.getBoundingClientRect();
    const yLocal = (ev.clientY ?? 0) - containerRect.top;

    // Les éléments visibles (on exclut la source masquée)
    const taskEls = Array.from(container.querySelectorAll<HTMLElement>('.task-item'))
      .filter(el => !el.classList.contains('drag-source-hidden'));

    // 1) index relatif au DOM (0 .. taskEls.length)
    let insertIndexDOM = taskEls.length; // défaut = insérer à la fin

    if (taskEls.length === 0) {
      insertIndexDOM = 0; // colonne vide → insérer au début
    } else {
      for (let i = 0; i < taskEls.length; i++) {
        const r = taskEls[i].getBoundingClientRect();
        const midpoint = (r.top - containerRect.top) + r.height / 2;
        if (yLocal < midpoint) {
          insertIndexDOM = i;
          break;
        }
      }
    }

    // 2) mapping DOM -> index logique (0 .. colTasks.length)
    //    si on est dans la même colonne et que la source est absente du DOM (cas normal),
    //    insertIndexDOM correspond directement à l'index dans la liste "sans la tâche".
    let finalIndex = insertIndexDOM;

    // 3) ajustement si déplacement dans la même colonne
    if (this.draggedFrom?.colId === colId && Number.isFinite(this.draggedFrom.index)) {
      const fromIndex = this.draggedFrom.index;
      // cas 1: source *est* masquée dans le DOM => taskEls.length === colTasks.length - 1
      if (taskEls.length === Math.max(0, (colTasks?.length ?? 0) - 1)) {
        // finalIndex = insertIndexDOM (car on insère dans la liste sans la tâche)
        finalIndex = insertIndexDOM > fromIndex ? insertIndexDOM + 1 : insertIndexDOM;
      } else {
        // fallback : la source est visible dans le DOM (rare) => corriger si on descend
        finalIndex = insertIndexDOM > fromIndex ? insertIndexDOM - 1 : insertIndexDOM;
      }
    }

    // clamp finalIndex entre 0 et colTasks.length (on permet drop à la fin)
    finalIndex = Math.max(0, Math.min(finalIndex, (colTasks?.length ?? 0)));

    this.dropIndex = { colId, taskIndex: finalIndex };
    // this.placeholderIndexMap[colId] = finalIndex;
  }

  // onDropInColumn(ev: DragEvent, colId: ColumnId, colTasks: Task[]) {
  //   ev.preventDefault();
  //   if (!this.draggedTask || !this.dropIndex) return;

  //   this.taskService.moveTask(this.draggedTask.id, colId, this.dropIndex.taskIndex)
  //     .then(() => this.generateTasks())
  //     .finally(() => this.cleanupDrag(ev));
  // }

  async onDropInColumn(ev: DragEvent, colId: ColumnId, colTasks: Task[]) {
    ev.preventDefault();
    if (!this.draggedTask || !this.draggedFrom || !this.dropIndex) return;

    const fromIndex = this.draggedFrom.index;
    const toIndex = this.dropIndex.taskIndex;

    // si aucun changement réel
    if (this.draggedFrom.colId === colId && fromIndex === toIndex) {
      this.cleanupDrag(ev);
      return;
    }

    // Appliquer le déplacement via le service (il va gérer la réindexation persistée)
    await this.taskService.moveTask(this.draggedTask.id, colId, fromIndex, toIndex);

    // recharger l'affichage
    await this.generateTasks();
    this.cleanupDrag(ev);
  }


  onDragLeaveColumn(ev: DragEvent, colId: ColumnId) {
    if (this.dragOverColId === colId) this.dragOverColId = null;
  }

  private cleanupDrag(ev?: DragEvent) {
    // restaurer la source si on l'a gardée
    if (this.originalDragEl) {
      this.originalDragEl.classList.remove('drag-source-hidden');
      this.originalDragEl = null;
    }

    // supprimer le ghost (s'il existe)
    if (this.ghostEl) {
      // éviter suppression immédiate dans quelques navigateurs -> safe remove
      this.ghostEl.remove();
      this.ghostEl = null;
    }

    this.dragOverColId = null;
    this.draggedTask = null;
    this.dropIndex = null;
    this.placeholderIndexMap = {};
    this.draggedFrom = null;
    this.draggedTaskHeight = null;
  }

  // ---------------------- Modal & CRUD Tasks ----------------------
  addTask(colId: ColumnId) {
    this.selectedTask = null;
    this.modalColumnId = colId;
    this.modalOpen = true;
  }

  editTask(task: Task) {
    this.selectedTask = task;
    this.modalColumnId = task.columnId;
    this.modalOpen = true;
  }

  async deleteTask(task: Task) {
    try {
      const isOk = await this.taskService.save({ ...task, deleted: true });
      if (isOk) {
        await this.generateTasks();
      }
    } catch (error) {

    }
    // await this.taskService.delete(task.id);
    // await this.generateTasks();
  }

  async saveTask(task: Task) {
    try {
      const isOk = await this.taskService.save(task);
      if (isOk) {
        await this.generateTasks();
        this.modalOpen = false;
        console.log('SAVE PAYLOAD', task);
      }
    } catch (error) {

    }
  }

  closeModal($event: boolean) {
    this.modalOpen = false
  }

  shareTask(task: Task) { console.log('Share task', task); }
  assignTask(task: Task) { console.log('Assign task', task); }

  // ---------------------- Columns ----------------------
  toggleMenu(colId: string, ev: Event) {
    ev.stopPropagation();
    this.openMenuId = this.openMenuId === colId ? null : colId;
  }

  assignColumn(_col: Column, ev?: Event) { ev?.stopPropagation(); console.log('Assign column', _col); }
  shareColumn(_col: Column, ev?: Event) { ev?.stopPropagation(); console.log('Share column', _col); }
  editColumn(_col: Column, ev?: Event) { ev?.stopPropagation(); console.log('Edit column', _col); }
  deleteColumn(_col: Column, ev?: Event) { ev?.stopPropagation(); console.log('Delete column', _col); }

  // ---------------------- TrackBy ----------------------
  trackById(_: number, t: Task) { return t.id; }
  trackByColumn(_: number, c: Column) { return c.id; }
}
