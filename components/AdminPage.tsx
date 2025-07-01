//
// 重要: このコンポーネントを機能させるには、Supabaseの 'admins' テーブルに
// 'display_name' という名前の列 (型: text, NULL許容) を追加する必要があります。
//
// 例のSQL:
// ALTER TABLE public.admins ADD COLUMN display_name TEXT;
//

import React, { useEffect, useState, FormEvent } from 'react';
import { getSupabaseClient } from '../hooks/useSupabase';
import { FaTrash, FaEdit, FaSave } from 'react-icons/fa';
import AdminDashboard from './AdminDashboard'; // The original dashboard for display

interface AdminPageProps {
  onBackToMain: () => void;
}

interface AdminUser {
  id: number;
  email: string;
  display_name: string | null;
}

const AdminPage: React.FC<AdminPageProps> = ({ onBackToMain }) => {
  const [isAuthorized, setIsAuthorized] = useState<boolean | null>(null);
  const [adminUsers, setAdminUsers] = useState<AdminUser[]>([]);
  const [newAdminEmail, setNewAdminEmail] = useState('');
  const [newAdminDisplayName, setNewAdminDisplayName] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [view, setView] = useState<'dashboard' | 'settings'>('dashboard');
  const [editingAdminId, setEditingAdminId] = useState<number | null>(null);
  const [editingDisplayName, setEditingDisplayName] = useState('');
  const [isAdding, setIsAdding] = useState(false);

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
      } catch (e: unknown) {
        setError(`エラー: ${(e as Error).message}`);
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
    const { data, error } = await supabase.from('admins').select('id, email, display_name').order('email');
    if (error) {
      setError('管理者リストの取得に失敗しました。');
    } else {
      setAdminUsers(data || []);
      setError(null);
    }
  };

  const handleAddAdmin = async (e: FormEvent) => {
    e.preventDefault();
    if (isAdding) return;

    if (!newAdminEmail.trim() || !newAdminDisplayName.trim()) {
      alert('メールアドレスと表示名の両方を入力してください。');
      return;
    }

    setIsAdding(true);

    const { error } = await supabase.from('admins').insert({
        email: newAdminEmail.trim(),
        display_name: newAdminDisplayName.trim()
    });

    if (error) {
      alert(`管理者の追加に失敗しました: ${error.message}`);
    } else {
      setNewAdminEmail('');
      setNewAdminDisplayName('');
    }
    
    setIsAdding(false);
  };

  const handleDeleteAdmin = async (id: number) => {
    if (adminUsers.length <= 1) {
      alert('管理者を1人未満にすることはできません。');
      return;
    }
    if (!window.confirm('この管理者を削除しますか？')) return;

    // Optimistic UI: 削除前の状態を保存
    const originalAdmins = [...adminUsers];
    // UIを即時更新
    setAdminUsers(currentAdmins => currentAdmins.filter(admin => admin.id !== id));

    const { error } = await supabase.from('admins').delete().eq('id', id);

    if (error) {
      alert(`管理者の削除に失敗しました: ${error.message}`);
      // エラーが発生した場合はUIを元に戻す
      setAdminUsers(originalAdmins);
    }
  };

  const handleEditDisplayName = (admin: AdminUser) => {
    setEditingAdminId(admin.id);
    setEditingDisplayName(admin.display_name || '');
  };

  const handleCancelEdit = () => {
    setEditingAdminId(null);
    setEditingDisplayName('');
  };

  const handleSaveDisplayName = async (id: number) => {
    if (!editingDisplayName.trim()) {
      alert('表示名を入力してください。');
      return;
    }
    const { error } = await supabase
      .from('admins')
      .update({ display_name: editingDisplayName.trim() })
      .eq('id', id);

    if (error) {
      alert(`表示名の更新に失敗しました: ${error.message}`);
    } else {
      handleCancelEdit();
    }
  };

  const formatEmail = (email: string) => {
    const parts = email.split('@');
    if (parts.length !== 2) return email;
    return (
      <>
        <span className="font-bold">{parts[0]}</span>
        <span>@{parts[1]}</span>
      </>
    );
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

  const hasIncompleteProfiles = adminUsers.some(admin => !admin.display_name);

  if (view === 'settings') {
    return (
      <div className="max-w-2xl mx-auto p-8">
        <div className="p-6 bg-white shadow rounded">
          <h2 className="text-xl font-semibold mb-4">管理者設定</h2>
          <p className="mb-4 text-sm text-gray-600">このページは管理者のみ閲覧・編集できます。</p>
          
          {hasIncompleteProfiles && (
            <div className="mb-4 p-3 bg-yellow-100 border-l-4 border-yellow-400 text-yellow-700">
              <p className="font-bold">表示名が設定されていない管理者がいます。</p>
              <p>各管理者の表示名を設定してください。</p>
            </div>
          )}

          <div className="mb-6">
            <h3 className="font-semibold mb-2">管理者一覧</h3>
            <ul className="divide-y divide-gray-200">
              {adminUsers.map(admin => (
                <li key={admin.id} className="p-3">
                  {editingAdminId === admin.id ? (
                    <div className="flex items-center gap-2">
                      <input
                        type="text"
                        value={editingDisplayName}
                        onChange={(e) => setEditingDisplayName(e.target.value)}
                        className="border p-2 rounded w-full"
                        placeholder="表示名"
                      />
                      <button onClick={() => handleSaveDisplayName(admin.id)} className="text-green-600 hover:text-green-800 p-2"><FaSave /></button>
                      <button onClick={handleCancelEdit} className="text-gray-500 hover:text-gray-700 p-2">キャンセル</button>
                    </div>
                  ) : (
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="font-semibold text-lg">{admin.display_name || <span className="text-gray-500 italic">表示名未設定</span>}</p>
                        <p className="text-sm text-gray-600">{formatEmail(admin.email)}</p>
                      </div>
                      <div className="flex items-center gap-3">
                        <button 
                          onClick={() => handleEditDisplayName(admin)}
                          className="text-blue-500 hover:text-blue-700"
                          title="表示名を編集"
                        >
                          <FaEdit />
                        </button>
                        <button 
                          onClick={() => handleDeleteAdmin(admin.id)} 
                          className="text-red-500 hover:text-red-700 disabled:opacity-50"
                          title="削除"
                          disabled={adminUsers.length <= 1}
                        >
                          <FaTrash />
                        </button>
                      </div>
                    </div>
                  )}
                </li>
              ))}
            </ul>
          </div>

          <form onSubmit={handleAddAdmin} className="border-t pt-6">
            <h3 className="font-semibold mb-3">新しい管理者を追加</h3>
            <div className="flex flex-col gap-4">
              <input 
                type="text" 
                value={newAdminDisplayName}
                onChange={e => setNewAdminDisplayName(e.target.value)}
                placeholder="表示名"
                className="border p-2 rounded w-full"
                required
              />
              <input 
                type="email" 
                value={newAdminEmail}
                onChange={e => setNewAdminEmail(e.target.value)}
                placeholder="メールアドレス"
                className="border p-2 rounded w-full"
                required
              />
              <button 
                type="submit" 
                className="bg-blue-500 text-white p-2 rounded hover:bg-blue-600 w-full disabled:bg-blue-300"
                disabled={isAdding}
              >
                {isAdding ? '追加中...' : '追加'}
              </button>
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