import { ChangeDetectionStrategy, Component, ElementRef, EventEmitter, HostListener, Input, OnDestroy, OnInit, Output, ViewChild } from '@angular/core';
import { Task, ColumnId, AppUser, CheckItem, Tag, Files, Priority } from '@kba-models/task.model';
import { TaskProviderService } from '@kba-services/tasks-provider.service';
import { UserService } from '@kba-services/user.service';

@Component({
    standalone: false,
    selector: 'app-task-modal',
    templateUrl: './task-modal.component.html',
    styleUrls: ['./task-modal.component.scss'],
    // changeDetection: ChangeDetectionStrategy.OnPush
})
export class TaskModalComponent implements OnInit, OnDestroy {

    // visibility
    @Input() task: Task | null = null;
    @Input() columnId!: ColumnId;
    @Input() userId!: string;
    @Output() save = new EventEmitter<Task>();
    @Output() close = new EventEmitter<boolean>();

    editedTask: Task = {} as any;
    draggingId: string | null = null;

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
        private el: ElementRef<HTMLElement>,
        public provider: TaskProviderService,
        private userService: UserService
    ) { 
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

    get newTask(): Task {
        return {
            id: 't' + Math.random().toString(36).slice(2, 9),
            title: '',
            description: '',
            tag: this.provider.defaultTag,
            checklist: [],
            assignTo: {},
            priority: this.provider.defaultPriority,
            views: {},
            comments: [],
            attachments: {} as any,
            due: undefined,
            columnId: this.columnId,
            owner: this.userId,
            position: 0
        };
    }

    // small helper to create unique ids
    private uid(prefix = 'id') {
        return prefix + Math.random().toString(36).slice(2, 9);
    }


    ngOnInit(): void {
        // initial state
        this.initializeApp()
        // this.renderer.setStyle(document.documentElement, '--accent', this.accentColor);
    }

    async initializeApp() {
        this.editedTask = this.task ? { ...this.task } : this.newTask;

        this.state.usersList = await this.userService.getUsers();

        this.state.prioritiesList = this.provider.prioritiesList;
        this.state.tags = [...this.provider.tagsList];

        this.state.assignees = this.state.usersList.filter(u => Object.keys(this.editedTask.assignTo ?? {}).includes(u.uid))
        this.state.checklist = (this.editedTask.checklist ?? []);
        this.state.files = Object.values(this.editedTask.attachments).flatMap(at => at.files);
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

    getAssigneeNames(): string {
        if (!this.state?.assignees || this.state.assignees.length === 0) return '—';
        return this.state.assignees.map(a => a.displayName||a.email).join(', ');
    }


    selectPriority(p: Priority, el?: HTMLElement) {
        this.editedTask.priority = this.editedTask.priority?.id == p.id ? undefined : p;
    }

    cancelPriority(p: Priority, el?: HTMLElement) {
        this.editedTask.priority = undefined;
    }


    isPrioritySelected(p: Priority, el?: HTMLElement) {
        return this.editedTask.priority == p;
    }

    // ---------- TAGS ----------
    addTag() {
        const name = this.state.newTag.name.trim();
        if (!name) return;
        const color = this.state.newTag.color || '#ff7a7a';
        const t: Tag = { id: this.uid('tag'), name, color, bg: color };
        this.state.tags = [t, ...this.state.tags];
        this.state.newTag = { name: '', color: '#ff7a7a' }
    }
    selectTag(t: Tag, el?: HTMLElement) {
        t.bg = this.provider.withOpacity(t.color, 0.1);
        this.editedTask.tag = this.isTagSelected(t) ? this.provider.defaultTag : t;
    }
    isTagSelected(t: Tag, el?: HTMLElement) {
        return this.editedTask.tag?.id === t.id;
    }
    removeTag(t: Tag, el?: HTMLElement) {
        this.state.tags = this.state.tags.filter(st => st.id !== t.id);
    }

    // ---------- ASSIGNEES USERS ----------
    addAssigneeFromQuery() {
        const q = this.state.assigneeQuery.trim().toLowerCase();
        if (!q) return;
        const found = this.state.usersList.find(u => `${u.displayName ?? ''} ${u.email ?? ''}`.toLowerCase().includes(q) && !this.state.assignees.some(a => a.uid === u.uid));
        if (found) {
            this.state.assignees.push(found);
            this.state.assigneeQuery = '';
        }
    }

    isSelectedUser(u: AppUser): boolean {
        return (this.state.assignees.map(a => a.uid)).includes(u.uid);
    }
    toggleAddAssignee(u: AppUser) {
        if (!this.state.assignees.some(x => x.uid === u.uid)) {
            this.state.assignees.push(u);
        }
    }
    removeAssignee(u: AppUser) {
        this.state.assignees = this.state.assignees.filter(a => a.uid !== u.uid);
    }

    // ---------- CHECKLIST ----------
    onDoneChange(event: Event, ck: CheckItem) {
        const ok = (event.target as HTMLInputElement).checked;
        const currentUser = this.userId ?? 'Unknown User';

        ck.done = {
            ok,
            by: ok ? currentUser : '',
            at: ok ? Date.now() : 0
        };
    }
    addCheckItem() {
        const v = this.state.newCheckText.trim();
        if (!v) return;
        const currentUser = this.userId ?? 'Unknown User';

        const check: CheckItem = {
            id: this.uid('ck'),
            name: v,
            created: { by: currentUser, at: Date.now() }
        }
        this.state.checklist.push(check);
        this.state.newCheckText = '';
    }
    removeCheckItem(id: string) {
        this.state.checklist = this.state.checklist.filter(c => c.id !== id);
    }
    duplicateCheckItem(id: string) {
        const it = this.state.checklist.find(c => c.id === id);
        if (!it) return;
        const currentUser = this.userId ?? 'Unknown User';
        const dup: CheckItem = {
            id: this.uid('ck'),
            name: it.name,
            created: { by: currentUser, at: Date.now() }
        };
        const idx = this.state.checklist.findIndex(c => c.id === id);
        this.state.checklist.splice(idx + 1, 0, dup);
    }
    onCheckDragStart(ev: DragEvent, id: string) {
        this.draggingId = id;
        ev.dataTransfer?.setData('text/plain', id);
        setTimeout(() => { }, 10);
    }
    onCheckDragEnd() {
        this.draggingId = null;
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
            this.state.files.push(obj);
        });
    }

    removeFile(id: string) {
        const idx = this.state.files.findIndex(x => x.id === id);
        if (idx > -1) {
            const f = this.state.files[idx];
            if (f.url) try { URL.revokeObjectURL(f.url); } catch { }
            this.state.files.splice(idx, 1);
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


    saveTask() {

        if (!this.editedTask.title) {
            alert('Le titre est requis');
            // focus handling: attempt to focus native input
            const titleEl = this.el.nativeElement.querySelector('#titleInput') as HTMLElement | null;
            if (titleEl) titleEl.focus();
            return;
        }

        if (this.state.assignees && this.state.assignees.length > 0) {
            if (!this.editedTask.assignTo) this.editedTask.assignTo = {};
            for (const user of this.state.assignees) {
                this.editedTask.assignTo[user.uid] = { at: Date.now() }
            }
        }

        // this.state.sharedWith.forEach(a => {
        //     if (!this.editedTask.sharedWith) this.editedTask.sharedWith = {};
        //     this.editedTask.sharedWith[this.userId] = { at: Date.now() }
        // });

        if (this.state.checklist && this.state.checklist.length > 0) {
            this.editedTask.checklist = this.state.checklist.flatMap(c => {
                return { id: c.id, name: c.name, done: c.done, created: c.created, updated: c.updated };
            });
        }

        if (this.state.files.length > 0) {
            if (!this.editedTask.attachments) this.editedTask.attachments = {} as any;
            const files = this.state.files.map(f => ({ id: f.id, name: f.name, url: f.url, file: f.file, size: f.size }));
            this.editedTask.attachments[this.userId] = { at: Date.now(), files };
        }

        this.save.emit(this.editedTask)
        // // visual feedback
        // const saveBtn = this.el.nativeElement.querySelector('#saveBtn') as HTMLButtonElement | null;
        // if (saveBtn) {
        //     const original = saveBtn.textContent;
        //     saveBtn.textContent = 'Enregistré ✓';
        //     setTimeout(() => (saveBtn.textContent = original), 1200);
        // }
        // in real app: emit event / call backend
    }

    closeModal() {
        this.close.emit(false);
    }



    // ####################################################

    // toggleMenu(taskId: string, event: MouseEvent) {
    //     event.stopPropagation();
    //     this.openMenuId = this.openMenuId === taskId ? null : taskId;
    // }


    // deleteTask(t: Task) { console.log('delete', t); }
    // editTask(t: Task) { console.log('edit', t); }
    // shareTask(t: Task) { console.log('share', t); }
    // assignTask(t: Task) { console.log('assign', t); }

    // // --- Stats & helpers ---
    // getObjectTotal(obj?: { [key: string]: any }): number {
    //     return obj ? Object.keys(obj).length : 0;
    // }

    // getAttachmentsTotal(attachments?: { [key: string]: { url: string[] } }): number {
    //     return attachments ? Object.keys(attachments).reduce((acc, k) => acc + (attachments[k].url?.length || 0), 0) : 0;
    // }

    // isChecklistFinished(t: Task): boolean {
    //     if (!t.checklist) return false;
    //     return Object.keys(t.checklist.done).length == t.checklist.items.length;
    //     // return t.checklist?.items?.every(i => i.done) ?? false;
    // }

    // getChecklistProgress(t: Task): string {
    //     const total = t.checklist?.items?.length || 0;
    //     const done = t.checklist ? Object.keys(t.checklist.done).length : 0;
    //     // const done = t.checklist?.items?.filter(i => i.done).length || 0;
    //     return `${done}/${total}`;
    // }

    // // Pour affichage assignees
    // getAssigneeInitials(u: User): string {
    //     return (u.name.split(' ').map(s => s[0]).slice(0, 2).join('')).toUpperCase();
    // }
}
