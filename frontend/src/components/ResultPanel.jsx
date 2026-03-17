import React, { useState } from 'react';
import { STATUS_COLORS, STATUS_BG } from '../config';

function TestCaseResult({ tc, index }) {
  const [open, setOpen] = useState(index === 0);
  return (
    <div className="border border-gray-700 rounded overflow-hidden">
      <button
        className={`w-full flex items-center justify-between px-4 py-2 text-sm font-medium transition-colors ${
          tc.passed ? 'hover:bg-green-900/20' : 'hover:bg-red-900/20'
        } bg-gray-800`}
        onClick={() => setOpen((o) => !o)}
      >
        <span className="flex items-center gap-2">
          <span className={tc.passed ? 'text-green-400' : 'text-red-400'}>
            {tc.passed ? '✓' : '✗'}
          </span>
          <span className="text-gray-300">Test Case {index + 1}</span>
          {tc.status && tc.status !== 'Passed' && tc.status !== 'Accepted' && (
            <span className="text-xs text-orange-400">{tc.status}</span>
          )}
        </span>
        <span className="flex items-center gap-3">
          {tc.runtime != null && (
            <span className="text-xs text-gray-500">{tc.runtime} ms</span>
          )}
          <span className="text-gray-500 text-xs">{open ? '▲' : '▼'}</span>
        </span>
      </button>
      {open && (
        <div className="p-4 bg-gray-850 border-t border-gray-700 space-y-3">
          {tc.input !== undefined && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Input</div>
              <pre className="bg-gray-900 rounded p-2 text-sm text-gray-200 overflow-x-auto">{tc.input}</pre>
            </div>
          )}
          <div>
            <div className="text-xs text-gray-500 mb-1">Your Output</div>
            <pre className={`bg-gray-900 rounded p-2 text-sm overflow-x-auto ${tc.passed ? 'text-green-300' : 'text-red-300'}`}>
              {tc.output ?? '(no output)'}
            </pre>
          </div>
          {!tc.passed && tc.expected !== undefined && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Expected Output</div>
              <pre className="bg-gray-900 rounded p-2 text-sm text-green-300 overflow-x-auto">{tc.expected}</pre>
            </div>
          )}
          {(tc.runtime_error || tc.full_runtime_error) && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Runtime Error</div>
              <pre className="bg-gray-900 rounded p-2 text-sm text-red-300 overflow-x-auto whitespace-pre-wrap">
                {tc.full_runtime_error || tc.runtime_error}
              </pre>
            </div>
          )}
          {tc.logs && (
            <div>
              <div className="text-xs text-gray-500 mb-1">Stdout / Logs</div>
              <pre className="bg-gray-900 rounded p-2 text-sm text-gray-400 overflow-x-auto whitespace-pre-wrap">{tc.logs}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function Stat({ label, value, color = 'text-white' }) {
  return (
    <div className="flex flex-col items-center gap-0.5">
      <span className={`text-base font-bold ${color}`}>{value}</span>
      <span className="text-xs text-gray-500">{label}</span>
    </div>
  );
}

export default function ResultPanel({ result, loading }) {
  if (loading) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3 text-gray-400">
        <div className="w-8 h-8 border-2 border-blue-500 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Judging your code...</span>
      </div>
    );
  }

  if (!result) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-gray-500 gap-2">
        <span className="text-4xl">▶</span>
        <p className="text-sm">Run your code or submit to see results</p>
      </div>
    );
  }

  // Status-only (still processing)
  if (result.status && !result.testcases) {
    return (
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <div className={`text-2xl font-bold ${STATUS_COLORS[result.status] || 'text-gray-300'}`}>
          {result.status}
        </div>
        {result.message && <p className="text-gray-400 text-sm">{result.message}</p>}
      </div>
    );
  }

  const status = result.status || 'Unknown';
  const testcases = result.testcases || [];
  const totalCorrect = result.total_correct ?? testcases.filter(t => t.passed).length;
  const totalTests  = result.total_testcases ?? testcases.length;

  // Runtime & memory from worker response
  const runtimeMs   = result.elapsed_time ?? result.totalTime ?? null;
  const runtimeDisp = result.status_runtime || (runtimeMs != null ? `${runtimeMs} ms` : null);
  const memoryDisp  = result.status_memory || null;
  const lang        = result.pretty_lang || result.lang || null;

  // Compilation error
  if (status === 'Compilation Error') {
    return (
      <div className="h-full overflow-y-auto p-4 space-y-4">
        <div className={`border rounded-lg p-4 ${STATUS_BG[status] || 'bg-gray-800 border-gray-600'}`}>
          <div className={`text-xl font-bold ${STATUS_COLORS[status] || 'text-gray-300'}`}>{status}</div>
        </div>
        {(result.full_compile_error || result.compile_error || result.error) && (
          <div>
            <div className="text-xs text-gray-500 mb-2">Compiler Output</div>
            <pre className="bg-gray-900 rounded p-3 text-sm text-orange-300 overflow-x-auto whitespace-pre-wrap">
              {result.full_compile_error || result.compile_error || result.error}
            </pre>
          </div>
        )}
      </div>
    );
  }

  const accepted = status === 'Accepted';

  return (
    <div className="h-full overflow-y-auto p-4 space-y-4">
      {/* Header */}
      <div className={`border rounded-lg p-4 ${STATUS_BG[status] || 'bg-gray-800 border-gray-600'}`}>
        <div className={`text-xl font-bold ${STATUS_COLORS[status] || 'text-gray-300'}`}>{status}</div>
        {totalTests > 0 && (
          <div className="text-sm text-gray-400 mt-1">
            {totalCorrect}/{totalTests} test cases passed
          </div>
        )}
      </div>

      {/* Performance stats */}
      {(runtimeDisp || memoryDisp || lang) && (
        <div className="bg-gray-900 border border-gray-700 rounded-lg px-4 py-3 flex items-center justify-around">
          {runtimeDisp && (
            <Stat
              label="Runtime"
              value={runtimeDisp}
              color={accepted ? 'text-green-400' : 'text-gray-300'}
            />
          )}
          {runtimeDisp && memoryDisp && <div className="w-px h-8 bg-gray-700" />}
          {memoryDisp && (
            <Stat
              label="Memory"
              value={memoryDisp}
              color={accepted ? 'text-blue-400' : 'text-gray-300'}
            />
          )}
          {(runtimeDisp || memoryDisp) && lang && <div className="w-px h-8 bg-gray-700" />}
          {lang && <Stat label="Language" value={lang} color="text-gray-300" />}
        </div>
      )}

      {/* Runtime / timeout error details */}
      {(result.full_runtime_error || result.runtime_error) && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Runtime Error</div>
          <pre className="bg-gray-900 rounded p-3 text-sm text-red-300 overflow-x-auto whitespace-pre-wrap">
            {result.full_runtime_error || result.runtime_error}
          </pre>
        </div>
      )}
      {(result.full_timeout_error || result.timeout_error) && (
        <div>
          <div className="text-xs text-gray-500 mb-2">Timeout</div>
          <pre className="bg-gray-900 rounded p-3 text-sm text-yellow-300 overflow-x-auto whitespace-pre-wrap">
            {result.full_timeout_error || result.timeout_error}
          </pre>
        </div>
      )}

      {/* Test cases */}
      {testcases.length > 0 && (
        <div className="space-y-2">
          <div className="text-xs text-gray-500 uppercase tracking-wide">Test Cases</div>
          {testcases.map((tc, i) => (
            <TestCaseResult key={i} tc={tc} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
