import { Component, OnInit } from '@angular/core';
import { AdaptiveLearningService, QuizQuestion } from '../../services/adaptive-learning.service';
import { FirebaseService } from '../../services/firebase.service';

interface KnowledgeResource {
  id: number;
  title: string;
  category: string;
  description: string;
  url: string;
  icon: string;
}

interface QuizCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  glowColor: string;
}

@Component({
  selector: 'app-web-knowledge-base',
  templateUrl: './web-knowledge-base.component.html',
  styleUrls: ['./web-knowledge-base.component.scss'],
  standalone: false,
})
export class WebKnowledgeBaseComponent implements OnInit {

  // ── Resources ──────────────────────────────────────────────────────────────
  resources: KnowledgeResource[] = [];
  filteredResources: KnowledgeResource[] = [];
  categories: string[] = [];
  selectedCategory: string = 'All';
  loading: boolean = true;
  error: string | null = null;

  // ── View toggle ────────────────────────────────────────────────────────────
  activeView: 'resources' | 'quiz' = 'resources';

  // ── Quiz state ─────────────────────────────────────────────────────────────
  selectedQuizCategoryId: string | null = null;
  currentQuestionIndex: number = 0;
  selectedOptionIndex: number | null = null;
  answered: boolean = false;
  quizScore: number = 0;
  quizComplete: boolean = false;
  questions: QuizQuestion[] = [];
  quizLoading: boolean = false;
  quizError: string | null = null;
  quizFocus: string[] = [];
  quizSources: string[] = [];
  private quizRequest = 0;

  // ── Quiz data ──────────────────────────────────────────────────────────────
  quizCategories: QuizCategory[] = [
    {
      id: 'informative',
      label: 'Informative',
      icon: 'information-circle-outline',
      description: 'Test your knowledge on speeches that educate, explain, and enlighten.',
      color: '#22a7f0',
      glowColor: 'rgba(34, 167, 240, 0.35)'
    },
    {
      id: 'persuasive',
      label: 'Persuasive',
      icon: 'megaphone-outline',
      description: 'Challenge yourself on the art of changing minds and influencing audiences.',
      color: '#9c27b0',
      glowColor: 'rgba(156, 39, 176, 0.35)'
    },
    {
      id: 'motivational',
      label: 'Motivational',
      icon: 'flame-outline',
      description: 'Explore the techniques that spark inspiration and drive people to action.',
      color: '#ff9800',
      glowColor: 'rgba(255, 152, 0, 0.35)'
    }
  ];

  constructor(
    private adaptiveLearning: AdaptiveLearningService,
    private firebaseService: FirebaseService
  ) {}

  ngOnInit() {
    this.loadResources();
  }

  // ── Resource methods ────────────────────────────────────────────────────────
  loadResources() {
    this.loading = true;
    this.error = null;
    this.loadFallbackResources();
    this.loading = false;
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

  // ── Quiz methods ────────────────────────────────────────────────────────────
  get currentCategory(): QuizCategory | null {
    return this.quizCategories.find(c => c.id === this.selectedQuizCategoryId) ?? null;
  }

  get currentQuestion(): QuizQuestion | null {
    return this.questions[this.currentQuestionIndex] ?? null;
  }

  get progressPercent(): number {
    if (!this.questions.length) return 0;
    return Math.round((this.currentQuestionIndex / this.questions.length) * 100);
  }

  get scorePercent(): number {
    if (!this.questions.length) return 0;
    return Math.round((this.quizScore / this.questions.length) * 100);
  }

  get scoreLabel(): string {
    const pct = this.scorePercent;
    if (pct === 100) return 'Perfect Score!';
    if (pct >= 80) return 'Great Job!';
    if (pct >= 60) return 'Good Effort!';
    if (pct >= 40) return 'Keep Practicing!';
    return 'Keep Learning!';
  }

  async selectQuizCategory(id: string) {
    this.resetQuiz();
    this.selectedQuizCategoryId = id;
    this.quizLoading = true;
    const request = this.quizRequest;
    try {
      const quiz = await this.adaptiveLearning.generateQuiz(this.firebaseService.auth.currentUser?.uid ?? null, id);
      if (request !== this.quizRequest) return; // user left or restarted while generating
      this.questions = quiz.questions;
      this.quizFocus = quiz.focus;
      this.quizSources = quiz.sources;
    } catch (e) {
      console.error('Quiz generation failed:', e);
      if (request === this.quizRequest) this.quizError = 'Couldn\'t generate your quiz. Check your connection and try again.';
    } finally {
      if (request === this.quizRequest) this.quizLoading = false;
    }
  }

  selectOption(index: number) {
    if (this.answered) return;
    this.selectedOptionIndex = index;
    this.answered = true;
    if (index === this.currentQuestion?.correctIndex) {
      this.quizScore++;
    }
  }

  nextQuestion() {
    if (this.currentQuestionIndex < this.questions.length - 1) {
      this.currentQuestionIndex++;
      this.selectedOptionIndex = null;
      this.answered = false;
    } else {
      this.quizComplete = true;
    }
  }

  restartCategory() {
    if (!this.selectedQuizCategoryId) return;
    this.selectQuizCategory(this.selectedQuizCategoryId);
  }

  resetQuiz() {
    this.quizRequest++;
    this.selectedQuizCategoryId = null;
    this.currentQuestionIndex = 0;
    this.selectedOptionIndex = null;
    this.answered = false;
    this.quizScore = 0;
    this.quizComplete = false;
    this.questions = [];
    this.quizFocus = [];
    this.quizSources = [];
    this.quizLoading = false;
    this.quizError = null;
  }

  switchView(view: 'resources' | 'quiz') {
    this.activeView = view;
    if (view === 'resources') {
      this.resetQuiz();
    }
  }

  getOptionClass(i: number): string {
    if (!this.answered) return '';
    if (i === this.currentQuestion?.correctIndex) return 'correct';
    if (i === this.selectedOptionIndex) return 'wrong';
    return 'dimmed';
  }
}
