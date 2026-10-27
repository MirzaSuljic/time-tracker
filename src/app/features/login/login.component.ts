import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService, DEMO_ACCOUNTS } from '../../core/services/auth.service';
import { IconComponent } from '../../core/ui/icon.component';

export function safeReturnUrl(value: string | null): string {
  if (!value || !value.startsWith('/') || value.startsWith('//') || value.startsWith('/login')) return '/entries';
  return value;
}

@Component({
  selector: 'app-login',
  imports: [ReactiveFormsModule, IconComponent],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  private auth = inject(AuthService);
  private router = inject(Router);
  private route = inject(ActivatedRoute);
  private fb = inject(FormBuilder);

  readonly demo = DEMO_ACCOUNTS[0];

  form = this.fb.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
    remember: [true],
  });

  showPassword = signal(false);
  loading = signal(false);
  error = signal('');

  showError(field: 'email' | 'password') {
    const control = this.form.controls[field];
    return control.invalid && control.touched;
  }

  useDemo() {
    this.form.patchValue({ email: this.demo.email, password: this.demo.password });
    this.error.set('');
  }

  submit() {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }
    const { email, password, remember } = this.form.getRawValue();
    this.loading.set(true);
    this.error.set('');
    this.auth.login(email, password, remember).subscribe({
      next: () => {
        this.loading.set(false);
        this.router.navigateByUrl(safeReturnUrl(this.route.snapshot.queryParamMap.get('returnUrl')));
      },
      error: (e: Error) => {
        this.loading.set(false);
        this.error.set(e.message);
      },
    });
  }
}
