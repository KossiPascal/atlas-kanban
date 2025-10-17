import { Injectable } from '@angular/core';
import { CanLoad, Route, UrlSegment, Router, UrlTree } from '@angular/router';
import { UserContextService } from '@kba-services/user.context.service';
import { from, Observable } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthCanLoadGuard implements CanLoad {
  constructor(private userCtx: UserContextService, private router: Router) {}

  canLoad(route: Route, segments: UrlSegment[]): Observable<boolean | UrlTree> {
    return from(this.userCtx.ensureInitialized()).pipe(
      map(() => {
        if (this.userCtx.isAuthenticatedSync()) return true;

        const url = '/' + segments.map(s => s.path).join('/');
        return this.router.createUrlTree(['/auths/login'], { queryParams: { returnUrl: url } });
      })
    );
  }
}
