import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { api } from '../services/api';
import { useUserId } from '../hooks/useUserId';
import { STATUS_COLORS } from '../config';

export default function Submissions() {
  const userId = useUserId();
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    api.getUserSubmissions(userId)
      .then((res) => {
        const list = res.data || res;
        setSubmissions(Array.isArray(list) ? list : []);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [userId]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="w-8 h-8 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-400 gap-3">
        <span className="text-4xl">⚠</span>
        <p>Error: {error}</p>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-6">
      <h1 className="text-2xl font-bold text-white mb-6">My Submissions</h1>
      {submissions.length === 0 ? (
        <div className="text-center py-16 text-gray-500">
          <p className="text-4xl mb-4">📋</p>
          <p>No submissions yet. Solve some problems!</p>
          <Link to="/" className="mt-4 inline-block text-yellow-400 hover:text-yellow-300 transition-colors">
            Browse Problems →
          </Link>
        </div>
      ) : (
        <div className="bg-gray-900 rounded-lg border border-gray-700 overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-700 text-gray-400 text-xs uppercase tracking-wide">
                <th className="px-6 py-3 text-left">Status</th>
                <th className="px-6 py-3 text-left">Problem</th>
                <th className="px-6 py-3 text-left">Language</th>
                <th className="px-6 py-3 text-left">Result</th>
                <th className="px-6 py-3 text-right">Time</th>
              </tr>
            </thead>
            <tbody>
              {submissions.map((s) => (
                <tr key={s.submissionId} className="border-b border-gray-800 hover:bg-gray-800/40 transition-colors">
                  <td className="px-6 py-4">
                    <span className={`font-medium ${STATUS_COLORS[s.status] || 'text-gray-300'}`}>
                      {s.status}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <Link
                      to={`/problems/${s.problemId}`}
                      className="text-gray-300 hover:text-yellow-400 transition-colors"
                    >
                      {s.problemId}
                    </Link>
                  </td>
                  <td className="px-6 py-4 text-gray-400">{s.language}</td>
                  <td className="px-6 py-4 text-gray-400">
                    {s.result ? (
                      <span>{s.result.passed}/{s.result.total} passed</span>
                    ) : '—'}
                  </td>
                  <td className="px-6 py-4 text-right text-gray-500 text-xs">
                    {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ''}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
