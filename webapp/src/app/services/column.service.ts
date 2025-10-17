import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';
import { Task, Column } from '@kba-models/task.model';
import { UserContextService } from './user.context.service';
import { ApiDbService } from './apis/api-db.service';

@Injectable({ providedIn: 'root' })
export class ColumnService {

    constructor(private api: ApiDbService, private userCtx: UserContextService, private socket: SocketService) {
        this.socket.on('columns:updated', (column: Column) => this.updateLocal(column));
        this.socket.on('columns:deleted', (id: string) => this.deleteLocal(id));
    }

    buildColumns(columns: Column[], tasks: Task[]): Column[] {
        return columns.map(col => ({ ...col, tasks: tasks.filter(t => t.columnId === col.id) }));
    }


    /** Save one column */
    async save(column: Column): Promise<boolean> {
        return await this.api.save('columns', column);
    }

    /** Bulk save */
    async bulkSave(columns: Column[]): Promise<boolean> {
        return await this.api.bulkSave('columns', columns);
    }

    /** Sync all */
    async syncToServer(): Promise<boolean> {
        return await this.api.syncToServer('columns');
    }

    /** List */
    async list(): Promise<Column[]> {

        const all = [
            { id: 'todo', title: 'To Do', color: '#ff6b6b' },
            { id: 'inprogress', title: 'In Progress', color: '#5b8cff' },
            { id: 'needreview', title: 'Need Review', color: '#ffb020' },
            { id: 'done', title: 'Done', color: '#00c48c' },
        ] as Column[];


        return all;

        // return await this.api.list<Column>('columns');

    }

    /** Get by ID */
    async get(id: string): Promise<Column | undefined> {
        const user = this.userCtx.currentUser;
        if (!user) return undefined;

        return await this.api.get<Column>('columns', id);
    }

    /** Update */
    async update(column: Column): Promise<boolean> {
        return await this.api.update('columns', column);
    }

    /** Delete */
    async delete(id: string): Promise<boolean> {
        try {
            const user = this.userCtx.requireUser();
            if (!user?.uid) return false;

            const task = await this.api.get<Task>('columns', id);
            if (!task) throw new Error('Task not found');

            const isAdmin = user.isAdmin;
            if (!isAdmin && task.owner !== user.uid) throw new Error('Permission refusée');

            return await this.api.delete('columns', id);
        } catch (err) {
            console.error('Erreur delete columns', err);
            return false;
        }
    }


    /** Share */
    async shareColumn(id: string, userIds: string[]): Promise<void> {
    }

    /** Unshare */
    async unshareColumn(id: string, userIds: string[]): Promise<void> {
    }

    /** Archive */
    async archiveColumn(id: string): Promise<void> {
    }

    /** Restore */
    async restoreColumn(id: string): Promise<void> {
    }


    private updateLocal(column: Column) {
    }

    private deleteLocal(id: string) {
    }
}
