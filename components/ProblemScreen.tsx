import React, { useState, useEffect, useCallback } from 'react';
import { Chapter, UserAnswers } from '../types';

interface ProblemScreenProps {
  chapter: Chapter;
  initialAnswers: UserAnswers;
  onSubmit: (answers: UserAnswers) => void;
  onBack: () => void;
}

const ProblemScreen: React.FC<ProblemScreenProps> = ({ chapter, initialAnswers, onSubmit, onBack }) => {
  const [userAnswers, setUserAnswers] = useState<UserAnswers>(initialAnswers);

  useEffect(() => {
    // Set initial state only if not already provided
    if (Object.keys(initialAnswers).length === 0) {
      const initial: UserAnswers = {};
      chapter.blanksInOrder.forEach(blankId => {
        initial[blankId] = "";
      });
      setUserAnswers(initial);
    } else {
      // If initialAnswers are provided, use them directly
      setUserAnswers(initialAnswers);
    }
  }, [chapter, initialAnswers]);

  const handleAnswerChange = useCallback((changedBlankId: string, selectedValue: string) => {
    setUserAnswers(prevAnswers => {
      const newAnswers = { ...prevAnswers, [changedBlankId]: selectedValue };

      // Special handling for Chapter 6: if a correct answer is selected,
      // check if it's also the correct answer for other blanks and fill them.
      if (chapter.id === 6) {
        const isCorrectForChangedBlank = chapter.correctAnswers[changedBlankId] === selectedValue;

        if (isCorrectForChangedBlank) {
          chapter.blanksInOrder.forEach(currentBlankId => {
            // Only consider other distinct blanks
            if (currentBlankId !== changedBlankId) {
              // If the selected value is also the correct answer for this other blank
              if (chapter.correctAnswers[currentBlankId] === selectedValue) {
                newAnswers[currentBlankId] = selectedValue;
              }
            }
          });
        }
      }
      return newAnswers;
    });
  }, [chapter]); // chapter contains id, correctAnswers, blanksInOrder

  const handleSubmit = () => {
    onSubmit(userAnswers);
  };

  const allAnswered = chapter.blanksInOrder.every(blankId => userAnswers[blankId] && userAnswers[blankId] !== "");

  const renderQuestionSegments = () => {
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
        const isSelected = userAnswers[blankId] && userAnswers[blankId] !== "";
        
        const selectClasses = `border border-gray-400 rounded px-2 py-1 text-sm focus:ring-2 focus:ring-sky-500 focus:border-sky-500 bg-white ${
          isSelected ? 'text-sky-700 font-semibold' : 'text-gray-500'
        }`;

        return (
          <span key={`${blankId}-${index}`} className="inline-block mx-1 my-1 align-middle">
            <select
              value={userAnswers[blankId] || ""}
              onChange={(e) => handleAnswerChange(blankId, e.target.value)}
              className={selectClasses}
              aria-label={`Answer for blank ${blankId}`}
            >
              <option value="" className="text-gray-500">
                選択してください {blankId}
              </option>
              {chapter.choices.map(choice => (
                <option key={choice} value={choice} className="text-gray-900">
                  {choice}
                </option>
              ))}
            </select>
          </span>
        );
      }
    });
  };


  return (
    <div className="container mx-auto p-4 md:p-8 max-w-4xl">
      <div className="bg-white shadow-xl rounded-lg p-6 md:p-8">
        <button onClick={onBack} className="mb-6 bg-slate-200 hover:bg-slate-300 text-slate-700 font-semibold py-2 px-4 rounded-lg shadow text-sm transition duration-150">
          &larr; 章選択に戻る
        </button>
        <h1 className="text-2xl md:text-3xl font-bold mb-2 text-gray-800">{chapter.title}</h1>
        <p className="text-gray-600 mb-6 text-sm italic">{chapter.problemDescription}</p>
        
        <div className="text-gray-700 leading-relaxed mb-4 p-4 border border-gray-200 rounded-md bg-slate-50" style={{lineHeight: '2.5'}}>
          {renderQuestionSegments()}
        </div>

        <button
          onClick={handleSubmit}
          disabled={!allAnswered}
          className={`w-full font-semibold py-3 px-4 rounded-lg shadow-md transition duration-150 ease-in-out focus:outline-none focus:ring-2 focus:ring-opacity-50
            ${allAnswered ? 'bg-green-600 hover:bg-green-700 text-white focus:ring-green-500' : 'bg-gray-400 text-gray-700 cursor-not-allowed'}`}
        >
          採点する
        </button>
        {!allAnswered && <p className="text-xs text-red-500 mt-2 text-center">すべての空欄に解答してください。</p>}
      </div>
    </div>
  );
};

export default ProblemScreen;
