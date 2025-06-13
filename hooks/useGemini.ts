import { useState } from 'react';

const GEMINI_API_KEY = 'AIzaSyCGh-cRgd4A2ljtBSSX9AjpMYZ50HHA0z0';
const GEMINI_API_URL = 'https://generativelanguage.googleapis.com/v1/models/gemini-1.5-pro:generateContent?key=' + GEMINI_API_KEY;

export function useGemini() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // prompt: string, context: any（解答や履歴データ）
  async function getAdvice(prompt: string, context: any): Promise<string | null> {
    setLoading(true);
    setError(null);
    try {
      // Google Gemini API公式仕様に合わせてbodyを修正
      const body = {
        contents: [
          {
            parts: [
              { text: prompt + '\n' + JSON.stringify(context) }
            ]
          }
        ]
      };
      const res = await fetch(GEMINI_API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });
      const data = await res.json();
      if (data && data.candidates && data.candidates[0]?.content?.parts?.[0]?.text) {
        // アドバイス文から * や ** を除去
        let adviceText = data.candidates[0].content.parts[0].text;
        adviceText = adviceText.replace(/\*+/g, ''); // * や ** をすべて削除
        return adviceText;
      }
      if (data && data.error) {
        setError('AIエラー: ' + (data.error.message || JSON.stringify(data.error)));
        return null;
      }
      setError('AIからのアドバイス取得に失敗しました');
      return null;
    } catch (e: any) {
      setError('AI呼び出しエラー: ' + e.message);
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { getAdvice, loading, error };
} 