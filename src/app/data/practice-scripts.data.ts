export interface PracticeScript {
  id: string;
  title: string;
  category: 'informative' | 'persuasive' | 'motivational';
  estimatedDuration: number; // seconds at ~130 WPM
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  rawText: string;
}

export const PRACTICE_SCRIPTS: PracticeScript[] = [

  // ─── INFORMATIVE ───────────────────────────────────────────────────────────
  {
    id: 'info-1',
    title: 'The Science of Sleep',
    category: 'informative',
    estimatedDuration: 75,
    difficulty: 'beginner',
    rawText:
      'Sleep is one of the most vital processes for human health, yet most of us take it for granted. ' +
      'During sleep, your brain consolidates memories, processes emotions, and removes toxic waste products that build up during waking hours. ' +
      'Scientists have discovered that the brain\'s glymphatic system activates during deep sleep, flushing out harmful proteins linked to Alzheimer\'s disease. ' +
      'Adults need between seven and nine hours of sleep per night for optimal function. ' +
      'Chronic sleep deprivation has been linked to heart disease, diabetes, obesity, and a weakened immune system. ' +
      'Your performance, creativity, and decision-making all depend on getting enough rest. ' +
      'So the next time you consider staying up late, remember that sleep is not wasted time. ' +
      'It is when your brain does its most important work. ' +
      'Prioritize your sleep, and you will think more clearly, feel better, and live longer.'
  },
  {
    id: 'info-2',
    title: 'How Climate Change Works',
    category: 'informative',
    estimatedDuration: 80,
    difficulty: 'intermediate',
    rawText:
      'Climate change is one of the defining challenges of our time. ' +
      'The Earth\'s atmosphere naturally traps heat from the sun, keeping our planet warm enough for life. ' +
      'But since the Industrial Revolution, human activities have released massive amounts of carbon dioxide and other greenhouse gases into the atmosphere. ' +
      'These gases trap more heat than before, causing global temperatures to rise steadily over time. ' +
      'The consequences are already visible: melting ice caps, rising sea levels, more intense storms, and shifting weather patterns. ' +
      'Scientists agree that we must reduce carbon emissions dramatically to avoid the worst effects. ' +
      'This requires transitioning from fossil fuels to renewable energy sources like solar and wind power. ' +
      'Every individual action matters, from reducing energy consumption to supporting sustainable policies. ' +
      'The science is clear, and the time to act is now.'
  },
  {
    id: 'info-3',
    title: 'The History of the Internet',
    category: 'informative',
    estimatedDuration: 85,
    difficulty: 'advanced',
    rawText:
      'The internet began as a military research project in the nineteen sixties called ARPANET, designed to allow computers to communicate with each other. ' +
      'In nineteen eighty nine, British scientist Tim Berners-Lee invented the World Wide Web, a system of linked documents accessible through a browser. ' +
      'This transformed the internet from an academic tool into a global phenomenon. ' +
      'By the mid-nineteen nineties, commercial internet access was widely available, and companies like Amazon and Google were born. ' +
      'Today, over five billion people use the internet worldwide. ' +
      'It has transformed how we communicate, shop, learn, and entertain ourselves. ' +
      'Social media has connected people across continents, while also creating new challenges around privacy and misinformation. ' +
      'The internet continues to evolve rapidly, with artificial intelligence and the Internet of Things opening exciting new possibilities for the future.'
  },

  // ─── PERSUASIVE ────────────────────────────────────────────────────────────
  {
    id: 'per-1',
    title: 'Why You Should Exercise Daily',
    category: 'persuasive',
    estimatedDuration: 80,
    difficulty: 'beginner',
    rawText:
      'Regular physical exercise is one of the most powerful things you can do for your health and wellbeing. ' +
      'Yet despite knowing this, most people still fail to make it a daily habit. ' +
      'Exercise does not just help you lose weight or build muscle. ' +
      'It fundamentally changes your brain chemistry. ' +
      'Regular activity releases endorphins, reducing stress, anxiety, and depression. ' +
      'It improves memory and cognitive function, helping you think more clearly. ' +
      'Studies show that people who exercise regularly live longer, get sick less often, and report higher levels of happiness. ' +
      'You do not need to spend hours in a gym. ' +
      'Even thirty minutes of moderate activity, like walking or cycling, is enough to see significant benefits. ' +
      'The excuses we make, too busy or too tired, are precisely the reasons why we need to exercise more. ' +
      'Make a commitment today. Your future self will thank you for it.'
  },
  {
    id: 'per-2',
    title: 'The Case for Reading Books',
    category: 'persuasive',
    estimatedDuration: 85,
    difficulty: 'intermediate',
    rawText:
      'In a world dominated by social media, streaming services, and constant digital distractions, reading books has become a radical act of self-improvement. ' +
      'Books offer something screens cannot: deep, sustained engagement with complex ideas. ' +
      'When you read, you build vocabulary, improve focus, and develop empathy by experiencing life through different perspectives. ' +
      'Research shows that regular readers have lower rates of cognitive decline as they age. ' +
      'Books allow you to learn directly from the world\'s greatest thinkers, leaders, and storytellers. ' +
      'Unlike a social media feed, a book demands your full attention and rewards you with genuine insight. ' +
      'Even reading just fifteen minutes a day adds up to twenty books a year. ' +
      'Start with a topic you are passionate about. ' +
      'Visit your library, pick up a book, and rediscover the joy of reading. ' +
      'It is one of the best investments you can make in yourself.'
  },
  {
    id: 'per-3',
    title: 'Reduce Your Screen Time',
    category: 'persuasive',
    estimatedDuration: 85,
    difficulty: 'advanced',
    rawText:
      'The average person now spends over seven hours a day staring at screens. ' +
      'Our phones have become extensions of ourselves, yet this constant connectivity comes at a serious cost. ' +
      'Excessive screen time has been linked to poor sleep, reduced attention spans, increased anxiety, and a distorted sense of reality fueled by social media comparisons. ' +
      'We scroll mindlessly, consuming content that rarely enriches our lives. ' +
      'Meanwhile, real experiences, meaningful conversations, and creative pursuits go neglected. ' +
      'I am not suggesting we abandon technology. But we must become intentional about how we use it. ' +
      'Set limits on social media. Put your phone away during meals and before bedtime. ' +
      'Choose face-to-face conversations over texts. ' +
      'Reclaim your attention, because attention is the most precious resource you have. ' +
      'When you control your screen time, you take back control of your life.'
  },

  // ─── MOTIVATIONAL ──────────────────────────────────────────────────────────
  {
    id: 'mot-1',
    title: 'Believe in Yourself',
    category: 'motivational',
    estimatedDuration: 75,
    difficulty: 'beginner',
    rawText:
      'Every great achievement in history began with a single belief: that it was possible. ' +
      'The people who changed the world were not always the smartest or the most talented. ' +
      'They were the ones who refused to stop believing in themselves when everyone else told them to quit. ' +
      'You have been given unique gifts, a unique perspective, and a unique path. ' +
      'There will be moments of doubt, moments when failure feels permanent and the goal feels impossibly far away. ' +
      'But those are the moments that define you. ' +
      'Not the wins, not the applause, but the quiet choice to keep going when giving up would be easier. ' +
      'Do not measure your worth by your setbacks. Measure it by your resilience. ' +
      'Every step forward, no matter how small, is proof that you are capable of more than you know. ' +
      'Believe in yourself. The world is waiting for what only you can bring to it.'
  },
  {
    id: 'mot-2',
    title: 'Overcoming Fear of Failure',
    category: 'motivational',
    estimatedDuration: 80,
    difficulty: 'intermediate',
    rawText:
      'Fear of failure is the greatest obstacle standing between you and the life you want to live. ' +
      'It whispers that you are not ready, that you might embarrass yourself, that success is for other people, not for you. ' +
      'But here is the truth: every person you admire has failed, many times and in very public ways. ' +
      'Failure is not the opposite of success. It is part of the process. ' +
      'Every time you fall, you learn something that cannot be taught any other way. ' +
      'The people who never fail are the people who never try. And what kind of life is that? ' +
      'Stop waiting for the perfect moment, the perfect plan, or the perfect version of yourself. ' +
      'Start now, with what you have, where you are. ' +
      'Embrace failure as your teacher, not your enemy. ' +
      'Because on the other side of your fear is the person you were always meant to become.'
  },
  {
    id: 'mot-3',
    title: 'The Power of Now',
    category: 'motivational',
    estimatedDuration: 80,
    difficulty: 'advanced',
    rawText:
      'Most of us spend our lives either regretting the past or worrying about the future. ' +
      'We replay old mistakes and rehearse imaginary problems, while the present moment slips by unnoticed. ' +
      'But the present moment is the only place where life actually happens. ' +
      'It is the only place where you can make a decision, take action, or feel truly alive. ' +
      'When you are fully present, everything changes. ' +
      'You become more creative, more connected to the people around you, and more effective at everything you do. ' +
      'Mindfulness is not just a wellness trend. It is a fundamental skill for human flourishing. ' +
      'You do not need to meditate for hours to practice it. ' +
      'Simply pause, breathe, and notice where you are right now. ' +
      'Life is not waiting for you in the future. It is happening right here, right now. Do not miss it.'
  }
];
