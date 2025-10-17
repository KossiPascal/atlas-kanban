import { Injectable } from '@angular/core';
import { CanActivate, Router, UrlTree, ActivatedRouteSnapshot, RouterStateSnapshot } from '@angular/router';
import { UserContextService } from '@kba-services/user.context.service';
import { Observable, from } from 'rxjs';
import { map } from 'rxjs/operators';

@Injectable({ providedIn: 'root' })
export class AuthGuard implements CanActivate {
  constructor(private userCtx: UserContextService, private router: Router) {}

  canActivate(route: ActivatedRouteSnapshot, state: RouterStateSnapshot): Observable<boolean | UrlTree> {
    // attendre que UserContextService soit prêt
    return from(this.userCtx.ensureInitialized()).pipe(
      map(() => {
        if (this.userCtx.isAuthenticatedSync()) return true;

        return this.router.createUrlTree(['/auths/login'], {
          queryParams: { returnUrl: state.url }
        });
      })
    );
  }
}
