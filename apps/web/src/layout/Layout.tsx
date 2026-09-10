import { useEffect, useState } from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { Button } from '../components/Button';

const NAV = [
  { to: '/', label: 'Painel' },
  { to: '/clientes', label: 'Clientes' },
  { to: '/obrigacoes', label: 'Obrigacoes' },
  { to: '/templates', label: 'Templates' },
  { to: '/ciclos', label: 'Ciclos' },
  { to: '/excecoes', label: 'Excecoes' },
  { to: '/auditoria', label: 'Auditoria' },
];

export function Layout() {
  const { sessao, logout } = useAuth();
  const nav = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [menuOpen]);

  const closeMenu = () => setMenuOpen(false);

  const handleLogout = async () => {
    await logout();
    nav('/login');
  };

  return (
    <div className="layout">
      <aside className={`sidebar${menuOpen ? ' open' : ''}`} aria-label="Navegacao principal">
        <div className="sidebar-header">
          <img
            src="/brand/servium-logo-horizontal-white.svg"
            alt="Servium IA"
            className="servium-logo-sidebar"
            width={168}
            height={42}
          />
        </div>
        <nav id="sidebar-nav" className="sidebar-nav" aria-label="Principal">
          {NAV.map((n) => (
            <NavLink
              key={n.to}
              to={n.to}
              className={({ isActive }) => (isActive ? 'nav-link active' : 'nav-link')}
              end={n.to === '/'}
              onClick={closeMenu}
            >
              {n.label}
            </NavLink>
          ))}
        </nav>
        <div className="sidebar-footer">
          <span className="sidebar-role">{sessao?.papel === 'admin' ? 'Administrador' : 'Operador'}</span>
          <Button variant="ghost" size="sm" onClick={handleLogout}>Sair</Button>
        </div>
      </aside>
      <div className="topbar">
        <button
          type="button"
          className="menu-toggle"
          aria-expanded={menuOpen}
          aria-controls="sidebar-nav"
          aria-label={menuOpen ? 'Fechar menu' : 'Abrir menu'}
          onClick={() => setMenuOpen((o) => !o)}
        >
          <span aria-hidden="true">&#9776;</span>
        </button>
        <span className="topbar-brand">Servium IA</span>
      </div>
      {menuOpen && (
        <div className="sidebar-backdrop" aria-hidden="true" onClick={closeMenu} />
      )}
      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}