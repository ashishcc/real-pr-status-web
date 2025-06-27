import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController } from '@ionic/angular';
import { AuthService } from '../services/auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  username = '';
  password = '';
  loading = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController
  ) { }

  ngOnInit() {
    // Check if already authenticated
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/home']);
    }
  }

  async login() {
    if (!this.username || !this.password) {
      const toast = await this.toastController.create({
        message: 'Please enter username and password',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    // Validate hardcoded credentials
    if (this.username === 'real-user' && this.password === 'OneReal@Rocks#') {
      this.loading = true;
      
      const loading = await this.loadingController.create({
        message: 'Signing in...',
      });
      await loading.present();
      
      // Call auth service with mock token
      this.authService.loginWithCredentials(this.username).subscribe({
        next: async () => {
          await loading.dismiss();
          
          const toast = await this.toastController.create({
            message: 'Welcome!',
            duration: 2000,
            color: 'success'
          });
          await toast.present();
          
          // Redirect to home
          const redirectUrl = localStorage.getItem('redirectUrl') || '/home';
          localStorage.removeItem('redirectUrl');
          this.router.navigate([redirectUrl]);
        },
        error: async (error) => {
          await loading.dismiss();
          this.loading = false;
          
          const toast = await this.toastController.create({
            message: error.error?.detail || 'Authentication failed',
            duration: 3000,
            color: 'danger'
          });
          await toast.present();
        }
      });
    } else {
      const toast = await this.toastController.create({
        message: 'Invalid username or password',
        duration: 2000,
        color: 'danger'
      });
      await toast.present();
    }
  }
}