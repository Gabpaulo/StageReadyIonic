import { parseQuiz } from './adaptive-learning.service';

describe('parseQuiz', () => {
  const good = { question: 'Q?', options: ['a', 'b', 'c', 'd'], correctIndex: 2, explanation: 'because' };

  it('keeps the correct answer attached to its text after shuffling', () => {
    for (let n = 0; n < 50; n++) {
      const [q] = parseQuiz(JSON.stringify({ questions: [good] }));
      expect(q.options[q.correctIndex]).toBe('c');
      expect([...q.options].sort()).toEqual(['a', 'b', 'c', 'd']);
    }
  });

  it('drops malformed questions', () => {
    const bad = [{ ...good, options: ['a', 'b'] }, { ...good, correctIndex: 4 }, { ...good, question: 1 }];
    expect(parseQuiz(JSON.stringify({ questions: [...bad, good] })).length).toBe(1);
  });

  it('throws when nothing usable comes back', () => {
    expect(() => parseQuiz(undefined)).toThrow();
    expect(() => parseQuiz('{"questions":[]}')).toThrow();
    expect(() => parseQuiz('not json')).toThrow();
  });
});
