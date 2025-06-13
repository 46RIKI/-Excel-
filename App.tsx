import React, { useState, useEffect } from 'react';
import { Page, Chapter as ChapterType, UserAnswers, ScoreEntry } from './types';
import { ALL_CHAPTERS } from './constants';
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
  const [session, setSession] = useState<any>(undefined);
  const [filteredChapterId, setFilteredChapterId] = useState<number | null>(null);

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

  // 未ログイン時はGoogleログイン画面のみ表示
  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <Auth
          supabaseClient={supabase}
          providers={["google"]}
          onlyThirdPartyProviders
          appearance={{ theme: ThemeSupa }}
          localization={{
            variables: {
              sign_in: {
                social_provider_text: 'Googleでログイン'
              }
            }
          }}
          redirectTo={window.location.origin}
        />
      </div>
    );
  }

  // Googleログイン後のユーザー情報取得
  const userAvatar = session?.user?.user_metadata?.avatar_url || '';

  const handleSelectChapter = (chapterId: number) => {
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
    setFilteredChapterId(chapterId);
    setCurrentPage(Page.History);
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
      default:
        return <ChapterSelectionScreen chapters={ALL_CHAPTERS} onSelectChapter={handleSelectChapter} onShowHistory={handleShowHistory} onShowChapterHistory={handleShowChapterHistory} />;
    }
  };

  return (
    <div className="min-h-screen bg-slate-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="absolute top-0 right-0 mr-4 mt-4 flex items-center space-x-4 z-50">
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
            // ログアウト後に即座にAuth UIへ遷移
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
