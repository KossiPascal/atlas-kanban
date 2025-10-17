// user.service.ts
import { Injectable } from '@angular/core';
import { User } from '@angular/fire/auth';
import { BehaviorSubject, Observable } from 'rxjs';
import { shareReplay } from 'rxjs/operators';
import { ApiDbService } from './apis/api-db.service';
import { SocketService } from './socket.service';
import { UserContextService } from './user.context.service';
import { AppUser } from '@kba-models/task.model';

@Injectable({ providedIn: 'root' })
export class UserService {
    private _users$ = new BehaviorSubject<AppUser[] | null>(null);
    readonly users$: Observable<AppUser[] | null> = this._users$.asObservable().pipe(shareReplay(1));

    // Promise qui se résout après la première émission d'authState (utile au bootstrap)
    private _readyResolve!: () => void;
    readonly ready: Promise<void> = new Promise(res => (this._readyResolve = res));

    constructor(private api: ApiDbService, private socket: SocketService, private userCtx: UserContextService) {
        // essayer d'activer la persistance (si possible)
        // authState: met à jour le cache user et résout la ready promise la 1ère fois
        this.getUsers().then(users => {
            this._users$.next(users ?? null);
            // resolve only on first emission
            this._readyResolve();
        });

    }

    /** Récupère les utilisateurs */
    async getUsers(forceUseRemote: boolean = false): Promise<AppUser[]> {
        const { uid, isAdmin } = this.userCtx.requireUser();
        if (!uid) return [];

        const all = await this.api.list<AppUser>('users', forceUseRemote)

        const users = all.filter(t => {
            return true;
        });

        return users.sort((a, b) => (a.displayName || a.email).localeCompare(b.displayName || b.email));
    }


    async syncFromServer(): Promise<boolean> {
        return await this.api.syncFromServer('users')
    }
}