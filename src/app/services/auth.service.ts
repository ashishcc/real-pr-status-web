import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, Observable, of } from 'rxjs';
import { map, tap, catchError } from 'rxjs/operators';
import { environment } from '../../environments/environment';

export interface UserInfo {
  username: string;
  email: string;
  full_name?: string;
  picture?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user_info: UserInfo;
}

export interface GoogleSSOInfo {
  googleSsoEnabled: boolean;
  forceGoogleSso: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class AuthService {
  private apiUrl = environment.apiUrl || 'http://localhost:8000';
  private tokenKey = 'pr_tracker_token';
  private userKey = 'pr_tracker_user';
  
  private currentUserSubject: BehaviorSubject<UserInfo | null>;
  public currentUser: Observable<UserInfo | null>;
  
  constructor(private http: HttpClient) {
    const storedUser = this.getStoredUser();
    this.currentUserSubject = new BehaviorSubject<UserInfo | null>(storedUser);
    this.currentUser = this.currentUserSubject.asObservable();
  }
  
  public get currentUserValue(): UserInfo | null {
    return this.currentUserSubject.value;
  }
  
  public get isAuthenticated(): boolean {
    return !!this.getToken();
  }
  
  checkGoogleSSO(email: string): Observable<GoogleSSOInfo> {
    return this.http.get<GoogleSSOInfo>(`${this.apiUrl}/api/auth/check-google-sso`, {
      params: { email }
    });
  }
  
  googleLogin(accessToken: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${this.apiUrl}/api/auth/google`, {
      access_token: accessToken
    }).pipe(
      tap(response => {
        this.storeToken(response.access_token);
        this.storeUser(response.user_info);
        this.currentUserSubject.next(response.user_info);
      })
    );
  }
  
  logout(): Observable<any> {
    return this.http.post(`${this.apiUrl}/api/auth/logout`, {}).pipe(
      tap(() => {
        this.clearAuth();
      }),
      catchError(() => {
        // Clear auth even if logout endpoint fails
        this.clearAuth();
        return of(null);
      })
    );
  }
  
  getMe(): Observable<UserInfo> {
    return this.http.get<UserInfo>(`${this.apiUrl}/api/auth/me`).pipe(
      tap(user => {
        this.storeUser(user);
        this.currentUserSubject.next(user);
      })
    );
  }
  
  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }
  
  private storeToken(token: string): void {
    localStorage.setItem(this.tokenKey, token);
  }
  
  private storeUser(user: UserInfo): void {
    localStorage.setItem(this.userKey, JSON.stringify(user));
  }
  
  private getStoredUser(): UserInfo | null {
    const userStr = localStorage.getItem(this.userKey);
    if (userStr) {
      try {
        return JSON.parse(userStr);
      } catch {
        return null;
      }
    }
    return null;
  }
  
  private clearAuth(): void {
    localStorage.removeItem(this.tokenKey);
    localStorage.removeItem(this.userKey);
    this.currentUserSubject.next(null);
  }
}