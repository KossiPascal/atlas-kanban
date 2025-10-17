// user-context.service.ts
import { HttpHeaders } from '@angular/common/http';
import { Injectable } from '@angular/core';
import {
  Auth,
  authState,
  onIdTokenChanged,
  setPersistence,
  browserLocalPersistence,
  User
} from '@angular/fire/auth';
import { AppUser } from '@kba-models/task.model';
import { BehaviorSubject, Observable, firstValueFrom } from 'rxjs';
import { map, shareReplay } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class UserContextService {
  private _user$ = new BehaviorSubject<User | null>(null);
  readonly user$: Observable<User | null> = this._user$.asObservable().pipe(shareReplay(1));
  readonly isAuthenticated$: Observable<boolean> = this.user$.pipe(map(u => !!u), shareReplay(1));

  // Promise qui se résout après la première émission d'authState (utile au bootstrap)
  private _readyResolve!: () => void;
  readonly ready: Promise<void> = new Promise(res => (this._readyResolve = res));

  // cache token
  private refreshTimer: any = null;

  constructor(private auth: Auth) {
    // essayer d'activer la persistance (si possible)
    void setPersistence(this.auth, browserLocalPersistence).catch(err => {
      // console.warn('[UserCtx] setPersistence failed', err);
    });


    // authState: met à jour le cache user et résout la ready promise la 1ère fois
    authState(this.auth).subscribe(user => {
      if (user && user.emailVerified) {
        this._user$.next(user);
        this.updateTokenCache(user).catch(() => { });
        this.scheduleTokenRefresh(user);
      } else {
        this._user$.next(null);
        this.clearTokenCache();
      }
      // resolve only on first emission
      this._readyResolve();
    });

    // onIdTokenChanged: s'assure que le token cache suit les changements
    onIdTokenChanged(this.auth, (user) => {
      if (user && user.emailVerified) {
        this._user$.next(user);
        this.updateTokenCache(user).catch(() => { });
      } else {
        this._user$.next(null);
        this.clearTokenCache();
      }
    });
  }

  private get tokenCache(): { token: string; expirationTime: number } | null {
    try {
      const tokenCacheStr = localStorage.getItem('tokenCache');
      if (tokenCacheStr) {
        return JSON.parse(tokenCacheStr);
      }
    } catch (error) {

    }
    return null;
  }

  /** attend l'initialisation Firebase auth (useful in ngOnInit) */
  async ensureInitialized(): Promise<void> {
    return this.ready;
  }

  get currentUser(): User | null {
    return this._user$.value;
  }

  isAuthenticatedSync(): boolean {
    return this._user$.value !== null;
  }

  requireUser(): { uid: string; user: AppUser, isAdmin: boolean } {
    const user = this.currentUser;
    if (!user) throw new Error('Utilisateur non authentifié');
    // adapte isAdmin selon ton schema (claim, role dans profile, etc.)
    const isAdmin = (user as any).role === 'admin';
    return { uid: user.uid, user: user as any, isAdmin };
  }

  async getIdToken(forceRefresh = false): Promise<string | null> {
    try {
      // attend d'avoir un user stable
      const user = await firstValueFrom(this.user$);
      if (!user) return null;

      // si on a un token en cache et qui n'expire pas dans < 2min, on le réutilise
      const now = Date.now();
      if (!forceRefresh && this.tokenCache && this.tokenCache.expirationTime - now > 2 * 60 * 1000) {
        return this.tokenCache.token;
      }

      // sinon on récupère un idTokenResult (peut forcer refresh)
      const idTokenResult = await user.getIdTokenResult(forceRefresh);
      const tokenCache = {
        token: idTokenResult.token,
        expirationTime: new Date(idTokenResult.expirationTime).getTime()
      };

      localStorage.setItem('tokenCache', JSON.stringify(tokenCache));
      // reprogrammer refresh
      this.scheduleTokenRefresh(user);

    } catch (error) {

    }
    return this.tokenCache?.token ?? null;
  }

  private async updateTokenCache(user: User) {
    try {
      const idTokenResult = await user.getIdTokenResult();
      const tokenCache = {
        token: idTokenResult.token,
        expirationTime: new Date(idTokenResult.expirationTime).getTime()
      };

      localStorage.setItem('tokenCache', JSON.stringify(tokenCache));
    } catch (error) {

    }
  }

  private clearTokenCache() {
    localStorage.removeItem('tokenCache')
    if (this.refreshTimer) {
      clearTimeout(this.refreshTimer);
      this.refreshTimer = null;
    }
  }

  private scheduleTokenRefresh(user: User) {
    // clear existing
    if (this.refreshTimer) clearTimeout(this.refreshTimer);

    user.getIdTokenResult().then(idTokenResult => {
      const expMs = new Date(idTokenResult.expirationTime).getTime();
      const now = Date.now();
      // refresh 2 minutes avant l'expiration (ajuste margin si besoin)
      let msUntilRefresh = expMs - now - 2 * 60 * 1000;
      // sécurité : ne pas planifier négatif
      if (msUntilRefresh < 30 * 1000) msUntilRefresh = 30 * 1000;

      this.refreshTimer = setTimeout(async () => {
        try {
          // force refresh
          await user.getIdToken(true);
          // update cache & reprogrammer à nouveau
          await this.updateTokenCache(user);
          this.scheduleTokenRefresh(user);
        } catch (err) {
          console.warn('[UserCtx] token refresh failed', err);
          // en cas d'échec on retente dans 30s (ou décide de déconnecter)
          this.refreshTimer = setTimeout(() => this.scheduleTokenRefresh(user), 30 * 1000);
        }
      }, msUntilRefresh);
    }).catch(err => {
      console.warn('[UserCtx] scheduleTokenRefresh failed', err);
    });
  }



  async authHeaders(): Promise<{ headers: HttpHeaders }> {
    const token = await this.getIdToken();
    return {
      headers: new HttpHeaders({
        Authorization: token ? `Bearer ${token}` : '',
      }),
    };
  }




}
