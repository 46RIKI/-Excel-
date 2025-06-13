import React, { useEffect, useState } from 'react';
import { Chapter, UserAnswers } from '../types';
import { useGemini } from '../hooks/useGemini';

interface ResultScreenProps {
  chapter: Chapter;
  userAnswers: UserAnswers;
  score: number;
  onRetry: () => void;
  onBackToChapters: () => void;
}

const ResultScreen: React.FC<ResultScreenProps> = ({ chapter, userAnswers, score, onRetry, onBackToChapters }) => {
  const { getAdvice, loading, error } = useGemini();
  const [advice, setAdvice] = useState<string | null>(null);

  useEffect(() => {
    // 採点直後のアドバイス生成
    const fetchAdvice = async () => {
      const prompt = `あなたはExcelの講師です。以下の内容を分析し、次の3点を日本語で簡潔に返してください。得意な点は「これです」と具体的に列挙してください。苦手な点も「ここです」と具体的に列挙してください。どこを復習すべきか、改善点や今後の学習アドバイスも付け加えてください。マークダウンや*や**などの記号は使わないでください。番号や箇条書きも使わず、文章で分かりやすくまとめてください。`;
      const context = {
        chapterTitle: chapter.title,
        userAnswers,
        correctAnswers: chapter.correctAnswers,
        score
      };
      const result = await getAdvice(prompt, context);
      setAdvice(result);
    };
    fetchAdvice();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [chapter, userAnswers, score]);

  const renderGradedQuestion = () => {
    return chapter.questionSegments.map((segment, index) => {
      if (typeof segment === 'string') {
         return segment.split('\n').map((line, lineIndex) => (
          <React.Fragment key={`${index}-${lineIndex}`}>
            {lineIndex > 0 && <br />}
            {line}
          </React.Fragment>
        ));
      } else {
        const blankId = segment.blankId;
        const userAnswer = userAnswers[blankId] || "(未回答)";
        const correctAnswer = chapter.correctAnswers[blankId];
        const isCorrect = userAnswer === correctAnswer;
        
        const bgColor = isCorrect ? 'bg-red-200 text-red-800' : 'bg-blue-200 text-blue-800';
        
        const displayText = isCorrect 
          ? userAnswer 
          : `あなたの解答: ${userAnswer} (正解: ${correctAnswer})`;

        return (
          <span key={`${blankId}-${index}`} className={`font-semibold px-2 py-1 rounded-md inline-block mx-1 my-0.5 ${bgColor}`}>
            {displayText}
          </span>
        );
      }
    });
  };

  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-4 text-center text-gray-800">採点結果: {chapter.title}</h1>
        <div className="text-5xl font-bold mb-6 text-center" style={{color: score >= 80 ? '#10B981' : '#EF4444' }}>
          {score}%
        </div>

        <div className="mb-8 p-4 border border-gray-200 rounded-md bg-slate-50 whitespace-pre-line leading-relaxed text-gray-700" style={{lineHeight: '2.5'}}>
          {renderGradedQuestion()}
        </div>

        {/* Geminiアドバイス表示 */}
        <div className="mb-8 p-4 border border-yellow-200 rounded-md bg-yellow-50">
          <h3 className="text-lg font-semibold mb-2 text-yellow-700">AI講師からのアドバイス</h3>
          {loading && <div className="text-yellow-600">アドバイス生成中...</div>}
          {error && <div className="text-red-500">{error}</div>}
          {advice && <div className="text-gray-800 whitespace-pre-line">{advice}</div>}
        </div>

        <div className="mb-8">
          <h3 className="text-xl font-semibold mb-3 text-gray-700">詳細 (間違った問題):</h3>
          {chapter.blanksInOrder.some(blankId => userAnswers[blankId] !== chapter.correctAnswers[blankId]) ? (
            <ul className="space-y-2">
              {chapter.blanksInOrder.map(blankId => {
                const uAnswer = userAnswers[blankId];
                const cAnswer = chapter.correctAnswers[blankId];
                const isCorr = uAnswer === cAnswer;
                if (!isCorr) {
                  return (
                    <li key={blankId} className="p-3 bg-blue-50 border border-blue-200 rounded-md text-sm text-gray-800">
                      <span className="font-semibold text-blue-700">問題 ({blankId}):</span>
                      <br />
                      あなたの解答: <span className="text-black font-semibold">{uAnswer || "(未回答)"}</span>
                      <br />
                      正解: <span className="text-black font-semibold">{cAnswer}</span>
                    </li>
                  );
                }
                return null;
              })}
            </ul>
          ) : (
            <p className="text-gray-600">全問正解です！素晴らしい！</p>
          )}
        </div>
        
        <div className="flex flex-col sm:flex-row justify-center space-y-3 sm:space-y-0 sm:space-x-4">
          <button
            onClick={onRetry}
            className="w-full sm:w-auto bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150"
          >
            再挑戦する
          </button>
          <button
            onClick={onBackToChapters}
            className="w-full sm:w-auto bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150"
          >
            章選択に戻る
          </button>
        </div>
      </div>
    </div>
  );
};

export default ResultScreen;
