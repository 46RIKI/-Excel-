export interface Blank {
  id: string; // e.g., 'ア', 'イ'
  label: string; // e.g., '(ア)', '(イ)' - used for display if needed, but mainly for mapping
}

export type QuestionSegment = string | { blankId: string };

export interface Chapter {
  id: number;
  title: string;
  problemDescription: string;
  questionSegments: QuestionSegment[];
  // blanks array defines all fillable blanks in order of appearance for dropdown creation
  // This ensures even if a blankId appears multiple times in text, it refers to one answer slot
  blanksInOrder: string[]; // Array of blank IDs: ['ア', 'イ', 'ウ', ...]
  choices: string[];
  correctAnswers: Record<string, string>; // { 'ア': 'Shift', 'イ': 'Ctrl', ... }
}

export interface UserAnswers {
  [key: string]: string; // blankId: selectedChoice
}

export interface ScoreEntry {
  chapterId: number;
  chapterTitle: string;
  score: number; // Percentage
  date: string; // ISO date string
  userAnswers: UserAnswers;
  correctAnswers: Record<string, string>;
  questionSegments: QuestionSegment[]; // To reconstruct the question view in history if needed
  choices: string[]; // Choices available at the time
}

export enum Page {
  ChapterSelection = 'ChapterSelection',
  Problem = 'Problem',
  Result = 'Result',
  History = 'History',
  Login = 'Login',
  Admin = 'Admin'
}
