import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@kba-services/auths.service';

@Component({
  standalone: false,
  selector: 'app-change-password',
  templateUrl: './change-password.component.html',
  styleUrls: ['./change-password.component.scss']
})
export class ChangePasswordComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, private snack: MatSnackBar) {
    this.form = this.fb.group({
      currentPassword: ['', Validators.required],
      newPassword: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  passwordMatchValidator(form: FormGroup) {
    return form.get('newPassword')?.value === form.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  async changePassword() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    this.success = null;

    const { currentPassword, newPassword } = this.form.value;

    try {
      this.auth.changePassword(newPassword).subscribe({
        next: (user) => {
          this.snack.open('Password changed successfully!', 'Close', { duration: 5000 });
        },
        error: (err: any) => {
          this.snack.open(err.message, 'Close', { duration: 5000 });
        },
      });

      this.form.reset();
    } catch (err: any) {
      this.snack.open(err.message, 'Close', { duration: 5000 });
    } finally {
      this.loading = false;
    }
  }
}
