
import React from 'react';

export const LANGUAGES = [
  { code: 'en', name: 'English' },
  { code: 'es', name: 'Spanish' },
  { code: 'fr', name: 'French' },
  { code: 'de', name: 'German' },
  { code: 'hi', name: 'Hindi' },
  { code: 'ja', name: 'Japanese' },
  { code: 'zh', name: 'Chinese' }
];

export const MOCK_ANALYTICS = {
  emotionDistribution: [
    { name: 'Neutral', value: 42, color: '#94a3b8' },
    { name: 'Happy', value: 28, color: '#fbbf24' },
    { name: 'Sad', value: 18, color: '#60a5fa' },
    { name: 'Angry', value: 12, color: '#f87171' }
  ],
  prosodyMetrics: [
    { name: 'Pitch Correlation', score: 0.63 },
    { name: 'Energy Correlation', score: 0.60 },
    { name: 'Duration Score', score: 0.86 }
  ],
  lipSyncOffsets: Array.from({ length: 40 }, (_, i) => ({
    offset: i * 2,
    count: Math.floor(Math.random() * 25) + (i > 10 && i < 25 ? 15 : 0)
  }))
};
