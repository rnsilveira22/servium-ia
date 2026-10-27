import { useEffect, useState, type FormEvent } from 'react';
import { api } from '../api/client';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';
import { Field } from '../components/Field';

interface ResumoDiarioConfig {
  ativo: boolean;
  hora: number;
  enviar_vazio: boolean;
}

const HORAS = Array.from({ length: 24 }, (_, h) => h);

function rotuloHora(h: number): string {
  return `${String(h).padStart(2, '0')}:00`;
}

export function ConfiguracoesPage() {
  const { sessao } = useAuth();
  const admin = sessao?.papel === 'admin';

  const [salvo, setSalvo] = useState<ResumoDiarioConfig | null>(null);
  const [form, setForm] = useState<ResumoDiarioConfig | null>(null);
  const [loading, setLoading] = useState(admin);
  const [saving, setSaving] = useState(false);
  const [erro, setErro] = useState('');
  const [aviso, setAviso] = useState('');

  useEffect(() => {
    if (!admin) return;
    api<ResumoDiarioConfig>('/configuracoes/resumo-diario')
      .then((c) => {
        setSalvo(c);
        setForm(c);
      })
      .catch((err) => setErro(err instanceof Error ? err.message : 'Não foi possível carregar a configuração.'))
      .finally(() => setLoading(false));
  }, [admin]);

  if (!admin) {
    return (
      <div>
        <div className="page-header">
          <h1>Configurações</h1>
        </div>
        <div className="alert alert-warning" role="status">
          Somente administradores podem alterar as configurações do escritório.
        </div>
      </div>
    );
  }

  if (loading) return <div className="page-loading">Carregando...</div>;

  const alterado = !!form && !!salvo && JSON.stringify(form) !== JSON.stringify(salvo);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form || saving) return;
    setSaving(true);
    setErro('');
    setAviso('');
    try {
      const atualizado = await api<ResumoDiarioConfig>('/configuracoes/resumo-diario', {
        method: 'PUT',
        body: form,
      });
      setSalvo(atualizado);
      setForm(atualizado);
      setAviso('Configuração salva.');
    } catch (err) {
      setErro(err instanceof Error ? err.message : 'Não foi possível salvar a configuração.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div>
      <div className="page-header">
        <h1>Configurações</h1>
      </div>

      {erro && <div className="alert alert-error" role="alert" aria-live="assertive">{erro}</div>}
      {aviso && <div className="alert alert-success" role="status" aria-live="polite">{aviso}</div>}

      {form && (
        <section className="section settings-section" aria-labelledby="resumo-diario-titulo">
          <h2 id="resumo-diario-titulo">Resumo diário por e-mail</h2>
          <p className="settings-description">
            Todo dia, os administradores recebem um e-mail com os clientes que precisam de atenção e a atividade
            das últimas 24 horas. O resumo vai somente para o escritório — nunca para o cliente final.
          </p>

          <form className="settings-form" onSubmit={handleSubmit}>
            <label className="check-row" htmlFor="resumo-ativo">
              <input
                id="resumo-ativo"
                type="checkbox"
                checked={form.ativo}
                onChange={(e) => setForm({ ...form, ativo: e.target.checked })}
              />
              <span>Enviar resumo diário</span>
            </label>

            <Field label="Horário de envio" htmlFor="resumo-hora" hint="Horário de Brasília.">
              <select
                id="resumo-hora"
                value={form.hora}
                onChange={(e) => setForm({ ...form, hora: Number(e.target.value) })}
              >
                {HORAS.map((h) => (
                  <option key={h} value={h}>{rotuloHora(h)}</option>
                ))}
              </select>
            </Field>

            <label className="check-row" htmlFor="resumo-vazio">
              <input
                id="resumo-vazio"
                type="checkbox"
                checked={form.enviar_vazio}
                onChange={(e) => setForm({ ...form, enviar_vazio: e.target.checked })}
              />
              <span>Enviar também quando estiver tudo em dia</span>
            </label>

            <Button type="submit" loading={saving} disabled={!alterado}>
              {saving ? 'Salvando...' : 'Salvar'}
            </Button>
          </form>
        </section>
      )}
    </div>
  );
}
