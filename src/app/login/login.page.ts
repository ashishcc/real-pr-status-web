import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { LoadingController, ToastController, ModalController } from '@ionic/angular';
import { AuthService, GoogleSSOInfo } from '../services/auth.service';
import { MockAuthModalComponent } from '../components/mock-auth-modal/mock-auth-modal.component';

declare var google: any;

@Component({
  selector: 'app-login',
  templateUrl: './login.page.html',
  styleUrls: ['./login.page.scss'],
  standalone: false,
})
export class LoginPage implements OnInit {
  loading = false;
  email = '';
  ssoInfo: GoogleSSOInfo | null = null;
  showEmailInput = true;
  googleClientId = '639420957965-0ttguvarcifdue7b79krl76b20q6nb6p.apps.googleusercontent.com'; // Replace with your actual Google Client ID

  constructor(
    private authService: AuthService,
    private router: Router,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private modalController: ModalController
  ) { }

  ngOnInit() {
    // Check if already authenticated
    if (this.authService.isAuthenticated) {
      this.router.navigate(['/home']);
    }
    
    // Initialize Google Sign-In
    this.initializeGoogleSignIn();
  }

  initializeGoogleSignIn() {
    // Load Google Sign-In SDK
    const script = document.createElement('script');
    script.src = 'https://accounts.google.com/gsi/client';
    script.async = true;
    script.defer = true;
    script.onload = () => {
      // Initialize Google Sign-In
      if (typeof google !== 'undefined') {
        google.accounts.id.initialize({
          client_id: this.googleClientId,
          callback: this.handleGoogleSignIn.bind(this),
          auto_select: false,
          cancel_on_tap_outside: true,
        });
      }
    };
    document.head.appendChild(script);
  }

  async checkEmailSSO() {
    if (!this.email || !this.email.includes('@')) {
      const toast = await this.toastController.create({
        message: 'Please enter a valid email address',
        duration: 2000,
        color: 'warning'
      });
      await toast.present();
      return;
    }

    this.loading = true;
    
    // If in localhost/development, skip the SSO check and use mock auth
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      this.ssoInfo = { googleSsoEnabled: true, forceGoogleSso: true };
      this.loading = false;
      this.showEmailInput = false;
      return;
    }
    
    // Step 1: Check if email is enabled for Google SSO
    this.authService.checkGoogleSSO(this.email).subscribe({
      next: async (ssoInfo) => {
        this.ssoInfo = ssoInfo;
        this.loading = false;
        
        // Step 3: Show appropriate sign-in button based on SSO info
        if (ssoInfo.googleSsoEnabled) {
          this.showEmailInput = false;
        } else {
          // If not forced Google SSO, show regular login options
          const toast = await this.toastController.create({
            message: 'This email does not require Google SSO',
            duration: 2000,
            color: 'info'
          });
          await toast.present();
        }
      },
      error: async (error) => {
        this.loading = false;
        console.error('SSO check error:', error);
        
        // Default to showing Google sign-in option
        this.ssoInfo = { googleSsoEnabled: true, forceGoogleSso: false };
        this.showEmailInput = false;
      }
    });
  }

  signInWithGoogleForEmail() {
    // Step 4: Open Google OAuth2 popup window
    // If we're in development/localhost, use mock auth instead
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      // Use mock auth for local development
      this.handleGoogleToken('mock-google-access-token');
    } else {
      // Use real OAuth2 flow in production
      this.openGoogleOAuthPopup();
    }
  }

  openGoogleOAuthPopup() {
    const width = 500;
    const height = 600;
    const left = (window.innerWidth - width) / 2;
    const top = (window.innerHeight - height) / 2;
    
    // Using the same format as the working URL
    const redirectUri = window.location.origin + '/auth/callback';
    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth/oauthchooseaccount?` +
      `client_id=${this.googleClientId}` +
      `&scope=openid%20email%20profile` +
      `&response_type=id_token` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&response_mode=form_post` +
      `&origin=${encodeURIComponent(window.location.origin)}` +
      `&display=popup` +
      `&prompt=select_account` +
      `&flowName=GeneralOAuthFlow`;
    
    const popup = window.open(
      authUrl,
      'google-auth',
      `width=${width},height=${height},left=${left},top=${top}`
    );
    
    // Listen for the callback
    window.addEventListener('message', (event) => {
      if (event.origin !== window.location.origin) return;
      
      if (event.data.type === 'google-auth-success') {
        popup?.close();
        this.handleGoogleToken(event.data.token);
      }
    });
  }

  async handleGoogleSignIn(response: any) {
    // This is called by Google Sign-In SDK
    if (response.credential) {
      await this.handleGoogleToken(response.credential);
    }
  }

  async handleGoogleToken(googleToken: string) {
    this.loading = true;
    
    const loading = await this.loadingController.create({
      message: 'Signing in...',
    });
    await loading.present();
    
    // Step 5: Call Keymaker signin-by-google endpoint
    this.authService.googleLogin(googleToken).subscribe({
      next: async (response) => {
        await loading.dismiss();
        
        // Check if 2FA is required
        // In the actual flow, you would check the Keymaker response for forceMfa
        // and redirect to bolt.therealbrokerage.com/login/2fa if needed
        
        const toast = await this.toastController.create({
          message: `Welcome!`,
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        
        // Redirect to home or stored URL
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
  }

  resetToEmailInput() {
    this.showEmailInput = true;
    this.ssoInfo = null;
    this.email = '';
  }

  // For testing with mock auth
  async signInWithMockAuth() {
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
      const modal = await this.modalController.create({
        component: MockAuthModalComponent,
        cssClass: 'mock-auth-modal'
      });
      
      await modal.present();
      
      const { data } = await modal.onWillDismiss();
      
      if (data?.authenticated) {
        // Use the username from the modal for the mock token
        await this.handleGoogleToken(`mock-${data.username}-token`);
      }
    }
  }

  // Helper method to check if running on localhost
  isLocalhost(): boolean {
    return window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  }
}