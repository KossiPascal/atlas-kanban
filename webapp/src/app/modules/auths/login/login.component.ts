import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@kba-services/auths.service';
import { firstValueFrom } from 'rxjs';
import { User } from '@angular/fire/auth';


@Component({
  standalone: false,
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.scss']
})
export class LoginComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private snack: MatSnackBar) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]]
    });
  }

  async loginWith(type: 'email' | 'google' | 'microsoft') {
    if (this.loading) return;
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.loading = true;

    try {
      let user: User | null = null;

      if (type == 'email') {
        const { email, password } = this.form.value;
        user = await firstValueFrom(this.auth.loginWithEmail(email, password));
      } else if (type == 'google') {
        user = await firstValueFrom(this.auth.loginWithGoogle());
      } else if (type == 'microsoft') {
        user = await firstValueFrom(this.auth.loginWithMicrosoft());
      }

      if (user) {
        this.snack.open('Login successful!', 'Close', { duration: 3000 });
        this.router.navigate(['/tasks']);
      } else {
        this.snack.open('Login failed', 'Close', { duration: 5000 });
      }
    } catch (err: any) {
      this.snack.open(err?.message || 'Login failed', 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
