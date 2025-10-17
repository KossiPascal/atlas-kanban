import { Component, OnInit, OnDestroy } from '@angular/core';
import { ApiDbService } from '@kba-services/apis/api-db.service';
import { SocketService } from '@kba-services/socket.service';
import { TokenRefreshService } from '@kba-services/token-refresh.service';
import { UserContextService } from '@kba-services/user.context.service';
import { User } from '@angular/fire/auth';
import { Subscription } from 'rxjs';
import { AuthService } from '@kba-services/auths.service';
import { Router } from '@angular/router';

@Component({
  standalone: false,
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.scss']
})
export class AppComponent implements OnInit, OnDestroy {
  private readonly MAX_RETRIES = 1;
  private sub?: Subscription;

  user: User | null = null;

  constructor(
    private userCtx: UserContextService,
    private socket: SocketService,
    private tokenRefresher: TokenRefreshService,
    private api: ApiDbService,
    private authService: AuthService,
    private router: Router
  ) { }

  async ngOnInit() {
    // start token refresher/service if you have one (optional)
    this.tokenRefresher.start();

    // attend l'initialisation Firebase (réhydratation)
    await this.userCtx.ensureInitialized();

    // maintenant user$ émettra la valeur actuelle et les suivants
    this.sub = this.userCtx.user$.subscribe(async (user) => {
      this.user = user;

      console.log(this.user)
      if (user) {
        try {
          await this.socket.connect();
          // lancer init sync uniquement si user présent
          this.initializeComponent();
        } catch (err) {
          console.error('[AppInit] Socket connection failed', err);
        }
      } else {
        this.socket.disconnect();
      }
    });
  }

  ngOnDestroy() {
    this.socket.disconnect();
    this.sub?.unsubscribe();
  }

  private async initializeComponent(retryCount: number = 0): Promise<void> {
    if (!this.user) return;

    if (location.port !== '4200') {
      console.log('[AppInit] Running outside dev environment');
    }

    try {
      const syncedToServer = await this.api.syncToServer('tasks');

      if (syncedToServer) {
        const syncedTasksFromServer = await this.api.syncFromServer('tasks');
        if (!syncedTasksFromServer) {
          return this.retryOrStop('syncTasksFromServer failed', retryCount);
        }

        const syncedUsersFromServer = await this.api.syncFromServer('users', false, true);
        if (!syncedUsersFromServer) {
          return this.retryOrStop('syncUsersFromServer failed', retryCount);
        }
      } else {
        return this.retryOrStop('syncToServer failed', retryCount);
      }

    } catch (error) {
      console.error('[AppInit] Initialization error:', error);
      return this.retryOrStop('exception during sync', retryCount);
    }
  }

  private async retryOrStop(reason: string, retryCount: number): Promise<void> {
    if (retryCount < this.MAX_RETRIES) {
      console.warn(`[AppInit] Retry (${retryCount + 1}/${this.MAX_RETRIES}) due to: ${reason}`);
      return this.initializeComponent(retryCount + 1);
    } else {
      console.error(`[AppInit] Aborted after ${this.MAX_RETRIES} retries. Last reason: ${reason}`);
    }
  }

  async logout() {
    const confirmed = confirm('Are you sure you want to log out?');
    if (confirmed) {
      try {
        await this.authService.logout();
        await this.router.navigate(['/auths/login']);
      } catch (error) {
        console.error('Logout failed:', error);
      }
    }
  }

}
