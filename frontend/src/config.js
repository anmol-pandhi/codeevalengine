export const API_URL = import.meta.env.VITE_API_URL || '';
export const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:9000';

export const LANGUAGES = [
  { id: 'python', name: 'Python 3', monacoId: 'python' },
  { id: 'javascript', name: 'JavaScript', monacoId: 'javascript' },
  { id: 'cpp', name: 'C++', monacoId: 'cpp' },
  { id: 'java', name: 'Java', monacoId: 'java' },
];

export const DIFFICULTY_COLORS = {
  Easy: 'text-green-400',
  Medium: 'text-yellow-400',
  Hard: 'text-red-400',
};

export const STATUS_COLORS = {
  Accepted: 'text-green-400',
  'Wrong Answer': 'text-red-400',
  'Runtime Error': 'text-orange-400',
  'Compilation Error': 'text-orange-400',
  'Time Limit Exceeded': 'text-yellow-400',
  'System Error': 'text-gray-400',
  Processing: 'text-blue-400',
  queued: 'text-gray-400',
};

export const STATUS_BG = {
  Accepted: 'bg-green-900/40 border-green-700',
  'Wrong Answer': 'bg-red-900/40 border-red-700',
  'Runtime Error': 'bg-orange-900/40 border-orange-700',
  'Compilation Error': 'bg-orange-900/40 border-orange-700',
  'Time Limit Exceeded': 'bg-yellow-900/40 border-yellow-700',
  Processing: 'bg-blue-900/40 border-blue-700',
  queued: 'bg-gray-800 border-gray-600',
};

export const DEFAULT_CODE = {
  python: `# Write your solution here
`,
  javascript: `// Write your solution here
`,
  cpp: `// Write your solution here
`,
  java: `// Write your solution here
`,
};

export const firebaseConfig = {
  apiKey: 'AIzaSyD85_bw_RZqAlpXuelqKukj0Vqwq0v514s',
  authDomain: 'leetcode-clone-64566.firebaseapp.com',
  projectId: 'leetcode-clone-64566',
  storageBucket: 'leetcode-clone-64566.firebasestorage.app',
  messagingSenderId: '851000799279',
  appId: '1:851000799279:web:103d15dc63eb0ca02b96da',
};
