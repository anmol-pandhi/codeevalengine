import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useUserId } from '../hooks/useUserId';

export default function Navbar() {
  const location = useLocation();
  const userId = useUserId();

  const links = [
    { to: '/', label: 'Problems' },
    { to: '/submissions', label: 'My Submissions' },
    { to: '/benchmark', label: 'Benchmark' },
    { to: '/admin', label: 'Admin' },
  ];

  return (
    <nav className="bg-gray-900 border-b border-gray-700 px-6 py-3 flex items-center justify-between flex-shrink-0">
      <div className="flex items-center gap-8">
        <Link to="/" className="text-yellow-400 font-bold text-xl tracking-tight">
          ⚡ Code Eval Engine
        </Link>
        <div className="flex items-center gap-1">
          {links.map(({ to, label }) => {
            const active = location.pathname === to || (to !== '/' && location.pathname.startsWith(to));
            return (
              <Link
                key={to}
                to={to}
                className={`px-3 py-1.5 rounded text-sm font-medium transition-colors ${
                  active
                    ? 'bg-gray-700 text-white'
                    : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`}
              >
                {label}
              </Link>
            );
          })}
        </div>
      </div>
      <div className="text-xs text-gray-500 font-mono">
        {userId}
      </div>
    </nav>
  );
}
