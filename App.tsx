import React, { useState, useEffect } from 'react';
import { Page, Chapter as ChapterType, UserAnswers, ScoreEntry } from './types';
import { ALL_CHAPTERS, CHAPTER_5_DATA } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import ChapterSelectionScreen from './components/ChapterSelectionScreen';
import ProblemScreen from './components/ProblemScreen';
import ResultScreen from './components/ResultScreen';
import HistoryScreen from './components/HistoryScreen';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabaseClient } from './hooks/useSupabase';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.ChapterSelection);
  const [selectedChapter, setSelectedChapter] = useState<ChapterType | null>(null);
  const [currentUserAnswers, setCurrentUserAnswers] = useState<UserAnswers>({});
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [history, setHistory] = useLocalStorage<ScoreEntry[]>('excelQuizHistory', []);
  const [session, setSession] = useState<any>(null);

  const supabase = getSupabaseClient();

  useEffect(() => {
    const { data: authListener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // Googleログイン後のユーザー情報取得
  const userAvatar = session?.user?.user_metadata?.avatar_url || '';

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <button
          onClick={async () => {
            await supabase.auth.signInWithOAuth({ provider: 'google' });
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-xl shadow"
        >
          Googleでログイン
        </button>
      </div>
    );
  }

  const handleSelectChapter = (chapterId: number) => {
    const chapter = ALL_CHAPTERS.find(c => c.id === chapterId);
    if (chapter) {
      setSelectedChapter(chapter);
      setCurrentPage(Page.Problem);
    }
  };

  const handleSubmitAnswers = (answers: UserAnswers) => {
    if (!selectedChapter) return;

    setCurrentUserAnswers(answers);
    let correctCount = 0;
    selectedChapter.blanksInOrder.forEach(blankId => {
      if (answers[blankId] === selectedChapter.correctAnswers[blankId]) {
        correctCount++;
      }
    });
    
    const score = Math.round((correctCount / selectedChapter.blanksInOrder.length) * 100);
    setCurrentScore(score);

    const newScoreEntry: ScoreEntry = {
      chapterId: selectedChapter.id,
      chapterTitle: selectedChapter.title,
      score,
      date: new Date().toISOString(),
      userAnswers: answers,
      correctAnswers: selectedChapter.correctAnswers,
      questionSegments: selectedChapter.questionSegments,
      choices: selectedChapter.choices,
    };
    setHistory(prevHistory => [...prevHistory, newScoreEntry]);
    
    setCurrentPage(Page.Result);
  };

  const handleRetry = () => {
    if (selectedChapter) {
      setCurrentPage(Page.Problem);
    }
  };

  const handleBackToChapters = () => {
    setSelectedChapter(null);
    setCurrentUserAnswers({});
    setCurrentScore(0);
    setCurrentPage(Page.ChapterSelection);
  };

  const handleShowHistory = () => {
    setCurrentPage(Page.History);
  };
  
  const handleClearHistory = () => {
    if (window.confirm("本当に学習履歴をすべて削除しますか？この操作は元に戻せません。")) {
      setHistory([]);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.ChapterSelection:
        return <ChapterSelectionScreen chapters={ALL_CHAPTERS} onSelectChapter={handleSelectChapter} onShowHistory={handleShowHistory} />;
      case Page.Problem:
        if (selectedChapter) {
          return <ProblemScreen chapter={selectedChapter} onSubmit={handleSubmitAnswers} onBack={handleBackToChapters}/>;
        }
        return null; // Or some error/fallback
      case Page.Result:
        if (selectedChapter) {
          return <ResultScreen chapter={selectedChapter} userAnswers={currentUserAnswers} score={currentScore} onRetry={handleRetry} onBackToChapters={handleBackToChapters} />;
        }
        return null;
      case Page.History:
        return <HistoryScreen history={history} onBackToChapters={handleBackToChapters} onClearHistory={handleClearHistory}/>;
      default:
        return <ChapterSelectionScreen chapters={ALL_CHAPTERS} onSelectChapter={handleSelectChapter} onShowHistory={handleShowHistory} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="absolute top-0 left-0 m-4 flex items-center space-x-4 z-50">
        {userAvatar && (
          <img
            src={userAvatar}
            alt="User Avatar"
            className="w-8 h-8 rounded-full border shadow"
            referrerPolicy="no-referrer"
          />
        )}
        <button
          onClick={async () => {
            await supabase.auth.signOut();
            setSession(null);
          }}
          className="bg-red-500 hover:bg-red-600 text-white font-semibold px-3 py-1 rounded shadow text-xs"
        >
          ログアウト
        </button>
      </div>
      <main>{renderPage()}</main>
      <footer className="text-center text-sm text-gray-500 mt-8 pb-4">
        &copy; {new Date().getFullYear()} Excel Quiz Grader. All rights reserved.
      </footer>
    </div>
  );
};

export default App;
