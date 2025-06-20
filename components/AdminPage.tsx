import React, { useEffect, useState, FormEvent } from 'react';
import { getSupabaseClient } from '../hooks/useSupabase';
import { FaTrash } from 'react-icons/fa';
import AdminDashboard from './AdminDashboard'; // The original dashboard for display

interface AdminPageProps {
  onBackToMain: () => void;
}

interface AdminUser {
  id: number;
  email: string;
}

const AdminPage: React.FC<AdminPageProps> = ({ onBackToMain }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard'); // State to control the view

  const supabase = getSupabaseClient();

  useEffect(() => {
    const checkAdminStatus = async () => {
      setLoading(true);
      try {
        const { data, error: rpcError } = await supabase.rpc('is_current_user_admin');
        if (rpcError) throw rpcError;
        setIsAuthorized(data);
        if (data) {
          await fetchAdminUsers();
        }
      } catch (e: any) {
        setError(`エラー: ${e.message}`);
        setIsAuthorized(false);
      } finally {
        setLoading(false);
      }
    };

    checkAdminStatus();
    
    const adminChanges = supabase.channel('admin-users-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'admins' },
        () => {
          fetchAdminUsers();
        }
      )
      .subscribe();
    
    return () => {
      supabase.removeChannel(adminChanges);
    };
  }, []);

  const fetchAdminUsers = async () => {
    const { data, error } = await supabase.from('admins').select('id, email').order('email');
    if (error) {
      setError('管理者リストの取得に失敗しました。');
    } else {
      setAdminUsers(data || []);
    }
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (!newAdminEmail.trim()) return;
    const { error } = await supabase.from('admins').insert({ email: newAdminEmail.trim() });
    if (error) {
      alert(`管理者の追加に失敗しました: ${error.message}`);
    } else {
      setNewAdminEmail('');
    }
  };

  const handleDeleteAdmin = async (id: number) => {
    if (adminUsers.length <= 1) {
      alert('管理者を1人未満にすることはできません。');
      return;
    }
    if (!window.confirm('この管理者を削除しますか？')) return;
    const { error } = await supabase.from('admins').delete().eq('id', id);
    if (error) {
      alert(`管理者の削除に失敗しました: ${error.message}`);
    }
  };

  if (loading || isAuthorized === null) return <div className="p-8 text-center">読み込み中...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;
  if (!isAuthorized) return (
      <div className="max-w-xl mx-auto p-8 text-center">
        <h1 className="text-2xl font-bold mb-6 text-red-500">アクセス権がありません</h1>
        <p className="mb-8">このページは管理者専用です。</p>
        <button
          className="bg-slate-500 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded shadow text-base"
          onClick={onBackToMain}
        >
          学習画面に戻る
        </button>
      </div>
  );

  if (view === 'settings') {
    return (
      <div className="max-w-xl mx-auto p-8">
        <div className="p-6 bg-white shadow rounded">
          <h2 className="text-xl font-semibold mb-4">管理者設定</h2>
          <p className="mb-4 text-sm text-gray-600">このページは管理者のみ閲覧・編集できます。</p>
          <div className="mb-4">
            <h3 className="font-semibold mb-2">管理者一覧</h3>
            <ul>
              {adminUsers.map(admin => (
                <li key={admin.id} className="flex justify-between items-center p-2 border-b">
                  <span>{admin.email}</span>
                  <button 
                    onClick={() => handleDeleteAdmin(admin.id)} 
                    className="text-red-500 hover:text-red-700 disabled:opacity-50"
                    title="削除"
                    disabled={adminUsers.length <= 1}
                  >
                    <FaTrash />
                  </button>
                </li>
              ))}
            </ul>
          </div>
          <form onSubmit={handleAddAdmin}>
            <div className="flex items-center">
              <input 
                type="email" 
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                placeholder="新しい管理者のメールアドレス"
                className="border p-2 rounded-l w-full"
                required
              />
              <button type="submit" className="bg-blue-500 text-white p-2 rounded-r hover:bg-blue-600">追加</button>
            </div>
          </form>
          <div className="mt-8 text-right">
            <button
              className="bg-slate-500 hover:bg-slate-600 text-white font-semibold py-2 px-6 rounded shadow text-base"
              onClick={() => setView('dashboard')}
            >
              ダッシュボードに戻る
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Default view is the dashboard
  return (
    <div>
      <div className="max-w-6xl mx-auto p-8 text-right">
        <button
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold py-2 px-6 rounded shadow text-base"
          onClick={() => setView('settings')}
        >
          管理者設定
        </button>
      </div>
      <AdminDashboard onBackToMain={onBackToMain} />
    </div>
  );
};

export default AdminPage; 