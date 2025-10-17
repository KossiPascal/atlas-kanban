import { Component } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { Router } from '@angular/router';
import { MatSnackBar } from '@angular/material/snack-bar';
import { AuthService } from '@kba-services/auths.service';

@Component({
  standalone: false,
  selector: 'app-register',
  templateUrl: './register.component.html',
  styleUrls: ['./register.component.scss']
})
export class RegisterComponent {
  form: FormGroup;
  loading = false;
  error: string | null = null;
  success: string | null = null;

  constructor(private fb: FormBuilder, private auth: AuthService, private router: Router, private snack: MatSnackBar) {
    this.form = this.fb.group({
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(6)]],
      confirmPassword: ['', Validators.required]
    }, { validators: this.passwordMatchValidator });
  }

  /** Password match validator */
  passwordMatchValidator(form: FormGroup) {
    return form.get('password')?.value === form.get('confirmPassword')?.value ? null : { mismatch: true };
  }

  async submit() {
    if (this.form.invalid) return;
    this.loading = true;
    this.error = null;
    this.success = null;

    const { email, password } = this.form.value;
    try {
      this.auth.signup(email, password).subscribe({
        next: (user) => {
          this.snack.open('Account created! Check your email for verification.', 'Close', { duration: 5000 });
          this.form.reset();
          this.router.navigate(['/auths/login']);
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
