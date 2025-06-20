import React, { useState, useEffect } from 'react';
import { ScoreEntry } from '../types';
import { useGemini } from '../hooks/useGemini';
import { ALL_CHAPTERS } from '../constants';

interface HistoryScreenProps {
  history: ScoreEntry[];
  onBackToChapters: () => void;
  onClearHistory: () => void;
  filteredChapterId: number | null;
  setFilteredChapterId: React.Dispatch<React.SetStateAction<number | null>>;
}
// 章ごとに履歴をグループ化
function groupByChapter(history: ScoreEntry[]) {
  const map: { [chapterId: number]: ScoreEntry[] } = {};
  history.forEach(entry => {
    if (!map[entry.chapterId]) map[entry.chapterId] = [];
    map[entry.chapterId].push(entry);
  });
  return map;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onBackToChapters, onClearHistory, filteredChapterId, setFilteredChapterId }) => {
  const [openDetail, setOpenDetail] = useState<{ chapterId: number; index: number } | null>(null);
  const { getAdvice, loading, error } = useGemini();
  const [advice, setAdvice] = useState<string | null>(null);

  useEffect(() => {
    if (history.length === 0) return;
    const fetchAdvice = async () => {
      const prompt = `あなたはExcelの講師です。以下の内容を分析し、次の3点を日本語で簡潔に返してください。\n1. 良い点（できていること、得意な点）\n2. 改善点（苦手な点、間違いが多い点、今後の課題）\n3. 何から復習すればよいか（どこを重点的に復習すべきか、今後の学習アドバイス）\nそれぞれ見出しを付けて、マークダウンや*や**などの記号は使わず、番号や箇条書きも使わず、文章で分かりやすくまとめてください。`;
      const result = await getAdvice(prompt, history);
      setAdvice(result);
    };
    fetchAdvice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [history]);

  if (history.length === 0) {
    return (
      <div className="container mx-auto p-4 md:p-8 max-w-2xl">
        <div className="bg-white shadow-xl rounded-lg p-6 md:p-8 text-center">
          <h1 className="text-2xl font-bold mb-4 text-gray-700">学習履歴</h1>
          <p className="text-gray-600 mb-6">まだ学習履歴がありません。</p>
          <button
            onClick={onBackToChapters}
            className="bg-sky-600 hover:bg-sky-700 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150"
          >
            章選択に戻る
          </button>
        </div>
      </div>
    );
  }

  const grouped = groupByChapter(history);

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-3xl">
      <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800">学習履歴</h1>
          <button
            onClick={onBackToChapters}
            className="bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg shadow text-sm transition duration-150"
          >
            &larr; 章選択に戻る
          </button>
        </div>
        
        {/* Geminiアドバイス表示 */}
        <div className="mb-8 p-4 border border-yellow-200 rounded-md bg-yellow-50">
          <h3 className="text-lg font-semibold mb-2 text-yellow-700">AI講師による履歴分析アドバイス</h3>
          {loading && <div className="text-yellow-600">アドバイス生成中...</div>}
          {error && <div className="text-red-500">{error}</div>}
          {advice && <div className="text-gray-800 whitespace-pre-line">{advice}</div>}
        </div>

        {/* 章ごとの学習記録 */}
        <h2 className="text-xl font-bold text-gray-800 mb-4">章ごとの学習記録</h2>
        <div className="space-y-8 mb-6">
          {ALL_CHAPTERS.map(chapter => {
            const entries = grouped[chapter.id] || [];
            // フィルタリング中は該当章のみ表示
            if (filteredChapterId !== null && filteredChapterId !== chapter.id) return null;
            return (
              <div key={chapter.id} className="mb-6">
                <h2 className="text-xl font-bold text-sky-700 mb-2">{chapter.title}の学習記録</h2>
                {entries.length === 0 ? (
                  <div className="text-gray-500 text-sm mb-4">履歴なし</div>
                ) : (
                  <ul className="space-y-2">
                    {entries
                      .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                      .map((entry, idx) => {
                        // 新しい順に1回目、2回目…
                        const displayIdx = idx + 1;
                        const isOpen = openDetail && openDetail.chapterId === chapter.id && openDetail.index === idx;
                        return (
                          <li key={idx}>
                            <button
                              className="w-full text-left p-3 border border-gray-200 rounded bg-slate-50 hover:bg-sky-50 focus:outline-none focus:ring-2 focus:ring-sky-300"
                              onClick={() => setOpenDetail(isOpen ? null : { chapterId: chapter.id, index: idx })}
                            >
                              <span className="font-semibold text-sky-600 mr-2">{displayIdx}回目</span>
                              <span className="text-gray-500 text-sm">(解答日: {new Date(entry.date).toLocaleString()})</span>
                              <span className="ml-4 text-2xl font-bold {entry.score >= 80 ? 'text-green-600' : 'text-red-500'}">{entry.score}%</span>
                            </button>
                            {isOpen && (
                              <div className="mt-2 p-4 bg-white border border-sky-200 rounded shadow-inner">
                                <div className="mb-2 text-sm text-gray-700">解答日: {new Date(entry.date).toLocaleString()}</div>
                                <div className="mb-2 text-sm text-gray-700">点数: <span className="font-bold">{entry.score}%</span></div>
                                <div className="mb-2 text-sm text-gray-700">あなたの解答:</div>
                                <ul className="mb-2 text-sm">
                                  {Object.entries(entry.userAnswers).map(([blankId, answer]) => (
                                    <li key={blankId}>
                                      <span className="font-semibold">{blankId}：</span>
                                      <span>{answer}</span>
                                      {answer !== entry.correctAnswers[blankId] && (
                                        <span className="ml-2 text-red-500">（正解: {entry.correctAnswers[blankId]}）</span>
                                      )}
                                    </li>
                                  ))}
                                </ul>
                </div>
                            )}
                          </li>
                        );
                      })}
                  </ul>
                )}
                {/* この章の履歴を見るボタン */}
                {filteredChapterId === null && entries.length > 0 && (
                  <button
                    className="mt-2 bg-sky-500 hover:bg-sky-600 text-white font-semibold py-1 px-4 rounded shadow text-sm"
                    onClick={() => setFilteredChapterId(chapter.id)}
                  >
                    この章の履歴だけを見る
                  </button>
                )}
              </div>
            );
          })}
        </div>

        {/* 全体の学習記録 */}
        {filteredChapterId === null && (
          <>
            <h2 className="text-xl font-bold text-gray-800 mb-4">全体の学習記録</h2>
            <ul className="space-y-2 mb-6">
              {history
                .slice()
                .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
                .map((entry, idx) => (
                  <li key={idx} className="p-3 border border-gray-200 rounded bg-slate-50">
                    <span className="font-semibold text-sky-700 mr-2">{entry.chapterTitle}</span>
                    <span className="text-gray-500 text-sm">(解答日: {new Date(entry.date).toLocaleString()})</span>
                    <span className="ml-4 text-2xl font-bold {entry.score >= 80 ? 'text-green-600' : 'text-red-500'}">{entry.score}%</span>
                  </li>
                ))}
            </ul>
          </>
        )}
        
        {history.length > 0 && (
          <div className="text-center">
            <button
              onClick={onClearHistory}
              className="bg-red-500 hover:bg-red-600 text-white font-semibold py-2 px-4 rounded-lg shadow-md transition duration-150 text-sm"
            >
              履歴をクリア
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default HistoryScreen;
