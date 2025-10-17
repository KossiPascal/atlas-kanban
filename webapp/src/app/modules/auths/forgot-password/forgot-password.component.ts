import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@kba-services/auths.service';

@Component({
  standalone: false,
  selector: 'app-forgot-password',
  templateUrl: './forgot-password.component.html',
  styleUrls: ['./forgot-password.component.scss']
})
export class ForgotPasswordComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, private snack: MatSnackBar) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]]
    });
  }

  async submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    this.success = null;
    try {
      this.auth.sendPasswordReset(this.form.value.email).subscribe({
        next: (user) => {
          this.snack.open('Password reset email sent!', 'Close', { duration: 5000 });
        },
        error: (err: any) => {
          this.snack.open(err.message, 'Close', { duration: 5000 });
        },
      });
    } catch (err: any) {
      this.snack.open(err.message, 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
