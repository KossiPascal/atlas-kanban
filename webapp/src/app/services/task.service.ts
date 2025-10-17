import { Injectable } from '@angular/core';
import { SocketService } from './socket.service';
import { ColumnId, Task } from '@kba-models/task.model';
import { environment } from '@kba-environments/environment';
import { UserContextService } from './user.context.service';
import { ApiDbService } from './apis/api-db.service';

@Injectable({ providedIn: 'root' })
export class TaskService {

    constructor(private api: ApiDbService, private socket: SocketService, private userCtx: UserContextService) {
        // Listen to WebSocket updates
        this.socket.on('tasks:created', (task: Task) => this.syncToServer());
        this.socket.on('tasks:updated', (task: Task) => this.syncToServer());
        this.socket.on('tasks:moved', (id: string) => this.syncToServer());
        this.socket.on('tasks:deleted', (id: string) => this.syncToServer());
        this.socket.on('tasks:synced', (synced: boolean) => this.afterSync(synced));

    }


    // /** -------------------- SAVE -------------------- */
    async save(task: Task, forceUseRemote: boolean = false): Promise<boolean> {
        return await this.api.save('tasks', task);
    }

    /** Bulk save tasks */
    async bulkSave(tasks: Task[], forceUseRemote: boolean = false): Promise<boolean> {
        return await this.api.bulkSave('tasks', tasks, forceUseRemote);
    }

    /** Sync all unsynced tasks */
    async syncToServer(): Promise<boolean> {
        const success = await this.api.syncToServer('tasks');
        // await this.afterSync(success);
        return success;
    }

    async syncFromServer(): Promise<boolean> {
        return await this.api.syncFromServer('tasks');
    }

    async afterSync(synced: boolean) {
        return await this.api.afterSync('tasks', synced)
    }

    /** List tasks user/admin */
    async list(forceUseRemote: boolean = false): Promise<Task[]> {
        const user = this.userCtx.requireUser();
        if (!user?.uid) return [];

        const all = await this.api.list<Task>('tasks', forceUseRemote)

        const tasks = all.filter(t => {
            if (user.isAdmin) return true;
            const showUsers = [...Object.keys(t.assignTo ?? {}), ...Object.keys(t.sharedWith ?? {})];
            return t.owner === user.uid || (showUsers.includes(user.uid))
        });

        return tasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));
    }

    /** Get task by ID */
    async get(id: string, forceUseRemote: boolean = false): Promise<Task | undefined> {
        try {
            const user = this.userCtx.requireUser();
            if (!user?.uid) return undefined;

            const task = await this.api.get<Task>('tasks', id, forceUseRemote);
            if (!task) return undefined;

            const showUsers = [...Object.keys(task.assignTo ?? {}), ...Object.keys(task.sharedWith ?? {})];
            if (user.isAdmin || task.owner === user.uid || showUsers.includes(user.uid)) {
                return task;
            }
            return undefined;
        } catch (err) {
            console.error('Erreur getById', err);
            return undefined;
        }
    }

    /** Bulk save tasks */
    async bulkGet<T = any>(payload: { field: string; value: any }, forceUseRemote: boolean = false): Promise<T[]> {
        try {
            return await this.api.bulkGet<T>('tasks', payload, forceUseRemote);
        } catch (err) {
            console.error('Erreur getById', err);
            return [];
        }
    }

    /** Get tasks by ID */
    async getByField(field: keyof Task, value: any, forceUseRemote: boolean = false): Promise<Task[]> {
        try {
            const user = this.userCtx.requireUser();
            if (!user?.uid) return [];

            const all = await this.api.getByField<Task>('tasks', field, value, forceUseRemote);

            const tasks = all.filter(t => {
                if (user.isAdmin) return true;
                const showUsers = [...Object.keys(t.assignTo ?? {}), ...Object.keys(t.sharedWith ?? {})];
                return t.owner === user.uid || showUsers.includes(user.uid)
            });

            return tasks.sort((a, b) => (a.position ?? 0) - (b.position ?? 0));;
        } catch (err) {
            console.error('Erreur list tasks', err);
            return [];
        }
    }

    /** Update a task */
    async update(task: Task, forceUseRemote: boolean = false): Promise<boolean> {
        try {
            const user = this.userCtx.requireUser();
            if (!user?.uid) throw new Error('Utilisateur non authentifié');

            if (!user.isAdmin && task.owner !== user.uid) throw new Error('Permission refusée');

            const success = await this.api.update('tasks', task, forceUseRemote);
            if (success) this.syncToServer()
            return success;
        } catch (err) {
            console.error('Erreur update task', err);
            throw err;
        }
    }

    /**
     * Sauvegarde ou met à jour une tâche.
     * Si l'ID existe déjà → mise à jour, sinon → création.
     */
    async saveOrUpdate(task: Task, forceUseRemote: boolean = false): Promise<boolean> {
        try {
            const user = this.userCtx.requireUser();
            if (!user?.uid) throw new Error('Utilisateur non authentifié');

            const existing = task.id ? await this.api.get('tasks', task.id, forceUseRemote) : undefined;
            if (existing && (!user.isAdmin && task.owner !== user.uid)) throw new Error('Permission refusée');

            const success = await this.api.saveOrUpdate('tasks', task, forceUseRemote);
            if (success) this.syncToServer()
            return success;
        } catch (err) {
            console.error('[saveOrUpdate] Failed:', err);
            return false;
        }
    }


    /** Delete a task */
    async delete(id: string, forceUseRemote: boolean = false): Promise<boolean> {
        try {
            const user = this.userCtx.requireUser();
            if (!user?.uid) return false;

            const task = await this.api.get<Task>('tasks', id, forceUseRemote);
            if (!task) throw new Error('Task not found');

            const isAdmin = user.isAdmin;
            if (!isAdmin && task.owner !== user.uid) throw new Error('Permission refusée');

            const success = await this.api.delete('tasks', id, forceUseRemote);
            if (success) this.syncToServer()
            return success;
        } catch (err) {
            console.error('Erreur delete task', err);
            return false;
        }
    }

    async moveTask(taskId: string, toColumnId: ColumnId, fromIndex: number, insertIndex: number, forceUseRemote: boolean = false): Promise<void> {
        try {
            const task = await this.get(taskId, forceUseRemote);
            if (!task) {
                console.warn(`[moveTask] Task ${taskId} not found`);
                return;
            }

            // Tâches actuelles de la colonne cible (dans l'ordre affiché)
            const targetRaw = (await this.getByField('columnId', toColumnId, forceUseRemote)) ?? [];
            // retirer la tâche déplacée si elle s'y trouvait déjà
            const targetTasks = targetRaw.filter(t => t.id !== taskId);

            // calculer index sécurisé (0 .. targetTasks.length)
            const index = Math.max(0, Math.min(insertIndex ?? targetTasks.length, targetTasks.length));

            // construire moved task
            const moved: Task = { ...task, columnId: toColumnId, moovedAt: Date.now(), synced: false };

            // nouvelle liste cible
            const newTarget = [
                ...targetTasks.slice(0, index),
                moved,
                ...targetTasks.slice(index),
            ].map((t, i) => ({ ...t, order: i })); // on ajoute/maj order pour persister l'ordre

            // si la colonne source est différente, réindexer les restants de la colonne source
            const tasksToSave: Task[] = [...newTarget];

            if (task.columnId !== toColumnId) {
                const sourceRaw = (await this.getByField('columnId', task.columnId, forceUseRemote)) ?? [];
                const sourceRemaining = sourceRaw.filter(t => t.id !== taskId)
                    .map((t, i) => ({ ...t, order: i }));
                tasksToSave.push(...sourceRemaining);
            } else {
                // si même colonne, sourceRaw == targetRaw before remove; on a déjà mis la nouvelle liste dans newTarget,
                // pas besoin d'ajouter autre chose.
            }

            // sauvegarder uniquement les enregistrements modifiés (bulkPut / bulkSave)
            const success = await this.bulkSave(tasksToSave, forceUseRemote);

            if (this.socket) {
                this.socket.emit('tasks:moved', { taskId, toColumnId, insertIndex: index });
            }

            if (success) this.syncToServer()

            console.info(`[moveTask] Task ${taskId} moved to column ${toColumnId} at index ${index}`);
        } catch (err) {
            console.error('[moveTask] Failed to move task:', err);
            throw err;
        }
    }



    /** Mark task as completed */
    async markAsCompleted(id: string, forceUseRemote: boolean = false): Promise<boolean> {
        try {
            const task = await this.get(id, forceUseRemote);
            if (!task) throw new Error('Task not found');
            task.status = 'completed';
            const success = await this.update(task, forceUseRemote);
            if (success) this.syncToServer()
            return success;
        } catch (err) {
            console.error('Erreur markAsCompleted', err);
            return false;
        }
    }

    /** Share task with users */
    async shareTask(id: string, userIds: string[], forceUseRemote: boolean = false): Promise<boolean> {
        try {
            const task = await this.get(id, forceUseRemote);
            if (!task) throw new Error('Task not found');

            const now = Date.now();
            const shareObj: { [x: string]: { at: number }; } = {};
            for (const u of userIds) shareObj[u] = { at: now }

            task.sharedWith = { ...task.sharedWith, ...shareObj }
            const success = await this.update(task, forceUseRemote);

            if (success) this.syncToServer()
            return success;

        } catch (err) {
            console.error('Erreur shareTask', err);
            return false;
        }
    }

    /** Unshare task */
    async unshareTask(id: string, userIds: string[], forceUseRemote: boolean = false): Promise<boolean> {
        try {
            const task = await this.get(id, forceUseRemote);
            if (!task) throw new Error('Task not found');
            task.sharedWith = task.sharedWith ? Object.fromEntries(
                Object.entries(task.sharedWith).filter(([key]) => !userIds.includes(key))
            ) : undefined;

            const success = await this.update(task, forceUseRemote);
            if (success) this.syncToServer()

            return success;
        } catch (err) {
            console.error('Erreur unshareTask', err);
            return false;
        }
    }

    /** Archive task */
    async archiveTask(id: string, forceUseRemote: boolean = false): Promise<boolean> {
        try {
            const task = await this.get(id, forceUseRemote);
            if (!task) throw new Error('Task not found');
            task.archived = true;
            const success = await this.update(task, forceUseRemote);
            if (success) this.syncToServer()
            return success;
        } catch (err) {
            console.error('Erreur archiveTask', err);
            return false;
        }
    }

    /** Restore task */
    async restoreTask(id: string, forceUseRemote: boolean = false): Promise<boolean> {
        try {
            const task = await this.get(id, forceUseRemote);
            if (!task) throw new Error('Task not found');
            task.archived = false;
            const success = await this.update(task, forceUseRemote);
            if (success) this.syncToServer()
            return success;
        } catch (err) {
            console.error('Erreur restoreTask', err);
            return false;
        }
    }

    /** Get recent tasks */
    async getRecentTasks(limit: number = 10, forceUseRemote: boolean = false): Promise<Task[]> {
        const tasks = await this.list(forceUseRemote);
        return tasks.sort((a, b) => (b.updatedAt ?? 0) - (a.updatedAt ?? 0)).slice(0, limit);
    }


    /** Filter tasks by status */
    async filterByStatus(status: string, forceUseRemote: boolean = false): Promise<Task[]> {
        const tasks = await this.list(forceUseRemote);
        return tasks.filter(t => t.status === status);
    }

    /** Search tasks by keyword */
    async search(keyword: string, forceUseRemote: boolean = false): Promise<Task[]> {
        const tasks = await this.list(forceUseRemote);
        return tasks.filter(t => t.title?.toLowerCase().includes(keyword.toLowerCase()));
    }

    /** Update local task in BehaviorSubject */
    private updateLocal(task: Task, forceUseRemote: boolean = false) {
    }

    /** Delete local task in BehaviorSubject */
    private deleteLocal(id: string, forceUseRemote: boolean = false) {
    }
}
