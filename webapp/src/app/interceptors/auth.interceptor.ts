// auth.interceptor.ts
import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { switchMap } from 'rxjs/operators';
import { UserContextService } from '@kba-services/user.context.service';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor(private userCtx: UserContextService) {}

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    // on attend le token (getIdToken gère le cache et le refresh)
    return from(this.userCtx.getIdToken(false)).pipe(
      switchMap(token => {
        const headers = token ? { Authorization: `Bearer ${token}` } : {};
        const cloned = req.clone({ setHeaders: headers } as any);
        return next.handle(cloned);
      })
    );
  }
}
