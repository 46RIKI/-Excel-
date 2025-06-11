
import React from 'react';
import { ScoreEntry } from '../types';

interface HistoryScreenProps {
  history: ScoreEntry[];
  onBackToChapters: () => void;
  onClearHistory: () => void;
}

const HistoryScreen: React.FC<HistoryScreenProps> = ({ history, onBackToChapters, onClearHistory }) => {
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
        
        <div className="space-y-4 mb-6">
          {history.sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).map((entry, index) => (
            <div key={index} className="p-4 border border-gray-200 rounded-lg shadow-sm bg-slate-50">
              <div className="flex justify-between items-start">
                <div>
                  <h2 className="text-lg font-semibold text-sky-700">{entry.chapterTitle}</h2>
                  <p className="text-sm text-gray-500">受験日: {new Date(entry.date).toLocaleString()}</p>
                </div>
                <p className={`text-2xl font-bold ${entry.score >= 80 ? 'text-green-600' : 'text-red-500'}`}>
                  {entry.score}%
                </p>
              </div>
              {/* Optional: Add a button to view details of this specific attempt */}
            </div>
          ))}
        </div>
        
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
