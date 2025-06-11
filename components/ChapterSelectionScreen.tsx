
import React from 'react';
import { Chapter } from '../types';

interface ChapterSelectionScreenProps {
  chapters: Chapter[];
  onSelectChapter: (chapterId: number) => void;
  onShowHistory: () => void;
}

const ChapterSelectionScreen: React.FC<ChapterSelectionScreenProps> = ({ chapters, onSelectChapter, onShowHistory }) => {
  return (
    <div className="container mx-auto p-4 md:p-8 max-w-2xl">
      <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-700">Excel 学習</h1>
        <p className="text-gray-600 mb-8 text-center">学習したい章を選択してください。</p>
        
        <div className="space-y-4 mb-8">
          {chapters.map((chapter) => (
            <button
              key={chapter.id}
              onClick={() => onSelectChapter(chapter.id)}
              className="w-full bg-sky-600 hover:bg-sky-700 text-white font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-sky-500 focus:ring-opacity-50"
            >
              {chapter.title}
            </button>
          ))}
        </div>

        <div className="text-center">
          <button
            onClick={onShowHistory}
            className="bg-slate-500 hover:bg-slate-600 text-white font-semibold py-3 px-6 rounded-lg shadow-md transition duration-150 ease-in-out transform hover:scale-105 focus:outline-none focus:ring-2 focus:ring-slate-400 focus:ring-opacity-50"
          >
            学習履歴を見る
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChapterSelectionScreen;
