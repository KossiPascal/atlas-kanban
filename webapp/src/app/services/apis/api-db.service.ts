import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { TableName } from '@kba-models/task.model';
import { firstValueFrom } from 'rxjs';
import { environment } from '@kba-environments/environment';
import { DBService } from '@kba-services/db.service';
import { SocketService } from '@kba-services/socket.service';
import { UserContextService } from '@kba-services/user.context.service';
import { ConnectivityService } from '@kba-services/connectivity.service';
import { User } from '@angular/fire/auth';

interface Output {
    status: number;
    data: any;
}

@Injectable({ providedIn: 'root' })
export class ApiDbService {
    private online = navigator.onLine; // mieux d’utiliser le vrai état réseau

    private readonly base = environment.backendUrl;

    constructor(
        protected conn: ConnectivityService,
        private readonly db: DBService,
        private readonly socket: SocketService,
        private readonly http: HttpClient,
        private readonly userCtx: UserContextService,
    ) {
        this.online = this.conn.isOnline;
    }

    // --------------------------------------
    // 🔹 UTILITAIRES PRIVÉS
    // --------------------------------------

    // --------------------------------------
    // 🔹 CRUD
    // --------------------------------------


    /** Crée un élément */
    async save<T = any>(tableName: TableName, data: T, forceToRemote: boolean = false): Promise<boolean> {
        const { uid, isAdmin } = this.userCtx.requireUser();
        try {
            const toCreate = { ...data, owner: uid, createdAt: (data as any).createdAt || Date.now(), synced: false };
            let resp: boolean = false;
            if (forceToRemote) {
                const payload = { ...data, synced: true };
                const options = await this.userCtx.authHeaders();
                const res = await firstValueFrom(this.http.post<Output>(`${this.base}/api/${tableName}`, payload, options));
                resp = res?.status === 200;
            } else {
                resp = await this.db.save(tableName, toCreate);
                if (resp) this.syncToServer(tableName);
            }
            if (resp && this.socket.isConnected()) this.socket.emit(`${tableName}:created`, toCreate);
            return resp;
        } catch (err) {
            // console.error(`[save] failed for ${tableName}`, err);
            return false;
        }
    }

    /** Crée plusieurs éléments */
    async bulkSave<T = any>(tableName: TableName, data: T[], forceToRemote: boolean = false, forceSyncToServer: boolean = true): Promise<boolean> {
        try {
            const now = Date.now();
            const prepared = data.map((t: any) => ({ ...t, createdAt: t.createdAt || now, synced: false }));
            let resp: boolean = false;
            if (forceToRemote) {
                const payload = data.map(t => ({ ...t, synced: true }));
                const options = await this.userCtx.authHeaders();
                const res = await firstValueFrom(this.http.post<Output>(`${this.base}/api/${tableName}/bulk-create`, payload, options));
                resp = res?.status === 200;
            } else {
                resp = await this.db.bulkSave(tableName, prepared);
                if (resp && forceSyncToServer) this.syncToServer(tableName);
            }
            if (resp && this.socket.isConnected()) this.socket.emit(`${tableName}:created`, prepared);
            return resp;
        } catch (err) {
            // console.error('[bulkSave] Failed', err);
            return false;
        }
    }

    /** Met à jour un élément */
    async update<T = any>(tableName: TableName, data: T, forceToRemote: boolean = false): Promise<boolean> {
        const { uid, isAdmin } = this.userCtx.requireUser();
        try {
            if (!isAdmin && (data as any).owner !== uid) throw new Error('Permission refusée');
            const toUpdate = { ...data, updatedAt: Date.now(), synced: false };
            let resp: boolean = false;
            if (forceToRemote) {
                const payload = { ...data, synced: true };
                const options = await this.userCtx.authHeaders();
                const res = await firstValueFrom(this.http.put<Output>(`${this.base}/api/${tableName}/${(data as any).id}`, payload, options));
                resp = res?.status === 200;
            } else {
                resp = await this.db.update(tableName, toUpdate);
                if (resp) this.syncToServer(tableName);
            }
            if (resp && this.socket.isConnected()) this.socket.emit(`${tableName}:updated`, toUpdate);
            return resp;
        } catch (err) {
            // console.error(`[update] failed for ${tableName}`, err);
            return false;
        }
    }

    /** Crée plusieurs éléments */
    async bulkUpdate<T = any>(tableName: TableName, data: T[], forceToRemote: boolean = false): Promise<boolean> {
        try {
            const now = Date.now();
            const prepared = data.map((t) => ({ ...t, updatedAt: now, synced: false }));
            let resp: boolean = false;
            if (forceToRemote) {
                const payload = data.map(t => ({ ...t, synced: true }));
                const options = await this.userCtx.authHeaders();
                const res = await firstValueFrom(this.http.put<Output>(`${this.base}/api/${tableName}/bulk-update`, payload, options));
                resp = res?.status === 200;
            } else {
                resp = await this.db.bulkUpdate(tableName, prepared);
                if (resp) this.syncToServer(tableName);
            }
            if (resp && this.socket.isConnected()) this.socket.emit(`${tableName}:updated`, prepared);
            return resp;
        } catch (err) {
            // console.error('[bulkUpdate] Failed', err);
            return false;
        }
    }

    /** Sauvegarde ou met à jour un élément */
    async saveOrUpdate<T = any>(tableName: TableName, data: T, forceToRemote: boolean = false): Promise<boolean> {
        try {
            const id = (data as any).id ?? crypto.randomUUID();
            const existing = (data as any).id ? await this.get<T>(tableName, id, forceToRemote) : undefined;
            const prepared = { ...data, id, updatedAt: Date.now(), synced: false };

            if (existing) {
                const merged = { ...existing, ...prepared };
                const resp = await this.update(tableName, merged, forceToRemote);
                console.info(`[saveOrUpdate] Updated data ${id}`);
                return resp;
            } else {
                const resp = await this.save(tableName, prepared, forceToRemote);
                console.info(`[saveOrUpdate] Created data ${id}`);
                return resp;
            }
        } catch (err) {
            // console.error('[saveOrUpdate] Failed', err);
            return false;
        }
    }

    /** Supprime un élément */
    async delete(tableName: TableName, id: string, forceToRemote: boolean = false): Promise<boolean> {
        const { uid, isAdmin } = this.userCtx.requireUser();
        try {
            let deleted = false;
            const options = await this.userCtx.authHeaders();
            if (forceToRemote) {
                const res = await firstValueFrom(this.http.delete<Output>(`${this.base}/api/${tableName}/${id}`, options));
                deleted = res.status === 200;
            } else {
                deleted = await this.db.deleteItem(tableName, id);
                if (deleted) await this.syncToServer(tableName);
            }
            if (deleted && this.socket.isConnected()) this.socket.emit(`${tableName}:deleted`, id);
            return deleted;
        } catch (err) {
            // console.error('[delete] Failed', err);
            return false;
        }
    }

    async bulkDelete(tableName: TableName, ids: string[], forceToRemote: boolean = false): Promise<boolean> {
        const { uid, isAdmin } = this.userCtx.requireUser();
        try {
            let deleted = false;
            const options = await this.userCtx.authHeaders();
            if (forceToRemote) {
                const res = await firstValueFrom(this.http.post<Output>(`${this.base}/api/${tableName}/bulk-delete`, ids, options));
                deleted = res.status === 200;
            } else {
                for (const id of ids) {
                    deleted = await this.db.deleteItem(tableName, id);
                }
                if (deleted) await this.syncToServer(tableName);
            }
            if (deleted && this.socket.isConnected()) this.socket.emit(`${tableName}:deleted`, ids);
            return deleted;
        } catch (err) {
            // console.error('[delete] Failed', err);
            return false;
        }
    }

    // --------------------------------------
    // 🔹 LECTURE
    // --------------------------------------

    /** Liste les éléments */
    async list<T = any>(tableName: TableName, forceFromRemote: boolean = false): Promise<T[]> {
        const { uid, isAdmin } = this.userCtx.requireUser();
        try {
            const options = await this.userCtx.authHeaders();
            let all: T[] = [];
            if (forceFromRemote) {
                const res = await firstValueFrom(this.http.get<Output>(`${this.base}/api/${tableName}`, options));
                if (res.status === 200) all = res.data;
            } else {
                all = await this.db.list<T>(tableName);
            }
            return all.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
        } catch (err) {
            // console.error('[list] Failed', err);
            return [];
        }
    }

    /** Récupère un élément par ID */
    async get<T = any>(tableName: TableName, id: string, forceFromRemote: boolean = false): Promise<T | undefined> {
        const { uid, isAdmin } = this.userCtx.requireUser();
        try {
            let data: T | undefined;
            const options = await this.userCtx.authHeaders();
            if (forceFromRemote) {
                const res = await firstValueFrom(this.http.get<Output>(`${this.base}/api/${tableName}/${id}`, options));
                if (res.status === 200) data = res.data;
            } else {
                data = await this.db.getItem<T>(tableName, id);
            }
            return data;
        } catch (err) {
            // console.error('[get] Failed', err);
            return undefined;
        }
    }

    /** Récupère un élément par ID */
    async bulkGet<T = any>(tableName: TableName, payload: { field: string; value: any }, forceFromRemote: boolean = false): Promise<T[]> {
        const { uid, isAdmin } = this.userCtx.requireUser();
        try {
            let data: T[] = [];
            const options = await this.userCtx.authHeaders();
            if (forceFromRemote) {
                const res = await firstValueFrom(this.http.post<Output>(`${this.base}/api/${tableName}/bulk-get`, payload, options));


                if (res.status === 200) data = res.data;
            } else {
                data = await this.db.bulkGet<T>(tableName, payload);
            }
            return data && data.length > 0 ? data : [];
        } catch (err) {
            // console.error('[get] Failed', err);
            return [];
        }
    }



    /** Récupère des éléments par champ */
    async getByField<T = any>(tableName: TableName, field: keyof T, value: any, forceFromRemote: boolean = false): Promise<T[]> {
        const { uid, isAdmin } = this.userCtx.requireUser();
        try {
            const options = await this.userCtx.authHeaders();
            let all: T[] = [];
            if (forceFromRemote) {
                const res = await firstValueFrom(this.http.post<Output>(`${this.base}/api/${tableName}/by-field`, { field, value }, options));
                if (res.status === 200) all = res.data;
            } else {
                all = await this.db.getByField<T>(tableName, field, value);
            }

            return all.sort((a: any, b: any) => (a.position ?? 0) - (b.position ?? 0));
        } catch (err) {
            // console.error('[getByField] Failed', err);
            return [];
        }
    }

    // --------------------------------------
    // 🔹 SYNCHRONISATION
    // --------------------------------------
    /** Synchronise les données locales non envoyées */
    async syncToServer<T = any>(tableName: TableName): Promise<boolean> {
        let synced = false;
        if (this.online) {
            try {
                const unsynced = await this.db.getUnsynced<T>(tableName);
                if (unsynced.length > 0) {
                    synced = await this.bulkSave(tableName, unsynced, true);
                } else {
                    synced = true;
                }
            } catch (err) {
                // console.error(`[syncToServer] Failed to sync ${tableName}`, err);
                synced = false;
            }
        }
        if (this.socket.isConnected()) {
            this.socket.emit(`${tableName}:synced`, synced);
        }
        await this.afterSync(tableName, synced, "toServer");
        return synced;
    }

    /** Synchronise les données distantes vers local */
    async syncFromServer<T = any>(tableName: TableName, forceSyncToServer: boolean = true, getAll: boolean = false): Promise<boolean> {
        let synced = false;
        if (this.online) {
            const { uid, isAdmin } = this.userCtx.requireUser();
            try {

                try {
                    const tasks = await this.getByField<T>(tableName, 'deleted' as any, true, true) as any[];
                    console.log(tasks)
                    if (tasks.length > 0) {
                        for (const t of tasks) {
                            try {
                                const remoteDeletion = await this.delete(tableName, t.id, true);
                                if (remoteDeletion) {
                                    const localDeletion = await this.delete(tableName, t.id, false);
                                }
                            } catch (error) { }
                        }
                    }
                } catch (error) { }


                let records: T[] = [];

                if (isAdmin || getAll) {
                    records = await this.list<T>(tableName, true);
                } else {
                    records = await this.bulkGet<T>(tableName, { field: 'owner', value: uid }, true);
                }

                if (records.length > 0) {
                    synced = await this.bulkSave(tableName, records, false, forceSyncToServer);
                }
            } catch (err) {
                // console.error(`[syncFromServer] Failed to sync ${tableName}`, err);
                synced = false;
            }
        }
        if (this.socket.isConnected()) {
            this.socket.emit(`${tableName}:synced`, synced);
        }
        await this.afterSync(tableName, synced, "fromServer");
        return synced;
    }

    /** Post-sync hook */
    async afterSync(tableName: TableName, synced: boolean, direction?: "toServer" | "fromServer") {
        if (synced) {
            console.log(`[SYNC SUCCESS] ${tableName} (${direction ?? "unknown"}) synced successfully`);
        } else {
            // console.error(`[SYNC ERROR] ${tableName} (${direction ?? "unknown"}) failed to sync`);
        }
    }



}
