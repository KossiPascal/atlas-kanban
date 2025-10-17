import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable, from, timer, throwError, firstValueFrom } from 'rxjs';
import { catchError, switchMap } from 'rxjs/operators';
import { environment } from '@kba-environments/environment';
import { UserContextService } from './user.context.service';
import {
  Auth,
  setPersistence,
  browserLocalPersistence,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  User,
  GoogleAuthProvider,
  signInWithPopup,
  OAuthProvider,
  signOut,
  sendPasswordResetEmail,
  updatePassword,
  onAuthStateChanged
} from '@angular/fire/auth';

@Injectable({ providedIn: 'root' })
export class AuthService {
  private token: string | null = null;
  private readonly base = environment.backendUrl;

  constructor(
    private auth: Auth,
    private userCtx: UserContextService,
    private http: HttpClient
  ) {
    // Suivi automatique de la session utilisateur Firebase
    onAuthStateChanged(this.auth, async user => {
      if (user) {
        console.info('[AuthService] Auth state changed → user logged in:', user.email);
        await this.refreshToken();
      } else {
        console.info('[AuthService] Auth state changed → user logged out');
        this.token = null;
        localStorage.removeItem('fb_token');
      }
    });
  }

  /** Rafraîchit le token d’authentification toutes les 15 minutes */
  private async refreshToken(): Promise<void> {
    try {
      const currentUser = this.auth.currentUser;
      if (!currentUser) return;

      this.token = await currentUser.getIdToken(true);
      localStorage.setItem('fb_token', this.token);

      console.debug('[AuthService] Token rafraîchi avec succès.');
      timer(15 * 60 * 1000).subscribe(() => this.refreshToken());
    } catch (error) {
      console.error('[AuthService] Erreur lors du rafraîchissement du token', error);
    }
  }

  // ===================================================================
  // 🔹 AUTHENTIFICATION UTILISATEUR
  // ===================================================================

  /** Crée un utilisateur avec e-mail & mot de passe + envoie un mail de vérification */
  signup(email: string, password: string): Observable<User> {
    const actionCodeSettings = {
      // url: `${window.location.origin}/auth/verify-email?email=${encodeURIComponent(email)}`, // page de redirection
      url: `${window.location.origin}/tasks`, // page de redirection
      handleCodeInApp: false,
    };

    return from(
      createUserWithEmailAndPassword(this.auth, email, password)
        .then(async cred => {
          await sendEmailVerification(cred.user, actionCodeSettings);
          console.info('[AuthService] Email de vérification envoyé à', email);
          return cred.user;
        })
    ).pipe(
      catchError(err => {
        console.error('[AuthService] Erreur signup:', err);
        return throwError(() => new Error(this.mapFirebaseError(err.code)));
      })
    );
  }



  // signup(email: string, password: string): Observable<User> {

  //   // return from(
  //   //   createUserWithEmailAndPassword(this.auth, email, password)
  //   //     .then(async cred => {
  //   //       const user = cred.user;
  //   //       if (!user) throw new Error('Impossible de créer l’utilisateur');

  //   //       console.info('[AuthService] Utilisateur créé avec succès:', email);

  //   //       // ✅ Appel au backend NestJS pour envoyer un email personnalisé
  //   //       try {
  //   //         const options = await this.userCtx.authHeaders();

  //   //         const res = await firstValueFrom(this.http.post<{ status: number; data: any; }>(`${this.base}/api/auth/send-verification`, { uid: user.uid }, options));

  //   //         console.info('[AuthService] Email de vérification envoyé via backend');
  //   //       } catch (err) {
  //   //         console.error('[AuthService] Échec envoi email via backend:', err);
  //   //       }

  //   //       return user;
  //   //     })
  //   // ).pipe(
  //   //   catchError(err => {
  //   //     console.error('[AuthService] Erreur signup:', err);
  //   //     return throwError(() => new Error(this.mapFirebaseError(err.code)));
  //   //   })
  //   // );
  // }


  /** Connexion par e-mail et mot de passe */
  loginWithEmail(email: string, password: string): Observable<User> {
    return from(
      setPersistence(this.auth, browserLocalPersistence)
        .then(() => signInWithEmailAndPassword(this.auth, email, password))
        .then(cred => {
          if (!cred.user.emailVerified) {
            throw new Error('Veuillez vérifier votre e-mail avant de vous connecter.');
          }
          return cred.user;
        })
    ).pipe(
      catchError(err => {
        console.error('[AuthService] Erreur login:', err);
        return throwError(() => new Error(this.mapFirebaseError(err.code)));
      })
    );
  }

  /** Connexion via Google */
  loginWithGoogle(): Observable<User> {
    const provider = new GoogleAuthProvider();
    return from(
      setPersistence(this.auth, browserLocalPersistence).then(() =>
        signInWithPopup(this.auth, provider)
      )
    ).pipe(
      switchMap(async cred => cred.user),
      catchError(err => {
        console.error('[AuthService] Erreur Google login:', err);
        return throwError(() => new Error(this.mapFirebaseError(err.code)));
      })
    );
  }

  /** Connexion via Microsoft */
  loginWithMicrosoft(): Observable<User> {
    const provider = new OAuthProvider('microsoft.com');
    return from(
      setPersistence(this.auth, browserLocalPersistence).then(() =>
        signInWithPopup(this.auth, provider)
      )
    ).pipe(
      switchMap(async cred => cred.user),
      catchError(err => {
        console.error('[AuthService] Erreur Microsoft login:', err);
        return throwError(() => new Error(this.mapFirebaseError(err.code)));
      })
    );
  }

  /** Déconnexion complète */
  async logout(): Promise<void> {
    try {
      await signOut(this.auth);
      this.token = null;
      localStorage.removeItem('fb_token');
      console.log('[AuthService] Utilisateur déconnecté avec succès');
    } catch (error) {
      console.error('[AuthService] Échec de la déconnexion', error);
    }
  }


  // async revokeUserTokens(uid: string): Promise<void> {
  //   await admin.auth().revokeRefreshTokens(uid);
  // }

  /** Send email verification */
  sendVerification(user: User): Observable<void> {
    return from(sendEmailVerification(user));
  }
  /** Réinitialisation du mot de passe */
  sendPasswordReset(email: string): Observable<void> {
    const actionCodeSettings = {
      url: `${window.location.origin}/auth/reset-password`,
      handleCodeInApp: false,
    };
    return from(sendPasswordResetEmail(this.auth, email, actionCodeSettings)).pipe(
      catchError(err => {
        console.error('[AuthService] Erreur reset password:', err);
        return throwError(() => new Error(this.mapFirebaseError(err.code)));
      })
    );
  }

  /** Changer le mot de passe (utilisateur connecté) */
  changePassword(newPassword: string): Observable<void> {
    const user = this.auth.currentUser;
    if (!user) return throwError(() => new Error('Utilisateur non authentifié'));
    return from(updatePassword(user, newPassword)).pipe(
      catchError(err => {
        console.error('[AuthService] Erreur changement mot de passe:', err);
        return throwError(() => new Error(this.mapFirebaseError(err.code)));
      })
    );
  }

  // ===================================================================
  // 🔹 API BACKEND (JWT Firebase)
  // ===================================================================

  profile(): Observable<any> {
    return from(this.userCtx.authHeaders()).pipe(
      switchMap(options => this.http.get(`${this.base}/api/auths/profile`, options))
    );
  }

  refreshSession(): Observable<any> {
    return from(this.userCtx.authHeaders()).pipe(
      switchMap(options => this.http.post(`${this.base}/api/auths/refresh`, {}, options))
    );
  }

  revokeSession(): Observable<any> {
    return from(this.userCtx.authHeaders()).pipe(
      switchMap(options => this.http.post(`${this.base}/api/auths/logout`, {}, options))
    );
  }

  // ===================================================================
  // 🔹 HELPERS
  // ===================================================================

  /** Conversion des erreurs Firebase en messages lisibles */
  private mapFirebaseError(code: string): string {
    const map: Record<string, string> = {
      'auth/email-already-in-use': 'Cette adresse e-mail est déjà utilisée.',
      'auth/invalid-email': 'Adresse e-mail invalide.',
      'auth/weak-password': 'Le mot de passe est trop faible.',
      'auth/user-not-found': 'Aucun utilisateur trouvé avec cet e-mail.',
      'auth/wrong-password': 'Mot de passe incorrect.',
      'auth/too-many-requests': 'Trop de tentatives. Réessayez plus tard.',
    };
    return map[code] || 'Une erreur inattendue est survenue. Réessayez.';
  }
}