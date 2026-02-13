import { Component, OnInit } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

interface KnowledgeResource {
  id: number;
  title: string;
  category: string;
  description: string;
  url: string;
  icon: string;
}

@Component({
  selector: 'app-web-knowledge-base',
  templateUrl: './web-knowledge-base.component.html',
  styleUrls: ['./web-knowledge-base.component.scss'],
  standalone: false,
})
export class WebKnowledgeBaseComponent implements OnInit {
  resources: KnowledgeResource[] = [];
  filteredResources: KnowledgeResource[] = [];
  categories: string[] = [];
  selectedCategory: string = 'All';
  loading: boolean = true;
  error: string | null = null;

  constructor(private http: HttpClient) {}

  ngOnInit() {
    this.loadResources();
  }

  loadResources() {
    this.loading = true;
    this.error = null;

    this.http.get<KnowledgeResource[]>(`${environment.backendApiUrl}/knowledge-base/`).subscribe({
      next: (data) => {
        this.resources = data;
        this.filteredResources = data;
        this.categories = ['All', ...new Set(data.map(r => r.category))];
        this.loading = false;
      },
      error: (err) => {
        console.error('Failed to load knowledge base:', err);
        this.error = 'Could not connect to the server. Showing offline resources.';
        this.loadFallbackResources();
        this.loading = false;
      }
    });
  }

  filterByCategory(category: string) {
    this.selectedCategory = category;
    if (category === 'All') {
      this.filteredResources = this.resources;
    } else {
      this.filteredResources = this.resources.filter(r => r.category === category);
    }
  }

  openResource(url: string) {
    window.open(url, '_blank');
  }

  private loadFallbackResources() {
    this.resources = [
      { id: 1, title: 'Toastmasters International', category: 'Organization', description: 'A worldwide nonprofit that helps people develop public speaking and leadership skills through local clubs.', url: 'https://www.toastmasters.org', icon: 'people-outline' },
      { id: 2, title: 'TED Talks - How to Speak', category: 'Video Course', description: 'MIT Professor Patrick Winston\'s legendary lecture on how to speak effectively.', url: 'https://www.youtube.com/watch?v=Unzc731iCUY', icon: 'videocam-outline' },
      { id: 3, title: 'The Art of Public Speaking - Wikibooks', category: 'Free Guide', description: 'A comprehensive, community-written guide covering speech preparation, delivery techniques, and audience engagement.', url: 'https://en.wikibooks.org/wiki/Public_Speaking', icon: 'library-outline' },
      { id: 4, title: 'Praat - Speech Analysis Software', category: 'Tool', description: 'Free, open-source software for phonetic analysis of speech.', url: 'https://www.fon.hum.uva.nl/praat/', icon: 'analytics-outline' },
      { id: 5, title: 'LibriVox - Public Domain Audiobooks', category: 'Audio Resource', description: 'Free public domain audiobooks. Great for studying pacing, tone, and vocal delivery.', url: 'https://librivox.org', icon: 'headset-outline' },
      { id: 6, title: 'Coursera - Introduction to Public Speaking', category: 'Online Course', description: 'Free course from the University of Washington covering informative, persuasive, and special occasion speeches.', url: 'https://www.coursera.org/learn/public-speaking', icon: 'laptop-outline' },
    ];
    this.filteredResources = this.resources;
    this.categories = ['All', ...new Set(this.resources.map(r => r.category))];
  }
}
