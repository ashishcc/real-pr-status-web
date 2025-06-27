import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';

@Component({
  selector: 'app-auth-callback',
  templateUrl: './auth-callback.page.html',
  styleUrls: ['./auth-callback.page.scss'],
  standalone: false,
})
export class AuthCallbackPage implements OnInit {

  constructor(private router: Router) { }

  ngOnInit() {
    // Handle the OAuth callback
    this.handleOAuthCallback();
  }

  handleOAuthCallback() {
    // For form_post response mode, Google will POST the token to this page
    // We need to extract it and send it back to the opener window
    
    // Check if this page was opened as a popup
    if (window.opener) {
      // Get the ID token from the URL hash or form data
      const urlParams = new URLSearchParams(window.location.search);
      const hashParams = new URLSearchParams(window.location.hash.substring(1));
      
      // Try to get token from various possible locations
      const idToken = urlParams.get('id_token') || 
                      hashParams.get('id_token') || 
                      this.getTokenFromFormPost();
      
      if (idToken) {
        // Send the token back to the opener window
        window.opener.postMessage({
          type: 'google-auth-success',
          token: idToken
        }, window.location.origin);
        
        // Close this popup
        window.close();
      } else {
        // If no token found, check if there's an error
        const error = urlParams.get('error') || hashParams.get('error');
        if (error) {
          window.opener.postMessage({
            type: 'google-auth-error',
            error: error
          }, window.location.origin);
          window.close();
        }
      }
    } else {
      // If not a popup, redirect to login
      this.router.navigate(['/login']);
    }
  }

  getTokenFromFormPost(): string | null {
    // For form_post, Google might inject the token into the page
    // Check if there are any script tags with the token data
    const scripts = document.getElementsByTagName('script');
    for (let i = 0; i < scripts.length; i++) {
      const scriptContent = scripts[i].innerHTML;
      if (scriptContent.includes('id_token')) {
        // Extract token from script content
        const match = scriptContent.match(/id_token['"]\s*:\s*['"]([^'"]+)['"]/);
        if (match) {
          return match[1];
        }
      }
    }
    
    // Also check for form inputs
    const inputs = document.getElementsByTagName('input');
    for (let i = 0; i < inputs.length; i++) {
      if (inputs[i].name === 'id_token') {
        return inputs[i].value;
      }
    }
    
    return null;
  }
}