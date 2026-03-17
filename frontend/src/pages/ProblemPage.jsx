import React, { useEffect, useState, useCallback, useRef } from 'react';
import { useParams } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import CodeEditor from '../components/CodeEditor';
import ResultPanel from '../components/ResultPanel';
import { api } from '../services/api';
import { useWebSocket } from '../hooks/useWebSocket';
import { useUserId } from '../hooks/useUserId';
import { LANGUAGES, DEFAULT_CODE, DIFFICULTY_COLORS, STATUS_COLORS } from '../config';

function b64decode(str) {
  try { return atob(str); } catch { return str; }
}

function getDefaultCode(problem, language) {
  if (!problem) return DEFAULT_CODE[language] || '';
  const remaining = problem.Remaining?.[language];
  if (remaining) {
    const template = b64decode(remaining);
    // Replace the INSERT_CODE_HERE marker with a helpful comment
    return template.replace('// INSERT_CODE_HERE', '// Write your solution here\n');
  }
  return DEFAULT_CODE[language] || '';
}

function extractUserCode(editorCode, template) {
  if (!template) return editorCode;
  const parts = template.split('// INSERT_CODE_HERE');
  if (parts.length !== 2) return editorCode;
  const prefix = parts[0];
  const suffix = parts[1];
  // Find what's between the prefix and suffix in the editor code
  if (editorCode.startsWith(prefix)) {
    let after = editorCode.slice(prefix.length);
    if (suffix && after.endsWith(suffix)) {
      after = after.slice(0, after.length - suffix.length);
    }
    return after.trim();
  }
  return editorCode;
}

const TABS = ['Description', 'Submissions'];

export default function ProblemPage() {
  const { id } = useParams();
  const userId = useUserId();
  const { subscribe } = useWebSocket();

  const [problem, setProblem] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [language, setLanguage] = useState('python');
  const [code, setCode] = useState('');
  const [codeByLang, setCodeByLang] = useState({});

  const [tab, setTab] = useState('Description');
  const [resultTab, setResultTab] = useState('result'); // 'result' | 'testcase'
  const [customTestcase, setCustomTestcase] = useState('');
  const [result, setResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [running, setRunning] = useState(false);
  const [statusMsg, setStatusMsg] = useState('');

  const [submissions, setSubmissions] = useState([]);
  const [submissionsLoading, setSubmissionsLoading] = useState(false);

  const templateRef = useRef({});

  // Load problem
  useEffect(() => {
    setLoading(true);
    api.getProblem(id)
      .then((res) => {
        const p = res.data || res;
        setProblem(p);
        // Store templates
        if (p.Remaining) {
          const decoded = {};
          Object.entries(p.Remaining).forEach(([lang, b64]) => {
            decoded[lang] = b64decode(b64);
          });
          templateRef.current = decoded;
        }
        // Set default testcase from first testcase
        if (p.Testcases?.length) {
          const first = p.Testcases[0];
          setCustomTestcase(typeof first === 'string' ? first : (first.input || ''));
        }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [id]);

  // When language changes, load language-specific code
  useEffect(() => {
    if (!problem) return;
    if (codeByLang[language]) {
      setCode(codeByLang[language]);
    } else {
      const defaultCode = getDefaultCode(problem, language);
      setCode(defaultCode);
    }
  }, [language, problem]);

  // Save code per language when it changes
  const handleCodeChange = useCallback((val) => {
    setCode(val || '');
    setCodeByLang((prev) => ({ ...prev, [language]: val || '' }));
  }, [language]);

  function getUserCodeToSubmit() {
    const template = templateRef.current[language];
    if (template) {
      return extractUserCode(code, template);
    }
    return code;
  }

  async function handleSubmit() {
    if (submitting || running) return;
    setSubmitting(true);
    setResult(null);
    setStatusMsg('Submitting...');
    setResultTab('result');
    try {
      const userCode = getUserCodeToSubmit();
      const res = await api.submit({
        problemId: id,
        quesId: id,
        code: userCode,
        language,
        userId,
      });
      const { submissionId } = res.data || res;
      setStatusMsg('Queued...');
      const unsubscribe = subscribe(submissionId, (msg) => {
        if (msg.type === 'status') {
          setStatusMsg(msg.status);
          setResult({ status: msg.status });
        } else if (msg.type === 'result') {
          setResult(msg.data);
          setStatusMsg('');
          setSubmitting(false);
          unsubscribe();
          // Refresh submissions tab
          loadSubmissions();
        } else if (msg.type === 'subscribed') {
          setStatusMsg(msg.currentStatus);
        }
      });
      // Fallback: poll if WS doesn't fire
      setTimeout(() => pollResult(submissionId, setSubmitting), 3000);
    } catch (e) {
      setResult({ status: 'System Error', message: e.message });
      setSubmitting(false);
      setStatusMsg('');
    }
  }

  async function handleRun() {
    if (submitting || running) return;
    setRunning(true);
    setResult(null);
    setStatusMsg('Running...');
    setResultTab('result');
    try {
      const userCode = getUserCodeToSubmit();
      // Build testcases array from custom input
      const customStr = typeof customTestcase === 'string' ? customTestcase : '';
      const testcases = customStr.trim()
        ? customStr.trim().split('\n').filter(Boolean)
        : (problem?.Testcases?.slice(0, 3) || []).map(tc =>
            typeof tc === 'string' ? tc : (tc.input || '')
          ).filter(Boolean);

      const res = await api.runCode({
        problemId: id,
        quesId: id,
        code: userCode,
        language,
        userId,
        testcases,
      });
      const { submissionId } = res.data || res;
      setStatusMsg('Running...');
      const unsubscribe = subscribe(submissionId, (msg) => {
        if (msg.type === 'status') {
          setStatusMsg(msg.status);
        } else if (msg.type === 'result') {
          setResult(msg.data);
          setStatusMsg('');
          setRunning(false);
          unsubscribe();
        }
      });
      setTimeout(() => pollResult(submissionId, setRunning), 3000);
    } catch (e) {
      setResult({ status: 'System Error', message: e.message });
      setRunning(false);
      setStatusMsg('');
    }
  }

  async function pollResult(submissionId, setLoaderFn) {
    let attempts = 0;
    const interval = setInterval(async () => {
      try {
        const res = await api.getSubmission(submissionId);
        const data = res.data || res;
        if (data.testcases || (data.status && data.status !== 'queued' && data.status !== 'Processing')) {
          setResult(data);
          setStatusMsg('');
          setLoaderFn(false);
          clearInterval(interval);
        }
      } catch {}
      if (++attempts > 30) {
        clearInterval(interval);
        setLoaderFn(false);
      }
    }, 1000);
  }

  function loadSubmissions() {
    setSubmissionsLoading(true);
    api.getUserSubmissions(userId)
      .then((res) => {
        const list = res.data || res;
        // Filter to this problem's submissions
        const filtered = (Array.isArray(list) ? list : [])
          .filter((s) => s.problemId === id)
          .sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt));
        setSubmissions(filtered);
      })
      .catch(() => {})
      .finally(() => setSubmissionsLoading(false));
  }

  useEffect(() => {
    if (tab === 'Submissions') loadSubmissions();
  }, [tab]);

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
        <p>Could not load problem: {error}</p>
      </div>
    );
  }

  return (
    <div className="flex h-full overflow-hidden" style={{ height: 'calc(100vh - 52px)' }}>
      {/* Left Panel */}
      <div className="w-1/2 flex flex-col border-r border-gray-700 overflow-hidden">
        {/* Tabs */}
        <div className="flex border-b border-gray-700 bg-gray-900 flex-shrink-0">
          {TABS.map((t) => (
            <button
              key={t}
              onClick={() => setTab(t)}
              className={`px-5 py-3 text-sm font-medium transition-colors border-b-2 ${
                tab === t
                  ? 'border-yellow-400 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              {t}
            </button>
          ))}
        </div>

        <div className="flex-1 overflow-y-auto p-6">
          {tab === 'Description' && (
            <div>
              <div className="flex items-center gap-3 mb-4">
                <h1 className="text-xl font-bold text-white">{problem?.title || id}</h1>
                {problem?.difficulty && (
                  <span className={`text-sm font-medium ${DIFFICULTY_COLORS[problem.difficulty] || 'text-gray-400'}`}>
                    {problem.difficulty}
                  </span>
                )}
              </div>
              {problem?.tags?.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-4">
                  {problem.tags.map((tag) => (
                    <span key={tag} className="px-2 py-0.5 bg-gray-700 text-gray-300 text-xs rounded">
                      {tag}
                    </span>
                  ))}
                </div>
              )}
              {problem?.description ? (
                <div className="prose">
                  <ReactMarkdown>{problem.description}</ReactMarkdown>
                </div>
              ) : (
                <p className="text-gray-500 italic">No description provided. Edit this problem in Admin panel.</p>
              )}
              {problem?.examples?.length > 0 && (
                <div className="mt-6 space-y-4">
                  <h3 className="font-semibold text-white">Examples</h3>
                  {problem.examples.map((ex, i) => (
                    <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-2">
                      <div className="text-xs text-gray-500 font-semibold uppercase">Example {i + 1}</div>
                      <div><span className="text-gray-400 text-sm">Input: </span><code className="text-yellow-300 text-sm">{ex.input}</code></div>
                      <div><span className="text-gray-400 text-sm">Output: </span><code className="text-green-300 text-sm">{ex.output}</code></div>
                      {ex.explanation && <div className="text-gray-400 text-sm">Explanation: {ex.explanation}</div>}
                    </div>
                  ))}
                </div>
              )}
              {problem?.constraints && (
                <div className="mt-6">
                  <h3 className="font-semibold text-white mb-2">Constraints</h3>
                  <div className="prose">
                    <ReactMarkdown>{problem.constraints}</ReactMarkdown>
                  </div>
                </div>
              )}
              {problem?.Testcases?.length > 0 && (
                <div className="mt-6">
                  <h3 className="font-semibold text-white mb-2">Test Cases ({problem.Testcases.length})</h3>
                  <p className="text-gray-500 text-sm">
                    {problem.Testcases.length} test case{problem.Testcases.length !== 1 ? 's' : ''} — submit to run all
                  </p>
                </div>
              )}
            </div>
          )}

          {tab === 'Submissions' && (
            <div>
              <h2 className="text-lg font-semibold text-white mb-4">My Submissions</h2>
              {submissionsLoading ? (
                <div className="flex items-center gap-2 text-gray-400">
                  <div className="w-4 h-4 border-2 border-gray-400 border-t-transparent rounded-full animate-spin" />
                  Loading...
                </div>
              ) : submissions.length === 0 ? (
                <p className="text-gray-500">No submissions for this problem yet.</p>
              ) : (
                <div className="space-y-2">
                  {submissions.map((s) => (
                    <div key={s.submissionId} className="bg-gray-800 rounded-lg p-3 flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <span className={`font-medium text-sm ${STATUS_COLORS[s.status] || 'text-gray-300'}`}>
                          {s.status}
                        </span>
                        <span className="text-gray-500 text-xs">{s.language}</span>
                      </div>
                      <span className="text-gray-500 text-xs">
                        {s.submittedAt ? new Date(s.submittedAt).toLocaleString() : ''}
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Right Panel */}
      <div className="w-1/2 flex flex-col overflow-hidden">
        {/* Language selector + buttons */}
        <div className="flex items-center justify-between px-4 py-2 bg-gray-900 border-b border-gray-700 flex-shrink-0">
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            className="bg-gray-800 text-white text-sm px-3 py-1.5 rounded border border-gray-600 focus:outline-none focus:border-yellow-400"
          >
            {LANGUAGES.map((l) => (
              <option key={l.id} value={l.id}>{l.name}</option>
            ))}
          </select>
          <div className="flex items-center gap-2">
            {statusMsg && (
              <span className="text-xs text-gray-400 animate-pulse">{statusMsg}</span>
            )}
            <button
              onClick={handleRun}
              disabled={submitting || running}
              className="px-4 py-1.5 text-sm font-medium bg-gray-700 hover:bg-gray-600 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {running ? 'Running...' : 'Run Code'}
            </button>
            <button
              onClick={handleSubmit}
              disabled={submitting || running}
              className="px-4 py-1.5 text-sm font-medium bg-green-600 hover:bg-green-500 text-white rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Submitting...' : 'Submit'}
            </button>
          </div>
        </div>

        {/* Template hint */}
        {templateRef.current[language] && (
          <div className="px-4 py-1.5 bg-gray-950 border-b border-gray-800 text-xs text-gray-500">
            Template loaded — write your solution where <code className="text-yellow-600">// INSERT_CODE_HERE</code> was replaced
          </div>
        )}

        {/* Code editor */}
        <div className="flex-1 overflow-hidden" style={{ minHeight: 0 }}>
          <CodeEditor value={code} onChange={handleCodeChange} language={language} />
        </div>

        {/* Bottom panel: testcase + result */}
        <div className="h-64 flex flex-col border-t border-gray-700 flex-shrink-0">
          <div className="flex border-b border-gray-700 bg-gray-900 flex-shrink-0">
            <button
              onClick={() => setResultTab('testcase')}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                resultTab === 'testcase'
                  ? 'border-yellow-400 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Testcase
            </button>
            <button
              onClick={() => setResultTab('result')}
              className={`px-4 py-2 text-xs font-medium transition-colors border-b-2 ${
                resultTab === 'result'
                  ? 'border-yellow-400 text-white'
                  : 'border-transparent text-gray-400 hover:text-white'
              }`}
            >
              Result
            </button>
          </div>
          <div className="flex-1 overflow-hidden">
            {resultTab === 'testcase' ? (
              <div className="p-3 h-full flex flex-col gap-2">
                <div className="text-xs text-gray-500">Custom input (one value per line)</div>
                <textarea
                  value={customTestcase}
                  onChange={(e) => setCustomTestcase(e.target.value)}
                  className="flex-1 bg-gray-900 text-white text-sm rounded p-2 border border-gray-700 focus:outline-none focus:border-yellow-400 font-mono resize-none"
                  placeholder="Enter test input..."
                />
              </div>
            ) : (
              <ResultPanel result={result} loading={submitting || running} />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
