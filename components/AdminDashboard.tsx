import React, { useEffect, useState } from 'react';
import { getSupabaseClient } from '../hooks/useSupabase';
import { FaTrash } from 'react-icons/fa';

interface Row {
  id: number;
  user_name: string;
  chapter_title: string;
  score: number;
  date: string;
  attempt: number;
}

interface AdminDashboardProps {
  onBackToMain?: () => void;
}

const AdminDashboard: React.FC<AdminDashboardProps> = ({ onBackToMain }) => {
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchRows = async () => {
    setLoading(true);
    setError(null);
    const supabase = getSupabaseClient();
    const { data: scores, error: scoreError } = await supabase
      .from('scores')
      .select('id, user_id, full_name, chapter_id, chapter_title, score, date');
    if (scoreError) {
      setError('スコアデータの取得に失敗しました');
      setLoading(false);
      return;
    }
    const sorted = [...scores].sort((a, b) => {
      const nameA = a.full_name || a.user_id || '';
      const nameB = b.full_name || b.user_id || '';
      if (nameA !== nameB) return nameA.localeCompare(nameB);
      if (a.chapter_id !== b.chapter_id) return a.chapter_id - b.chapter_id;
      return new Date(a.date).getTime() - new Date(b.date).getTime();
    });
    const attemptMap: Record<string, number> = {};
    const rows: Row[] = sorted.map((row) => {
      const userName = row.full_name || row.user_id || '(名前なし)';
      const key = `${userName}_${row.chapter_id}`;
      attemptMap[key] = (attemptMap[key] || 0) + 1;
      return {
        id: row.id,
        user_name: userName,
        chapter_title: row.chapter_title,
        score: row.score,
        date: row.date,
        attempt: attemptMap[key],
      };
    });
    setRows(rows);
    setLoading(false);
  };

  useEffect(() => {
    fetchRows();
  }, []);

  const handleDelete = async (id: number) => {
    if (!window.confirm('この履歴を削除しますか？')) return;
    const supabase = getSupabaseClient();
    const { error } = await supabase.from('scores').delete().eq('id', id);
    if (error) {
      alert('削除に失敗しました');
      return;
    }
    setRows(prev => prev.filter(row => row.id !== id));
  };

  if (loading) return <div className="p-8 text-center">読み込み中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="max-w-4xl mx-auto p-8">
      <h1 className="text-2xl font-bold mb-6">管理者ダッシュボード</h1>
      {onBackToMain && (
        <button
          className="mb-6 bg-slate-500 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded shadow text-base"
          onClick={onBackToMain}
        >
          学習画面に戻る
        </button>
      )}
      <table className="w-full border-collapse bg-white shadow rounded">
        <thead>
          <tr className="bg-slate-100">
            <th className="border px-4 py-2">ユーザー名</th>
            <th className="border px-4 py-2">章タイトル</th>
            <th className="border px-4 py-2">何回目</th>
            <th className="border px-4 py-2">スコア</th>
            <th className="border px-4 py-2">採点日</th>
            <th className="border px-4 py-2">削除</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td className="border px-4 py-2">{row.user_name}</td>
              <td className="border px-4 py-2">{row.chapter_title}</td>
              <td className="border px-4 py-2 text-center">{row.attempt}回目</td>
              <td className="border px-4 py-2 text-center">{row.score}%</td>
              <td className="border px-4 py-2 text-center">{new Date(row.date).toLocaleString()}</td>
              <td className="border px-4 py-2 text-center">
                <button onClick={() => handleDelete(row.id)} className="text-red-500 hover:text-red-700" title="削除">
                  <FaTrash />
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
};

export default AdminDashboard; 