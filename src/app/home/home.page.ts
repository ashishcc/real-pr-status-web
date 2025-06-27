import { Component, ViewChild } from '@angular/core';
import { ApiService, PRResponse, DeveloperPRs } from '../services/api.service';
import { AuthService, UserInfo } from '../services/auth.service';
import { LoadingController, ToastController, PopoverController, IonPopover } from '@ionic/angular';
import { Router } from '@angular/router';

@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
  standalone: false,
})
export class HomePage {
  @ViewChild('userMenu', { static: false }) userMenu!: IonPopover;
  
  prData: PRResponse | null = null;
  loading = false;
  currentUser: UserInfo | null = null;
  groups: { [key: string]: string[] } = {};
  selectedGroup: string | null = null;
  currentlyFetchingDeveloper: string | null = null;
  fetchProgress: { completed: number; total: number } = { completed: 0, total: 0 };

  constructor(
    private apiService: ApiService,
    private authService: AuthService,
    private loadingController: LoadingController,
    private toastController: ToastController,
    private popoverController: PopoverController,
    private router: Router
  ) {
    // Subscribe to current user
    this.authService.currentUser.subscribe(user => {
      this.currentUser = user;
    });
  }

  ionViewWillEnter() {
    this.loadGroups();
  }

  async loadGroups() {
    this.apiService.getGroups().subscribe({
      next: (data) => {
        this.groups = data.groups;
      },
      error: async (error) => {
        const toast = await this.toastController.create({
          message: 'Failed to load groups',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  async fetchPullRequestsByGroup(groupName: string) {
    this.selectedGroup = groupName;
    this.prData = null;
    this.loading = true;
    
    // Get developers in the group
    const developers = this.groups[groupName] || [];
    this.fetchProgress = { completed: 0, total: developers.length };
    
    // Initialize the response structure
    const response: PRResponse = {
      developers: [],
      fetched_at: new Date().toISOString(),
      rate_limit_remaining: 0
    };

    // Create a custom loading controller that we can update
    const loading = await this.loadingController.create({
      message: `Starting to fetch PRs for ${groupName} group...`,
      spinner: 'circular'
    });
    await loading.present();

    // Fetch PRs for each developer sequentially to show progress
    for (let i = 0; i < developers.length; i++) {
      const developer = developers[i];
      this.currentlyFetchingDeveloper = developer;
      this.fetchProgress.completed = i;
      
      // Update loading message
      await loading.dismiss();
      const newLoading = await this.loadingController.create({
        message: `Fetching PRs for ${developer} (${i + 1}/${developers.length})...`,
        spinner: 'circular'
      });
      await newLoading.present();

      try {
        // Fetch individual developer PRs
        const devPRs = await this.fetchDeveloperPRs(developer);
        response.developers.push(devPRs);
        
        // Update the view with partial results
        this.prData = { ...response };
      } catch (error) {
        console.error(`Failed to fetch PRs for ${developer}:`, error);
        // Continue with other developers even if one fails
      }

      // Replace loading with the new one
      await newLoading.dismiss();
      loading.message = `Fetching PRs for ${developer} (${i + 1}/${developers.length})...`;
    }

    this.currentlyFetchingDeveloper = null;
    this.loading = false;
    
    // Final loading dismiss
    const finalLoading = await this.loadingController.create({
      message: 'Finalizing...',
      duration: 500
    });
    await finalLoading.present();
    
    const toast = await this.toastController.create({
      message: `Fetched ${this.getTotalPRCount()} pull requests for ${groupName} group`,
      duration: 2000,
      color: 'success'
    });
    await toast.present();
  }

  private fetchDeveloperPRs(username: string): Promise<DeveloperPRs> {
    return new Promise((resolve, reject) => {
      this.apiService.getDeveloperPullRequests(username).subscribe({
        next: (data) => {
          resolve(data);
        },
        error: (error) => {
          console.error(`Error fetching PRs for ${username}:`, error);
          // Return empty data on error so we can continue with other developers
          resolve({ username, pull_requests: [] });
        }
      });
    });
  }

  async fetchAllPullRequests() {
    this.selectedGroup = null;
    
    const loading = await this.loadingController.create({
      message: 'Fetching all pull requests...',
    });
    await loading.present();

    this.apiService.getPullRequests().subscribe({
      next: async (data) => {
        this.prData = data;
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: `Fetched ${this.getTotalPRCount()} pull requests`,
          duration: 2000,
          color: 'success'
        });
        await toast.present();
      },
      error: async (error) => {
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: error.error?.detail || 'Failed to fetch pull requests',
          duration: 3000,
          color: 'danger'
        });
        await toast.present();
      }
    });
  }

  getTotalPRCount(): number {
    if (!this.prData) return 0;
    return this.prData.developers.reduce((total, dev) => total + dev.pull_requests.length, 0);
  }

  formatDate(dateString: string): string {
    return new Date(dateString).toLocaleDateString();
  }

  getTimeSince(dateString: string): string {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return '1 day ago';
    if (diffDays < 30) return `${diffDays} days ago`;
    if (diffDays < 365) return `${Math.floor(diffDays / 30)} months ago`;
    return `${Math.floor(diffDays / 365)} years ago`;
  }

  scrollToDeveloper(username: string) {
    const element = document.getElementById(`developer-${username}`);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }

  toggleUserMenu(event: Event) {
    this.userMenu.event = event;
    this.userMenu.present();
  }

  async logout() {
    const loading = await this.loadingController.create({
      message: 'Signing out...',
    });
    await loading.present();

    this.authService.logout().subscribe({
      next: async () => {
        await loading.dismiss();
        
        const toast = await this.toastController.create({
          message: 'Signed out successfully',
          duration: 2000,
          color: 'success'
        });
        await toast.present();
        
        this.router.navigate(['/login']);
      },
      error: async () => {
        await loading.dismiss();
        // Even if logout fails, navigate to login
        this.router.navigate(['/login']);
      }
    });
  }
}
