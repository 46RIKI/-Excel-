import React, { useState, useEffect, useCallback } from 'react';
import { Page, Chapter as ChapterType, UserAnswers, ScoreEntry } from './types';
import { ALL_CHAPTERS } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import ChapterSelectionScreen from './components/ChapterSelectionScreen';
import ProblemScreen from './components/ProblemScreen';
import ResultScreen from './components/ResultScreen';
import HistoryScreen from './components/HistoryScreen';
import LoginScreen from './components/LoginScreen';
import { getSupabaseClient } from './hooks/useSupabase';
import AdminPage from './components/AdminPage';
import { User } from '@supabase/supabase-js';

const App: React.FC = () => {
  // --- State Management ---

  // Auth State
  const [user, setUser] = useState<User | null>(null);
  const [loadingAuth, setLoadingAuth] = useState(true);

  // Persisted App State (saved to localStorage)
  const [currentPage, setCurrentPage] = useLocalStorage<Page>('app_currentPage', Page.ChapterSelection);
  const [selectedChapterId, setSelectedChapterId] = useLocalStorage<number | null>('app_selectedChapterId', null);
  const [userAnswers, setUserAnswers] = useLocalStorage<UserAnswers>('app_userAnswers', {});
  
  // Ephemeral (non-persisted) State
  const [selectedChapter, setSelectedChapter] = useState<ChapterType | null>(null);
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [showLoginScreen, setShowLoginScreen] = useState<boolean>(false);
  
  // History is also persisted, but managed separately
  const [history, setHistory] = useLocalStorage<ScoreEntry[]>('excelQuizHistory', []);
  const [filteredChapterId, setFilteredChapterId] = useState<number | null>(null);
  
  const supabase = getSupabaseClient();

  // --- Effects ---

  // Define cleanup logic first, so it can be used in the auth effect
  const handleLogoutCleanup = useCallback(() => {
    setCurrentPage(Page.ChapterSelection);
    setSelectedChapterId(null);
    setUserAnswers({});
    setCurrentScore(0);
    setShowLoginScreen(false);
  }, [setCurrentPage, setSelectedChapterId, setUserAnswers]);

  // 1. Handle Auth State Changes and Cleanup
  useEffect(() => {
    setLoadingAuth(true);
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null);
      setLoadingAuth(false);
      
      // Reset app state only on explicit sign-out
      if (event === 'SIGNED_OUT') {
        handleLogoutCleanup();
      }
    });
    return () => subscription.unsubscribe();
  }, [handleLogoutCleanup]);

  // 2. Derive selectedChapter object from persisted ID
  useEffect(() => {
    if (selectedChapterId !== null) {
      const chapter = ALL_CHAPTERS.find(c => c.id === selectedChapterId);
      setSelectedChapter(chapter || null);
    } else {
      setSelectedChapter(null);
    }
  }, [selectedChapterId]);

  // 3. Clean up state on logout - REMOVED, logic is now inside auth effect.
  
  // --- Handlers ---

  const handleSelectChapter = (chapterId: number) => {
    if (!user) {
      setShowLoginScreen(true);
      return;
    }
    setSelectedChapterId(chapterId);
    setCurrentPage(Page.Problem);
  };

  const handleBackToMain = useCallback(() => {
    setCurrentPage(Page.ChapterSelection);
    setSelectedChapterId(null);
    setUserAnswers({});
    setCurrentScore(0);
  }, [setCurrentPage, setSelectedChapterId, setUserAnswers]);
  
  const handleSubmitAnswers = async (answers: UserAnswers) => {
    if (!selectedChapter || !user) return;

    setUserAnswers(answers);
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
    setHistory(prevHistory => [newScoreEntry, ...prevHistory]);

    try {
      await supabase.from('scores').insert([
        {
          user_id: user.id,
          full_name: user.user_metadata?.full_name || '',
          chapter_id: selectedChapter.id,
          chapter_title: selectedChapter.title,
          score: score,
          date: new Date().toISOString(),
          user_answers: answers,
          correct_answers: selectedChapter.correctAnswers,
          question_segments: selectedChapter.questionSegments,
          choices: selectedChapter.choices,
        }
      ]);
    } catch (e) {
      console.error('Supabaseへの履歴保存に失敗:', e);
    }
    
    setCurrentPage(Page.Result);
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleShowHistory = async () => {
    if (!user) {
      setShowLoginScreen(true);
      return;
    }
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      setHistory(data.map((row: unknown) => ({
        chapterId: (row as any).chapter_id,
        chapterTitle: (row as any).chapter_title,
        score: (row as any).score,
        date: (row as any).date,
        userAnswers: (row as any).user_answers,
        correctAnswers: (row as any).correct_answers,
        questionSegments: (row as any).question_segments,
        choices: (row as any).choices,
      })) || []);
    } catch (e) {
      console.error('Supabaseから履歴取得に失敗:', e);
    }
    setCurrentPage(Page.History);
  };

  const handleAdminLoginClick = () => {
    if (user) {
      setCurrentPage(Page.Admin);
    } else {
      setShowLoginScreen(true);
    }
  };

  // --- Rendering Logic ---

  if (loadingAuth) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-xl">Loading...</div>;
  }
  
  if (!user && showLoginScreen) {
    return <LoginScreen onCancel={() => setShowLoginScreen(false)} />;
  }

  const renderPage = () => {
    switch (currentPage) {
      case Page.ChapterSelection:
        return <ChapterSelectionScreen chapters={ALL_CHAPTERS} onSelectChapter={handleSelectChapter} onShowHistory={handleShowHistory} onShowChapterHistory={(id) => { setFilteredChapterId(id); setCurrentPage(Page.History); }} />;
      case Page.Problem:
        if (selectedChapter) return <ProblemScreen chapter={selectedChapter} initialAnswers={userAnswers} onSubmit={handleSubmitAnswers} onBack={handleBackToMain}/>;
        return null;
      case Page.Result:
        if (selectedChapter) return <ResultScreen chapter={selectedChapter} userAnswers={userAnswers} score={currentScore} onRetry={() => setCurrentPage(Page.Problem)} onBackToChapters={handleBackToMain} />;
        return null;
      case Page.History:
        return <HistoryScreen history={history} onBackToChapters={handleBackToMain} onClearHistory={() => setHistory([])} filteredChapterId={filteredChapterId} setFilteredChapterId={setFilteredChapterId}/>;
      case Page.Admin:
        if (user) return <AdminPage onBackToMain={handleBackToMain} />;
        return null;
      default:
        setCurrentPage(Page.ChapterSelection); // Fallback for invalid state
        return null;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="absolute top-0 right-0 mr-4 mt-4 flex items-center space-x-4 z-50">
        {!user ? (
          <button
            onClick={() => setShowLoginScreen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl shadow text-lg"
          >
            ログイン
          </button>
        ) : (
          <>
            <img src={user.user_metadata?.avatar_url || ''} alt="User Avatar" className="h-12 w-12 rounded-full border-2 border-white shadow-md" />
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-bold py-2 px-6 rounded-xl shadow text-lg"
            >
              ログアウト
            </button>
          </>
        )}
      </div>

      <main className="relative py-3 sm:max-w-4xl sm:mx-auto w-full">
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          {renderPage()}
        </div>
      </main>
      
      <footer className="text-center mt-8 text-slate-500 text-sm">
        <p>© 2025 Excel Quiz Grader. All rights reserved.</p>
        <div className="mt-2">
            <button
                onClick={handleAdminLoginClick}
                className="bg-slate-200 hover:bg-slate-300 text-slate-600 font-semibold py-1 px-3 rounded shadow text-xs"
            >
                管理者サイト
            </button>
        </div>
      </footer>
    </div>
  );
};

export default App;
