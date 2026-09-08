import { useState, type FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Field } from '../components/Field';

export function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [slug, setSlug] = useState('');
  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [erro, setErro] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErro('');
    setLoading(true);
    try {
      await login(slug, email, senha);
      nav('/');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Falha ao entrar');
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
          <Button type="submit" className="btn-full" loading={loading}>
            {loading ? 'Entrando...' : 'Entrar'}
          </Button>
        </form>
      </div>
    </div>
  );
}
