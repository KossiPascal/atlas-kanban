// token-refresh.service.ts
import { Injectable, OnDestroy } from '@angular/core';
import { interval, Subscription, from } from 'rxjs';
import { switchMap, catchError } from 'rxjs/operators';
import { UserContextService } from './user.context.service';

@Injectable({ providedIn: 'root' })
export class TokenRefreshService implements OnDestroy {
  private sub?: Subscription;
  // recommended refresh every 13 minutes (tokens usually valid 1h) — adjust as needed
  private refreshMs = 13 * 60 * 1000;

  constructor(private userCtx: UserContextService) {}

  start() {
    // avoid multiple subscriptions
    if (this.sub && !this.sub.closed) return;
    this.sub = interval(this.refreshMs)
      .pipe(
        switchMap(() => from(this.userCtx.getIdToken(true))), // force refresh
        catchError(err => {
          console.error('Token refresh failed', err);
          return []; // swallow; next interval will retry
        })
      )
      .subscribe(token => {
        if (token) {
          // optionally persist or emit somewhere — AuthService already saves token
          console.debug('Token refreshed (client).');
        }
      });
  }

  stop() {
    this.sub?.unsubscribe();
  }

  ngOnDestroy() {
    this.stop();
  }
}
