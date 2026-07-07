import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/auth';

export default function Login() {
  const { login, signup } = useAuth();
  const nav = useNavigate();
  const [mode, setMode] = useState('login'); // 'login' | 'signup'
  const [email, setEmail] = useState('');
  const [pass, setPass] = useState('');
  const [err, setErr] = useState('');
  const [busy, setBusy] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setErr(''); setBusy(true);
    try {
      if (mode === 'login') await login(email, pass);
      else await signup(email, pass);
      nav('/app');
    } catch (e2) {
      setErr(traduzErro(e2.code) || e2.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="page">
      <div className="topbar"><div className="brand">Maquete <span className="b">Viva</span></div></div>
      <div className="wrap" style={{ maxWidth: 440 }}>
        <div className="eyebrow">Área interna</div>
        <h1 className="title">{mode === 'login' ? 'Entrar' : 'Criar conta'}</h1>
        <p className="muted" style={{ marginTop: 6, marginBottom: 20 }}>
          Acesso de projetista e equipe. O cliente usa o link do projeto, não esta tela.
        </p>
        <form className="card" onSubmit={submit}>
          <div className="field">
            <label>E-mail</label>
            <input className="input" type="email" value={email} autoComplete="username"
              onChange={(e) => setEmail(e.target.value)} required />
          </div>
          <div className="field">
            <label>Senha</label>
            <input className="input" type="password" value={pass} autoComplete="current-password"
              onChange={(e) => setPass(e.target.value)} required minLength={6} />
          </div>
          <button className="btn pri" type="submit" disabled={busy} style={{ width: '100%' }}>
            {busy ? '...' : (mode === 'login' ? 'Entrar' : 'Criar conta')}
          </button>
          {err && <div className="err">{err}</div>}
          <div style={{ marginTop: 14, textAlign: 'center' }}>
            <button type="button" className="btn ghost"
              onClick={() => { setMode(mode === 'login' ? 'signup' : 'login'); setErr(''); }}>
              {mode === 'login' ? 'Criar uma conta' : 'Já tenho conta — entrar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function traduzErro(code) {
  const m = {
    'auth/invalid-email': 'E-mail inválido.',
    'auth/user-not-found': 'Usuário não encontrado.',
    'auth/wrong-password': 'Senha incorreta.',
    'auth/invalid-credential': 'E-mail ou senha incorretos.',
    'auth/email-already-in-use': 'Esse e-mail já tem conta.',
    'auth/weak-password': 'Senha muito curta (mín. 6).',
    'auth/operation-not-allowed': 'Login por e-mail/senha não está ativado no Firebase.',
    'auth/configuration-not-found': 'Authentication ainda não foi ativado no console do Firebase.',
  };
  return m[code];
}
