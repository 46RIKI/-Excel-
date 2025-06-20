import React, { useState, useEffect } from 'react';
import { Page, Chapter as ChapterType, UserAnswers, ScoreEntry } from './types';
import { ALL_CHAPTERS } from './constants';
import { useLocalStorage } from './hooks/useLocalStorage';
import ChapterSelectionScreen from './components/ChapterSelectionScreen';
import ProblemScreen from './components/ProblemScreen';
import ResultScreen from './components/ResultScreen';
import HistoryScreen from './components/HistoryScreen';
import LoginScreen from './components/LoginScreen';
import { getSupabaseClient } from './hooks/useSupabase';
import AdminDashboard from './components/AdminDashboard';
import AdminPage from './components/AdminPage';

const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<Page>(Page.ChapterSelection);
  const [selectedChapter, setSelectedChapter] = useState<ChapterType | null>(null);
  const [currentUserAnswers, setCurrentUserAnswers] = useState<UserAnswers>({});
  const [currentScore, setCurrentScore] = useState<number>(0);
  const [history, setHistory] = useLocalStorage<ScoreEntry[]>('excelQuizHistory', []);
  const [session, setSession] = useState<any>(undefined);
  const [filteredChapterId, setFilteredChapterId] = useState<number | null>(null);
  const [showLoginScreen, setShowLoginScreen] = useState<boolean>(false);
  const [showAdminLoginScreen, setShowAdminLoginScreen] = useState(false);

  const supabase = getSupabaseClient();

  useEffect(() => {
    // 初回マウント時にsessionを取得
    supabase.auth.getSession().then(({ data }) => {
      setSession(data.session);
    });

    // onAuthStateChangeでsessionを監視
    const { data: authListener } = supabase.auth.onAuthStateChange((_event: any, session: any) => {
      setSession(session);
    });
    return () => {
      authListener.subscription.unsubscribe();
    };
  }, []);

  // session取得中はローディング表示
  if (session === undefined) {
    return <div className="min-h-screen flex items-center justify-center bg-slate-100 text-xl">Loading...</div>;
  }

  // 未ログイン時は右上にログインボタンを表示し、showLoginScreen時のみLoginScreenを表示
  if (!session && showLoginScreen) {
    return <LoginScreen onCancel={() => setShowLoginScreen(false)} />;
  }

  // Googleログイン後のユーザー情報取得
  const userAvatar = session?.user?.user_metadata?.avatar_url || '';

  const handleLogout = async () => {
    await supabase.auth.signOut();
  };

  const handleSelectChapter = (chapterId: number) => {
    if (!session) {
      setShowLoginScreen(true);
      return;
    }
    const chapter = ALL_CHAPTERS.find(c => c.id === chapterId);
    if (chapter) {
      setSelectedChapter(chapter);
      setCurrentPage(Page.Problem);
    }
  };

  const handleSubmitAnswers = async (answers: UserAnswers) => {
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

    // Supabaseに履歴を保存
    try {
      await supabase.from('scores').insert([
        {
          user_id: session.user.id,
          full_name: session.user.user_metadata?.full_name || '',
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

  const handleShowHistory = async () => {
    if (!session) {
      setShowLoginScreen(true);
      return;
    }
    // Supabaseから自分の履歴を取得
    try {
      const { data, error } = await supabase
        .from('scores')
        .select('*')
        .eq('user_id', session.user.id)
        .order('date', { ascending: false });
      if (error) throw error;
      if (data) {
        // SupabaseのデータをScoreEntry型に変換
        const supabaseHistory = data.map((row: any) => ({
          chapterId: row.chapter_id,
          chapterTitle: row.chapter_title,
          score: row.score,
          date: row.date,
          userAnswers: row.user_answers,
          correctAnswers: row.correct_answers,
          questionSegments: row.question_segments,
          choices: row.choices,
        }));
        setHistory(supabaseHistory);
      }
    } catch (e) {
      console.error('Supabaseから履歴取得に失敗:', e);
    }
    setCurrentPage(Page.History);
  };
  
  const handleClearHistory = () => {
    if (window.confirm("本当に学習履歴をすべて削除しますか？この操作は元に戻せません。")) {
      setHistory([]);
    }
  };

  const handleShowChapterHistory = (chapterId: number) => {
    if (!session) {
      setShowLoginScreen(true);
      return;
    }
    setFilteredChapterId(chapterId);
    setCurrentPage(Page.History);
  };

  const handleAdminLoginClick = () => {
    if (session) {
      setCurrentPage(Page.Admin);
    } else {
      setShowLoginScreen(true);
    }
  };

  const renderPage = () => {
    switch (currentPage) {
      case Page.ChapterSelection:
        return <ChapterSelectionScreen chapters={ALL_CHAPTERS} onSelectChapter={handleSelectChapter} onShowHistory={handleShowHistory} onShowChapterHistory={handleShowChapterHistory} />;
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
        return <HistoryScreen history={history} onBackToChapters={handleBackToChapters} onClearHistory={handleClearHistory} filteredChapterId={filteredChapterId} setFilteredChapterId={setFilteredChapterId}/>;
      case Page.Admin:
        if (session) {
          return <AdminPage onBackToMain={handleBackToChapters} />;
        }
        // This case should ideally not be reached if there's no session, due to the check in handleAdminLoginClick.
        // But as a fallback, we show nothing or a message.
        return <LoginScreen onCancel={handleBackToChapters} />;
      default:
        return <ChapterSelectionScreen chapters={ALL_CHAPTERS} onSelectChapter={handleSelectChapter} onShowHistory={handleShowHistory} onShowChapterHistory={handleShowChapterHistory} />;
    }
  };

  // 管理者ログイン画面またはダッシュボードの表示
  if (showAdminLoginScreen) {
    if (session) {
      return <AdminDashboard onBackToMain={() => {
        setShowAdminLoginScreen(false);
        setCurrentPage(Page.ChapterSelection);
      }} />;
    } else {
      return <LoginScreen onCancel={() => setShowAdminLoginScreen(false)} />;
    }
  }

  return (
    <div className="min-h-screen bg-slate-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="absolute top-0 right-0 mr-4 mt-4 flex items-center space-x-4 z-50">
        {!session ? (
          <button
            onClick={() => setShowLoginScreen(true)}
            className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-2 px-6 rounded-xl shadow text-lg"
          >
            ログイン
          </button>
        ) : (
          <>
            {userAvatar && (
              <img
                src={userAvatar}
                alt="User Avatar"
                className="w-8 h-8 rounded-full border shadow"
                referrerPolicy="no-referrer"
              />
            )}
            <button
              onClick={handleLogout}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded shadow text-sm"
            >
              ログアウト
            </button>
          </>
        )}
      </div>
      <main>{renderPage()}</main>
      <footer className="text-center text-sm text-gray-500 mt-8 pb-4 flex flex-col items-center">
        <span>© {new Date().getFullYear()} Excel Quiz Grader. All rights reserved.</span>
        <button
          className="mt-2 bg-slate-600 hover:bg-slate-700 text-white font-semibold py-2 px-4 rounded shadow text-sm"
          type="button"
          onClick={handleAdminLoginClick}
        >
          管理者サイト
        </button>
      </footer>
    </div>
  );
};

export default App;
