/**
 * Simplified SM-2 spaced repetition algorithm.
 * Ratings: 1=Again, 2=Hard, 3=Good, 4=Easy
 */

export interface CardState {
  interval: number;  // days until next review
  ease: number;      // ease factor (1.3 – 3.0, starts at 2.5)
  reps: number;      // consecutive successful reviews
  dueDate: string;   // ISO date string
}

export type SRSRating = 1 | 2 | 3 | 4;

export function initialCardState(): CardState {
  return { interval: 1, ease: 2.5, reps: 0, dueDate: new Date().toISOString() };
}

export function reviewCard(state: CardState, rating: SRSRating): CardState {
  let { interval, ease, reps } = state;

  if (rating === 1) {
    // Again — reset
    interval = 1;
    reps = 0;
  } else if (rating === 2) {
    // Hard — small step, reduce ease
    interval = Math.max(1, Math.round(interval * 1.2));
    ease = Math.max(1.3, ease - 0.15);
    reps++;
  } else if (rating === 3) {
    // Good — standard step
    if (reps === 0) interval = 1;
    else if (reps === 1) interval = 6;
    else interval = Math.round(interval * ease);
    reps++;
  } else {
    // Easy — bigger step, increase ease
    if (reps === 0) interval = 4;
    else interval = Math.round(interval * ease * 1.3);
    ease = Math.min(3.0, ease + 0.15);
    reps++;
  }

  const due = new Date();
  due.setDate(due.getDate() + interval);

  return { interval, ease, reps, dueDate: due.toISOString() };
}

export function isDue(state: CardState): boolean {
  return new Date(state.dueDate) <= new Date();
}

export function dueInDays(state: CardState): number {
  const diff = new Date(state.dueDate).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / 86400000));
}
