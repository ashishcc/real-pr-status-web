import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule, ModalController } from '@ionic/angular';

@Component({
  selector: 'app-mock-auth-modal',
  templateUrl: './mock-auth-modal.component.html',
  styleUrls: ['./mock-auth-modal.component.scss'],
  standalone: true,
  imports: [CommonModule, FormsModule, IonicModule]
})
export class MockAuthModalComponent {
  username = '';
  password = '';
  errorMessage = '';

  constructor(private modalController: ModalController) {}

  dismiss() {
    this.modalController.dismiss();
  }

  login() {
    // Validate hardcoded credentials
    if (this.username === 'real-user' && this.password === 'OneReal@Rocks#') {
      this.modalController.dismiss({
        authenticated: true,
        username: this.username
      });
    } else {
      this.errorMessage = 'Invalid username or password';
    }
  }
}
