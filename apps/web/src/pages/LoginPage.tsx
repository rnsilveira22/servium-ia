import { useEffect, useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Field } from '../components/Field';

interface ApiErro extends Error {
  status?: number;
  data?: { retryAposSegundos?: number };
}

function formatSegundos(total: number): string {
  const m = Math.floor(total / 60);
  const s = total % 60;
  return m > 0 ? `${m}min${s > 0 ? ` ${s}s` : ''}` : `${s}s`;
}

function msgErro(err: ApiErro): string {
  if (err.status === 401) return 'E-mail ou senha incorretos.';
  if (err.status === 429) {
    const s = Math.max(1, Math.round(err.data?.retryAposSegundos ?? 60));
    return `Muitas tentativas de login. Tente novamente em ${formatSegundos(s)}.`;
  }
  return err.message ?? 'Falha ao entrar';
}

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const bloqueado = countdown > 0;

  useEffect(() => {
    if (!bloqueado) return;
    const t = setInterval(() => setCountdown((v) => Math.max(0, v - 1)), 1000);
    return () => clearInterval(t);
  }, [bloqueado]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await login(slug, email, senha);
      nav('/');
    } catch (err) {
      const e = err as ApiErro;
      if (e.status === 429) {
        setCountdown(Math.max(1, Math.round(e.data?.retryAposSegundos ?? 60)));
      }
      setErro(msgErro(e));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <img
          src="/brand/servium-logo-login.svg"
          alt="Servium IA"
          className="servium-logo-login"
          width={520}
          height={130}
        />
        <form onSubmit={handleSubmit}>
          <Field label="Escritorio (slug)" required>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required />
          </Field>
          <Field label="E-mail" required>
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          </Field>
          <Field label="Senha" required>
            <input type="password" value={senha} onChange={(e) => setSenha(e.target.value)} required />
          </Field>
          {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}
          <Button type="submit" className="btn-full" loading={loading} disabled={bloqueado}>
            {bloqueado
              ? `Aguarde ${formatSegundos(countdown)}...`
              : loading
                ? 'Entrando...'
                : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
