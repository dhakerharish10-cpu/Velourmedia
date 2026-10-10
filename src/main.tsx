import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import App from './App.tsx';
import { supabaseConfigured } from './lib/supabase';
import './index.css';

function ConfigError() {
  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24, fontFamily: 'Inter, system-ui, sans-serif', background: '#08080a', color: '#f4f4f5' }}>
      <div style={{ maxWidth: 480, textAlign: 'center' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 12 }}>Site configuration missing</h1>
        <p style={{ fontSize: 14, lineHeight: 1.6, color: '#a1a1aa' }}>
          The environment variables <code>VITE_SUPABASE_URL</code> and <code>VITE_SUPABASE_ANON_KEY</code> are not set
          for this deploy. Add them in the Netlify project settings and trigger a new deploy.
        </p>
      </div>
    </div>
  );
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>{supabaseConfigured ? <App /> : <ConfigError />}</StrictMode>
);
