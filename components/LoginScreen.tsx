import React from 'react';
import { Auth } from '@supabase/auth-ui-react';
import { ThemeSupa } from '@supabase/auth-ui-shared';
import { getSupabaseClient } from '../hooks/useSupabase';

interface LoginScreenProps {
  onCancel?: () => void;
}

const LoginScreen: React.FC<LoginScreenProps> = ({ onCancel }) => {
  const supabase = getSupabaseClient();

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-slate-100">
      <div className="bg-white p-8 rounded-lg shadow-xl max-w-md w-full">
        <h1 className="text-3xl font-bold mb-6 text-center text-gray-700">Excel 学習</h1>
        <p className="text-gray-600 mb-8 text-center">
          学習を始めるにはログインしてください。
        </p>
        <Auth
          supabaseClient={supabase}
          providers={["google"]}
          onlyThirdPartyProviders
          appearance={{ 
            theme: ThemeSupa,
            style: {
              button: {
                background: 'rgb(37 99 235)',
                color: 'white',
                borderRadius: '0.5rem',
                padding: '0.75rem 1rem',
                fontSize: '1rem',
                fontWeight: '600',
                width: '100%',
              },
              container: {
                width: '100%',
              }
            }
          }}
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
      {onCancel && (
        <button
          onClick={onCancel}
          className="mt-4 bg-slate-300 hover:bg-slate-400 text-gray-700 font-semibold py-2 px-6 rounded-xl shadow text-base"
        >
          キャンセル
        </button>
      )}
      <p className="mt-8 text-sm text-gray-500">
        © 2025 Excel Quiz Grader. All rights reserved.
      </p>
    </div>
  );
};

export default LoginScreen; 