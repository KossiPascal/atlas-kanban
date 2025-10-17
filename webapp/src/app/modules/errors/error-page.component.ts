import { Component } from '@angular/core';
import { ActivatedRoute } from '@angular/router';
import { Location } from '@angular/common';

@Component({
  standalone: false,
  selector: 'app-error-page',
  templateUrl: './error-page.component.html',
  styleUrls: ['./error-page.component.scss']
})
export class ErrorPageComponent {
  code!: string;
  message!: string;
  icon!: string;
  showGoToHome = false;
  defaultPage!: string;

  constructor(
    private route: ActivatedRoute,
    private location: Location,
  ) {
    this.initialize();
  }

  async initialize() {
    const params = this.route.snapshot.params;
    const data = this.route.snapshot.data;

    this.code = params['code'] ?? 'Erreur';
    const rawMsg = params['msg'];

    const defaultMessages = data['defaultMessage'] || {};
    const iconMap = data['iconMap'] || {};

    this.message = rawMsg && rawMsg !== 'null' && rawMsg.trim() !== ''
      ? decodeURIComponent(rawMsg)
      : defaultMessages[this.code] ?? 'Une erreur s’est produite.';

    this.icon = iconMap[this.code] ?? '❌';
    this.showGoToHome = this.code === '401'; // activer bouton "accueil" pour 401 uniquement

    if (this.showGoToHome) {
      // this.defaultPage = await this.userCtx.defaultPage();
    }
  }

  goBack(): void {
    this.location.back();
    setTimeout(() => window.location.reload(), 100);
  }

  logout(): void {
    // this.auth.logout();
  }

  goToHome(): void {
    if (this.defaultPage) {
      location.href = this.defaultPage;
    }
  }
}
