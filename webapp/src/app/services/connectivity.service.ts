import { Injectable, NgZone } from "@angular/core";
import { BehaviorSubject, debounceTime, fromEvent, merge, Observable } from "rxjs";

@Injectable({ providedIn: 'root' })
export class ConnectivityService {
  private readonly _status$ = new BehaviorSubject<boolean>(navigator.onLine);
  private readonly _checkUrl = 'https://www.gstatic.com/generate_204';

  constructor(private ngZone: NgZone) {
    this.monitorBrowserEvents();
    this.checkOfflineFallback();
    // this.autoPingEvery(1000);  // Toutes les 1 secondes
  }

  private monitorBrowserEvents() {
    this.ngZone.runOutsideAngular(() => {
      merge(fromEvent(window, 'online'), fromEvent(window, 'offline'))
        .pipe(debounceTime(300))
        .subscribe(() => this.ngZone.run(() => this.checkOfflineFallback()));
    });
  }
  private autoPingEvery(intervalMs: number) {
    this.ngZone.runOutsideAngular(() => {
      setInterval(() => {
        this.ngZone.run(() => this.checkOfflineFallback());
      }, intervalMs);
    });
  }


  private async checkOfflineFallback() {
    if (!navigator.onLine) {
      this._status$.next(false);
      return;
    }

    const controller = new AbortController();
    const signal = controller.signal;
    const timeout = setTimeout(() => controller.abort(), 3000);

    try {
      const response = await fetch(this._checkUrl, {
        method: 'GET',
        cache: 'no-cache',
        mode: 'no-cors',
        signal
      });

      clearTimeout(timeout);

      // Analyse en fonction du type de réponse
      if (response.type === 'opaque') {
        // En ligne, mais réponse cross-origin non lisible
        this._status$.next(true);
      } else if (response.status >= 200 && response.status < 400) {
        this._status$.next(true);
      } else {
        // console.warn("Fetch terminé mais avec erreur HTTP:", response.status);
        this._status$.next(false);
      }
    } catch (err) {
      clearTimeout(timeout);
      // console.error("Erreur réseau ou timeout:", err);
      this._status$.next(false);
    }
  }

  get onlineStatus$(): Observable<boolean> {
    return this._status$.asObservable();
  }

  get isOnline(): boolean {
    return this._status$.value;
  }
}




// import { Injectable } from '@angular/core';
// import { BehaviorSubject, Observable } from 'rxjs';

// @Injectable({
//   providedIn: 'root'
// })
// export class ConnectivityService {
//   private _status$: BehaviorSubject<boolean> = new BehaviorSubject<boolean>(false);
//   private readonly testUrl: string = 'https://clients3.google.com/generate_204'; // returns 204 if connected
//   private readonly checkIntervalMs: number = 15000; // check every 15s

//   constructor() {
//     this.initConnectivityCheck();
//   }

//   private initConnectivityCheck(): void {
//     // First check
//     this.verifyInternetAccess();

//     // Listen to browser online/offline events
//     window.addEventListener('online', () => this.verifyInternetAccess());
//     window.addEventListener('offline', () => this.setStatus(false));

//     // Periodic checks
//     setInterval(() => this.verifyInternetAccess(), this.checkIntervalMs);
//   }

//   private async verifyInternetAccess(): Promise<void> {
//     if (!navigator.onLine) {
//       this.setStatus(false);
//       return;
//     }

//     try {
//       const controller = new AbortController();
//       const timeout = setTimeout(() => controller.abort(), 3000); // 3s timeout

//       const response = await fetch(this.testUrl, {
//         method: 'GET',
//         mode: 'no-cors',
//         signal: controller.signal
//       });

//       clearTimeout(timeout);

//       // Even if fetch doesn't return status (no-cors), reaching here means we got a response
//       this.setStatus(true);
//     } catch (err) {
//       this.setStatus(false);
//     }
//   }

//   private setStatus(status: boolean): void {
//     if (this._status$.value !== status) {
//       this._status$.next(status);
//     }
//   }

//   /**
//    * Observable that emits online status changes.
//    */
//   get onlineStatus(): Observable<boolean> {
//     return this._status$.asObservable();
//   }

//   /**
//    * Get the current online status (real-time).
//    */
//   get isOnline(): boolean {
//     return this._status$.getValue();
//   }
// }
