import { Component, OnInit } from '@angular/core';

interface KnowledgeResource {
  id: number;
  title: string;
  category: string;
  description: string;
  url: string;
  icon: string;
}

interface QuizQuestion {
  id: number;
  question: string;
  options: string[];
  correctIndex: number;
  explanation: string;
}

interface QuizCategory {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
  glowColor: string;
  questions: QuizQuestion[];
}

@Component({
  selector: 'app-knowledge-base',
  templateUrl: './knowledge-base.page.html',
  styleUrls: ['./knowledge-base.page.scss'],
  standalone: false,
})
export class KnowledgeBasePage implements OnInit {

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

  // ── Quiz data ──────────────────────────────────────────────────────────────
  quizCategories: QuizCategory[] = [
    {
      id: 'informative',
      label: 'Informative',
      icon: 'information-circle-outline',
      description: 'Test your knowledge on speeches that educate, explain, and enlighten.',
      color: '#22a7f0',
      glowColor: 'rgba(34, 167, 240, 0.35)',
      questions: [
        {
          id: 1,
          question: 'What is the primary purpose of an informative speech?',
          options: [
            'To entertain the audience with humor',
            'To increase the audience\'s knowledge or understanding',
            'To change the audience\'s opinion on an issue',
            'To inspire the audience to take immediate action'
          ],
          correctIndex: 1,
          explanation: 'Informative speeches aim to enhance the audience\'s knowledge, understanding, or awareness of a topic — not to persuade or primarily entertain.'
        },
        {
          id: 2,
          question: 'A speech explaining "how to perform CPR step by step" is best classified as which type of informative speech?',
          options: [
            'Speech about an object',
            'Speech about a concept',
            'Speech about a procedure',
            'Speech about a person'
          ],
          correctIndex: 2,
          explanation: 'Procedure speeches describe how something works or how to perform a process — like CPR, baking, or assembling a device.'
        },
        {
          id: 3,
          question: 'A speech about the life and achievements of Marie Curie falls under which informative type?',
          options: [
            'Speech about an event',
            'Speech about a concept',
            'Speech about an object',
            'Speech about a person'
          ],
          correctIndex: 3,
          explanation: 'Speeches about people focus on famous or historical individuals, exploring their biography, impact, and significance.'
        },
        {
          id: 4,
          question: 'Why should speakers avoid jargon when addressing a general audience?',
          options: [
            'It makes the speech too long',
            'It confuses the audience and reduces understanding',
            'It makes the speaker appear overqualified',
            'It is considered impolite in formal settings'
          ],
          correctIndex: 1,
          explanation: 'Jargon is specialized terminology that most general audiences don\'t know. Using it creates a barrier and reduces how much information the audience actually receives.'
        },
        {
          id: 5,
          question: 'What is "information overload" in the context of informative speaking?',
          options: [
            'Using too many visual aids on screen',
            'Speaking too quickly for the audience to follow',
            'Presenting more data than the audience can effectively process',
            'Repeating the same information too many times'
          ],
          correctIndex: 2,
          explanation: 'Information overload occurs when a speaker includes too many facts, figures, or details — overwhelming the audience and reducing retention.'
        },
        {
          id: 6,
          question: 'Which technique best helps audiences retain information from an informative speech?',
          options: [
            'Speaking in a flat, monotone voice',
            'Using concrete examples and vivid analogies',
            'Avoiding any repetition throughout the speech',
            'Using only statistical data with no stories'
          ],
          correctIndex: 1,
          explanation: 'Concrete examples and analogies connect abstract information to things the audience already understands, making it easier to remember.'
        },
        {
          id: 7,
          question: '"Audience analysis" before an informative speech helps the speaker to:',
          options: [
            'Decide exactly how long to speak',
            'Pick the most appropriate outfit',
            'Gauge what the audience already knows and tailor content accordingly',
            'Memorize the speech more effectively'
          ],
          correctIndex: 2,
          explanation: 'Audience analysis lets speakers calibrate complexity and depth — avoiding content that is too basic or too advanced for the specific audience.'
        },
        {
          id: 8,
          question: 'Internal summaries within an informative speech are used to:',
          options: [
            'Preview upcoming sections before they begin',
            'Introduce the main topic at the start',
            'Reinforce key points just covered before moving on',
            'Thank the audience for their attention'
          ],
          correctIndex: 2,
          explanation: 'Internal summaries briefly recap what was just discussed. They help audiences consolidate information before the speaker transitions to the next point.'
        },
        {
          id: 9,
          question: 'Which organizational pattern is most suitable for explaining a historical event in an informative speech?',
          options: [
            'Spatial order',
            'Topical order',
            'Chronological order',
            'Problem-solution order'
          ],
          correctIndex: 2,
          explanation: 'Chronological order arranges content by time sequence — ideal for historical events, biographies, or any process that unfolds in steps.'
        },
        {
          id: 10,
          question: 'Which of these is NOT one of the three core goals of informative speaking?',
          options: [
            'Speak to enhance understanding',
            'Speak to maintain audience interest',
            'Speak to change audience behavior',
            'Speak to be remembered'
          ],
          correctIndex: 2,
          explanation: 'Changing behavior is the goal of persuasive speaking. The three core goals of informative speaking are: enhance understanding, maintain interest, and be remembered.'
        }
      ]
    },
    {
      id: 'persuasive',
      label: 'Persuasive',
      icon: 'megaphone-outline',
      description: 'Challenge yourself on the art of changing minds and influencing audiences.',
      color: '#9c27b0',
      glowColor: 'rgba(156, 39, 176, 0.35)',
      questions: [
        {
          id: 1,
          question: 'Aristotle\'s three classical modes of persuasion are:',
          options: [
            'Logic, Emotion, and Ethics',
            'Ethos, Pathos, and Logos',
            'Attention, Interest, and Desire',
            'Need, Satisfaction, and Action'
          ],
          correctIndex: 1,
          explanation: 'Aristotle identified Ethos (credibility), Pathos (emotional appeal), and Logos (logical reasoning) as the three fundamental persuasive appeals in his work Rhetoric.'
        },
        {
          id: 2,
          question: '"Ethos" in persuasive speaking refers to:',
          options: [
            'Emotional appeals that move the audience',
            'Statistical and logical arguments',
            'The speaker\'s credibility and character',
            'The use of vivid storytelling'
          ],
          correctIndex: 2,
          explanation: 'Ethos is the appeal to the speaker\'s credibility — their expertise, trustworthiness, and character. Audiences are more easily persuaded by speakers they trust.'
        },
        {
          id: 3,
          question: 'How many steps are in Monroe\'s Motivated Sequence?',
          options: ['3', '4', '5', '6'],
          correctIndex: 2,
          explanation: 'Monroe\'s Motivated Sequence has 5 steps: Attention, Need, Satisfaction, Visualization, and Action. It was developed by Alan Monroe in the 1930s.'
        },
        {
          id: 4,
          question: 'What is the FIRST step in Monroe\'s Motivated Sequence?',
          options: ['Need', 'Satisfaction', 'Attention', 'Visualization'],
          correctIndex: 2,
          explanation: 'The sequence begins with Attention — the speaker must first capture the audience\'s interest before establishing why a problem exists (Need).'
        },
        {
          id: 5,
          question: 'A "call to action" in a persuasive speech is most effective when it is:',
          options: [
            'Vague and open to audience interpretation',
            'Hidden within the body of the speech',
            'Placed at the very beginning of the speech',
            'Specific, clear, and achievable by the audience'
          ],
          correctIndex: 3,
          explanation: 'A strong call to action tells the audience exactly what to do. If it\'s too vague or unrealistic, audiences won\'t know how to respond or feel the action is not worth taking.'
        },
        {
          id: 6,
          question: 'Sharing a heartfelt personal story to emotionally connect with your audience is an appeal to:',
          options: ['Logos', 'Ethos', 'Pathos', 'Kairos'],
          correctIndex: 2,
          explanation: 'Pathos is the emotional appeal. Stories, anecdotes, and vivid imagery that evoke feelings like empathy, hope, or urgency are all pathos-based techniques.'
        },
        {
          id: 7,
          question: 'Which of these is a clear example of a "Logos" appeal?',
          options: [
            'Sharing a sad personal anecdote about the issue',
            'Citing peer-reviewed research and statistics to support a claim',
            'Emphasizing your 20 years of professional experience',
            'Using an emotional and passionate tone of voice'
          ],
          correctIndex: 1,
          explanation: 'Logos appeals to reason and logic — using facts, data, research, expert testimony, and logical arguments to persuade the audience.'
        },
        {
          id: 8,
          question: 'Addressing and refuting opposing viewpoints in a persuasive speech is called:',
          options: [
            'Hedging',
            'Acknowledging and refuting counterarguments',
            'Circular reasoning',
            'Bandwagon appeal'
          ],
          correctIndex: 1,
          explanation: 'Addressing counterarguments shows intellectual honesty and strengthens your position by demonstrating you\'ve considered all angles and still believe in your stance.'
        },
        {
          id: 9,
          question: 'The "Visualization" step in Monroe\'s Motivated Sequence asks the audience to:',
          options: [
            'Look at a visual aid or slide',
            'Picture the future if the problem is solved — or stays unsolved',
            'Close their eyes and meditate on the topic',
            'Visualize the speaker\'s credentials'
          ],
          correctIndex: 1,
          explanation: 'Visualization paints a vivid picture of what life looks like after adopting the solution (positive) or if nothing changes (negative), making the stakes feel real and personal.'
        },
        {
          id: 10,
          question: 'Which logical fallacy involves attacking the person making an argument rather than addressing the argument itself?',
          options: [
            'Straw man fallacy',
            'False dilemma fallacy',
            'Ad hominem fallacy',
            'Slippery slope fallacy'
          ],
          correctIndex: 2,
          explanation: 'Ad hominem (Latin: "to the person") is a fallacy where someone attacks the character or personal traits of their opponent instead of engaging with the actual argument.'
        }
      ]
    },
    {
      id: 'motivational',
      label: 'Motivational',
      icon: 'flame-outline',
      description: 'Explore the techniques that spark inspiration and drive people to action.',
      color: '#ff9800',
      glowColor: 'rgba(255, 152, 0, 0.35)',
      questions: [
        {
          id: 1,
          question: 'What primarily distinguishes a motivational speech from a purely persuasive one?',
          options: [
            'Motivational speeches use more statistics and data',
            'Motivational speeches focus on inspiring action and a shift in mindset',
            'Motivational speeches are always longer in duration',
            'Motivational speeches avoid personal stories'
          ],
          correctIndex: 1,
          explanation: 'While persuasive speeches aim to change a specific belief or behavior, motivational speeches focus on inspiring confidence, igniting passion, and empowering the audience to act on their potential.'
        },
        {
          id: 2,
          question: 'Opening a motivational speech with a compelling personal story is effective because it:',
          options: [
            'Saves time on researching factual content',
            'Creates immediate emotional connection and relatability',
            'Distracts the audience from the main message',
            'Demonstrates the speaker\'s superiority over the audience'
          ],
          correctIndex: 1,
          explanation: 'Personal stories humanize the speaker and allow the audience to see themselves in the narrative. This emotional hook draws people in and makes them more receptive to the message.'
        },
        {
          id: 3,
          question: 'The rhetorical device of repeating a phrase at the start of consecutive sentences (e.g., "We shall fight... We shall fight...") is called:',
          options: [
            'Metaphor',
            'Alliteration',
            'Anaphora',
            'Antithesis'
          ],
          correctIndex: 2,
          explanation: 'Anaphora is the deliberate repetition of a phrase at the beginning of successive clauses. It creates rhythm and emotional intensity — famously used by Martin Luther King Jr. in "I Have a Dream."'
        },
        {
          id: 4,
          question: 'Vocal variety — changing pitch, pace, and volume during a motivational speech — primarily helps to:',
          options: [
            'Confuse the audience with unpredictability',
            'Maintain audience engagement and emphasize emotional moments',
            'Help the speaker remember their script',
            'Shorten the overall speech duration'
          ],
          correctIndex: 1,
          explanation: 'A monotone voice loses audiences quickly. Varying your vocal delivery signals what is important, creates emotional texture, and keeps the audience actively listening.'
        },
        {
          id: 5,
          question: '"Building rapport" with an audience means:',
          options: [
            'Memorizing every word of the speech in advance',
            'Establishing a personal connection that makes the audience more receptive',
            'Using technical jargon to sound highly credible',
            'Speaking faster to maintain the audience\'s attention'
          ],
          correctIndex: 1,
          explanation: 'Rapport is the sense of trust and connection between speaker and audience. It is built through authenticity, shared experiences, humor, eye contact, and genuinely caring about the audience\'s well-being.'
        },
        {
          id: 6,
          question: 'Why do great motivational speakers connect personal struggles to universal themes?',
          options: [
            'To display their hardships and earn sympathy',
            'To make the speech longer and fill time',
            'To make the message relatable and applicable to everyone in the audience',
            'To practice storytelling as a performance technique'
          ],
          correctIndex: 2,
          explanation: 'When a speaker\'s unique experience maps to a universal human feeling — fear, self-doubt, perseverance — every audience member can see themselves in the story, making the message deeply personal and powerful.'
        },
        {
          id: 7,
          question: 'Sustained eye contact during a motivational speech helps the speaker to:',
          options: [
            'Remember their notes and talking points better',
            'Build trust and create a personal connection with audience members',
            'Appear nervous and emotionally vulnerable',
            'Avoid looking at distracting visual aids'
          ],
          correctIndex: 1,
          explanation: 'Eye contact signals sincerity and confidence. When a speaker looks at individual audience members, those people feel personally acknowledged, which deepens their engagement and trust.'
        },
        {
          id: 8,
          question: 'Ending a motivational speech with a memorable line or quote is recommended because:',
          options: [
            'It fills any remaining time at the end of the speech',
            'It is a long-standing tradition in public speaking',
            'It leaves a lasting impression and reinforces the core message',
            'It shows the speaker has read many books and is well-informed'
          ],
          correctIndex: 2,
          explanation: 'Audiences remember the beginning and the end of a speech most clearly (the primacy-recency effect). A powerful closing line becomes the takeaway that stays with them long after the speech is over.'
        },
        {
          id: 9,
          question: 'Which delivery element is most important for conveying genuine passion in a motivational speech?',
          options: [
            'Speaking at a constant fast pace throughout',
            'Reading directly from a prepared script',
            'Authentic energy, eye contact, and expressive vocal delivery',
            'Using complex and sophisticated vocabulary'
          ],
          correctIndex: 2,
          explanation: 'Passion cannot be faked — audiences feel it through the speaker\'s body language, voice, and eye contact. Authenticity and genuine belief in the message are the hallmarks of great motivational speakers.'
        },
        {
          id: 10,
          question: 'A motivational speech\'s "call to action" should ideally be:',
          options: [
            'Abstract and open to philosophical interpretation',
            'Saved for the Q&A session after the speech',
            'Repeated at the beginning of every paragraph',
            'Clear, specific, and something the audience can act on right away'
          ],
          correctIndex: 3,
          explanation: 'A vague call to action ("be better!") leaves audiences inspired but directionless. Specific, actionable calls to action ("write down one goal tonight") channel motivation into real behavior change.'
        }
      ]
    }
  ];

  constructor() {}

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
    return this.currentCategory?.questions[this.currentQuestionIndex] ?? null;
  }

  get progressPercent(): number {
    if (!this.currentCategory) return 0;
    return Math.round(((this.currentQuestionIndex) / this.currentCategory.questions.length) * 100);
  }

  get scorePercent(): number {
    if (!this.currentCategory) return 0;
    return Math.round((this.quizScore / this.currentCategory.questions.length) * 100);
  }

  get scoreLabel(): string {
    const pct = this.scorePercent;
    if (pct === 100) return 'Perfect Score!';
    if (pct >= 80) return 'Great Job!';
    if (pct >= 60) return 'Good Effort!';
    if (pct >= 40) return 'Keep Practicing!';
    return 'Keep Learning!';
  }

  selectQuizCategory(id: string) {
    this.selectedQuizCategoryId = id;
    this.currentQuestionIndex = 0;
    this.selectedOptionIndex = null;
    this.answered = false;
    this.quizScore = 0;
    this.quizComplete = false;
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
    if (!this.currentCategory) return;
    if (this.currentQuestionIndex < this.currentCategory.questions.length - 1) {
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
    this.selectedQuizCategoryId = null;
    this.currentQuestionIndex = 0;
    this.selectedOptionIndex = null;
    this.answered = false;
    this.quizScore = 0;
    this.quizComplete = false;
  }

  switchView(view: 'resources' | 'quiz') {
    this.activeView = view;
    if (view === 'resources') {
      this.resetQuiz();
    }
  }
}
