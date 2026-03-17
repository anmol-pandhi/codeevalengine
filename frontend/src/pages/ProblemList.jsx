import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { DIFFICULTY_COLORS } from '../config';

export default function ProblemList() {
  const [problems, setProblems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [stats, setStats] = useState({});

  useEffect(() => {
    api.listProblems()
      .then((res) => {
        const list = res.data || res;
        setProblems(Array.isArray(list) ? list : []);
        // Fetch stats for each problem
        list.forEach((p) => {
          api.getProblemStats(p.id).then((s) => {
            setStats((prev) => ({ ...prev, [p.id]: s.data || s }));
          }).catch(() => {});
        });
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <span className="text-4xl">⚠</span>
        <p>Could not load problems: {error}</p>
        <p className="text-sm text-gray-500">Make sure the backend is running on port 9000</p>
      </div>
    );
  }

  if (problems.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-4 text-gray-400">
        <span className="text-6xl">📝</span>
        <h2 className="text-xl font-semibold text-white">No problems yet</h2>
        <p className="text-gray-500">Add problems via the Admin panel</p>
        <Link
          to="/admin"
          className="px-4 py-2 bg-yellow-500 hover:bg-yellow-400 text-black rounded font-medium transition-colors"
        >
          Go to Admin
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">Problems</h1>
      <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
              <th className="px-6 py-3 text-left w-12">#</th>
              <th className="px-6 py-3 text-left">Title</th>
              <th className="px-6 py-3 text-left">Difficulty</th>
              <th className="px-6 py-3 text-left">Tags</th>
              <th className="px-6 py-3 text-right">Acceptance</th>
            </tr>
          </thead>
          <tbody>
            {problems.map((p, i) => {
              const s = stats[p.id];
              return (
                <tr
                  key={p.id}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="px-6 py-4 text-gray-500">{i + 1}</td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/problems/${p.id}`}
                      className="text-white hover:text-yellow-400 font-medium transition-colors"
                    >
                      {p.title || p.id}
                    </Link>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`font-medium ${DIFFICULTY_COLORS[p.difficulty] || 'text-gray-400'}`}>
                      {p.difficulty || 'Medium'}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap gap-1">
                      {(p.tags || []).slice(0, 3).map((tag) => (
                        <span key={tag} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                          {tag}
                        </span>
                      ))}
                    </div>
                  </td>
                  <td className="px-6 py-4 text-right text-gray-400">
                    {s ? (
                      <span className="text-green-400">{s.acceptanceRate}</span>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
