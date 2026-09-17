import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { FirebaseService } from './firebase.service';
import { PRACTICE_SCRIPTS, PracticeScript } from '../data/practice-scripts.data';

/**
 * Single source of practice scripts for the app.
 *
 * Reads the admin-managed `practiceScripts` Firestore collection, falling back to
 * the bundled PRACTICE_SCRIPTS array when the collection is empty or unreachable —
 * the same shape as BadgeService's LEGACY_BADGE_DEFINITIONS fallback.
 *
 * The single-flight promise cache matters for more than saving reads: the practice
 * mode page and the recommendation engine both ask for scripts within a tick of each
 * other. Sharing one resolved array guarantees they can't end up on opposite sides of
 * the fallback (Firestore for one, bundled for the other), which would silently break
 * the id matching that drives the "Recommended for you" ribbons.
 */
@Injectable({ providedIn: 'root' })
export class PracticeScriptService {
  private scriptsSubject = new BehaviorSubject<PracticeScript[]>([]);
  public scripts$ = this.scriptsSubject.asObservable();

  private scriptsLoaded: Promise<PracticeScript[]> | null = null;
  private fallbackInUse = false;

  constructor(private firebaseService: FirebaseService) {}

  /** Cached across the session. Safe to call from multiple places concurrently. */
  getScripts(): Promise<PracticeScript[]> {
    if (this.scriptsLoaded) return this.scriptsLoaded;

    this.scriptsLoaded = (async () => {
      try {
        const remote = await this.firebaseService.getPracticeScripts();
        if (remote && remote.length > 0) {
          this.fallbackInUse = false;
          const sorted = this.sort(remote);
          this.scriptsSubject.next(sorted);
          return sorted;
        }
        console.warn('No practice scripts in Firestore — using bundled scripts.');
      } catch (error) {
        console.error('Failed to load practice scripts, using bundled scripts:', error);
      }

      this.fallbackInUse = true;
      // Stamp the bundled array with its own order so downstream sorting is uniform.
      const fallback = PRACTICE_SCRIPTS.map((s, i) => ({ ...s, sortOrder: i + 1, active: true }));
      this.scriptsSubject.next(fallback);
      return fallback;
    })();

    return this.scriptsLoaded;
  }

  /** Drops the cache and re-reads. Used by the retry action on a failed load. */
  reload(): Promise<PracticeScript[]> {
    this.scriptsLoaded = null;
    return this.getScripts();
  }

  /** Whatever is loaded right now, for synchronous template access. */
  get snapshot(): PracticeScript[] {
    return this.scriptsSubject.value;
  }

  get usingFallback(): boolean {
    return this.fallbackInUse;
  }

  /**
   * sortOrder first, then a natural-order id tiebreak so that a script missing
   * sortOrder sinks to the end rather than landing in a lexicographic position
   * (which would put info-10 before info-2).
   */
  private sort(scripts: PracticeScript[]): PracticeScript[] {
    return [...scripts].sort((a, b) =>
      (a.sortOrder ?? Number.MAX_SAFE_INTEGER) - (b.sortOrder ?? Number.MAX_SAFE_INTEGER)
      || this.compareIdsNaturally(a.id, b.id)
    );
  }

  private compareIdsNaturally(a: string, b: string): number {
    const pa = a.match(/^(.*?)(\d+)$/);
    const pb = b.match(/^(.*?)(\d+)$/);
    if (pa && pb && pa[1] === pb[1]) return Number(pa[2]) - Number(pb[2]);
    return a.localeCompare(b);
  }
}
