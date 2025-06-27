import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';

export interface ReviewComments {
  total: number;
  resolved: number;
  unresolved: number;
}

export interface PullRequest {
  id: number;
  number: number;
  title: string;
  repository: string;
  created_at: string;
  url: string;
  state: string;
  review_comments: ReviewComments;
  reviewers: string[];
  first_comment_date: string | null;
  last_comment_date: string | null;
  last_comment_by: string | null;
}

export interface DeveloperPRs {
  username: string;
  pull_requests: PullRequest[];
}

export interface PRResponse {
  developers: DeveloperPRs[];
  fetched_at: string;
  rate_limit_remaining: number;
}

@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private apiUrl = environment.apiUrl || 'http://localhost:8000';

  constructor(private http: HttpClient) { }

  getPullRequests(): Observable<PRResponse> {
    return this.http.get<PRResponse>(`${this.apiUrl}/api/pull-requests`);
  }

  getRateLimit(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/rate-limit`);
  }

  getDevelopers(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/developers`);
  }

  getGroups(): Observable<any> {
    return this.http.get(`${this.apiUrl}/api/groups`);
  }

  getGroupPullRequests(groupName: string): Observable<PRResponse> {
    return this.http.get<PRResponse>(`${this.apiUrl}/api/groups/${groupName}/pull-requests`);
  }

  getDeveloperPullRequests(username: string): Observable<DeveloperPRs> {
    return this.http.get<DeveloperPRs>(`${this.apiUrl}/api/developers/${username}/pull-requests`);
  }
}