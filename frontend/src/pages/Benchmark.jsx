import React, { useState, useCallback } from 'react';

const BACKEND = 'http://localhost:9000';
const N = 6; // number of submissions to fire

async function poolRun() {
  const res = await fetch(`${BACKEND}/api/benchmark/pool`, { method: 'POST' });
  const json = await res.json();
  return json.data?.totalTime ?? null;
}

async function sequentialRun() {
  const res = await fetch(`${BACKEND}/api/benchmark/sequential`, { method: 'POST' });
  const json = await res.json();
  return json.data?.totalTime ?? null;
}

function Bar({ time, maxTime, color, label }) {
  const pct = maxTime > 0 ? Math.max(2, (time / maxTime) * 100) : 0;
  return (
    <div className="flex items-center gap-3">
      <div className="w-16 text-right text-gray-400 font-mono text-xs tabular-nums">{time}ms</div>
      <div className="flex-1 h-5 bg-gray-800 rounded overflow-hidden">
        <div className={`h-full rounded transition-all duration-700 ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <div className="w-14 text-xs text-gray-500">{label}</div>
    </div>
  );
}

function StatCard({ value, label, color }) {
  return (
    <div className="text-center">
      <div className={`text-2xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="text-xs text-gray-500 mt-1">{label}</div>
    </div>
  );
}

export default function Benchmark() {
  const [poolTimes, setPoolTimes]         = useState([]);
  const [seqTimes, setSeqTimes]           = useState([]);
  const [poolWall, setPoolWall]           = useState(null);
  const [seqWall, setSeqWall]             = useState(null);
  const [running, setRunning]             = useState(false);
  const [phase, setPhase]                 = useState('idle');

  const run = useCallback(async () => {
    setRunning(true);
    setPoolTimes([]); setSeqTimes([]);
    setPoolWall(null); setSeqWall(null);

    // ── Round 1: fire all N jobs simultaneously into the pool ──
    setPhase('pool');
    const pw0 = Date.now();
    await Promise.all(
      Array.from({ length: N }, () =>
        poolRun().then((t) => { if (t) setPoolTimes((p) => [...p, t]); return t; })
      )
    );
    setPoolWall(Date.now() - pw0);

    // ── Round 2: same N jobs but server enforces one-at-a-time ──
    setPhase('seq');
    const sw0 = Date.now();
    for (let i = 0; i < N; i++) {
      const t = await sequentialRun();
      if (t) setSeqTimes((p) => [...p, t]);
    }
    setSeqWall(Date.now() - sw0);

    setPhase('done');
    setRunning(false);
  }, []);

  const avg = (arr) => arr.length ? Math.round(arr.reduce((a, b) => a + b, 0) / arr.length) : null;
  const avgPool = avg(poolTimes);
  const avgSeq  = avg(seqTimes);
  const speedup = poolWall && seqWall ? (seqWall / poolWall).toFixed(1) : null;
  const maxTime = Math.max(...poolTimes, ...seqTimes, 1);

  return (
    <div className="max-w-5xl mx-auto p-6 space-y-6 overflow-y-auto" style={{ height: 'calc(100vh - 52px)' }}>

      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-white">Performance Benchmark</h1>
        <p className="text-gray-400 text-sm mt-1">
          {N} identical submissions sent at the same time. The only difference: can they run in parallel?
        </p>
      </div>

      {/* Concept cards */}
      <div className="grid grid-cols-2 gap-4">
        <div className="bg-gray-900 border border-green-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-green-400 animate-pulse" />
            <h2 className="font-semibold text-white text-sm">Our System — Container Pool</h2>
          </div>
          <p className="text-gray-400 text-xs mb-4 leading-relaxed">
            Multiple containers sit idle, ready to pick up work. When {N} submissions arrive at once,
            they each grab a container and execute <strong className="text-white">simultaneously</strong>.
          </p>
          <div className="flex gap-1 mb-3">
            {Array.from({ length: N }).map((_, i) => (
              <div key={i} className="flex-1 h-8 bg-green-900 border border-green-700 rounded flex items-center justify-center">
                <span className="text-xs text-green-400">J{i+1}</span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">All {N} jobs run at the same time → total ≈ time of one job</p>
        </div>

        <div className="bg-gray-900 border border-orange-800 rounded-xl p-5">
          <div className="flex items-center gap-2 mb-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-400" />
            <h2 className="font-semibold text-white text-sm">Traditional System — Sequential Queue</h2>
          </div>
          <p className="text-gray-400 text-xs mb-4 leading-relaxed">
            Only one submission runs at a time. The other {N-1} sit in a queue and wait.
            Each job must <strong className="text-white">wait for all previous ones</strong> to finish.
          </p>
          <div className="flex gap-1 mb-3">
            {Array.from({ length: N }).map((_, i) => (
              <div key={i} className={`flex-1 h-8 rounded flex items-center justify-center border ${
                i === 0 ? 'bg-orange-900 border-orange-700' : 'bg-gray-800 border-gray-700'
              }`}>
                <span className={`text-xs ${i === 0 ? 'text-orange-400' : 'text-gray-600'}`}>
                  {i === 0 ? 'J1' : `⏳`}
                </span>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-500">Jobs run back-to-back → total = sum of all job times</p>
        </div>
      </div>

      {/* Explanation */}
      <div className="bg-gray-900 border border-gray-700 rounded-xl p-4 text-xs text-gray-400 leading-relaxed">
        <span className="text-white font-medium">Same code, same containers, same machine.</span>{' '}
        Both rounds execute <code className="text-yellow-300">print(1 + 1)</code> via the worker.
        The pool round fires all {N} jobs via <code className="text-green-400">Promise.all()</code> — they race
        through the queue in parallel. The sequential round uses a server-side lock so only one
        job runs at a time, simulating a traditional single-threaded judge.
      </div>

      {/* Run button */}
      <div className="flex items-center gap-4">
        <button
          onClick={run}
          disabled={running}
          className="px-6 py-2.5 bg-yellow-500 hover:bg-yellow-400 disabled:opacity-50 disabled:cursor-not-allowed text-black font-bold rounded-lg transition-colors"
        >
          {running ? 'Benchmarking...' : phase === 'done' ? 'Run Again' : `Run Benchmark (${N} jobs)`}
        </button>
        {phase === 'pool' && (
          <span className="text-sm text-green-400 animate-pulse">
            {poolTimes.length}/{N} pool jobs returned...
          </span>
        )}
        {phase === 'seq' && (
          <span className="text-sm text-orange-400 animate-pulse">
            Sequential: job {seqTimes.length + 1}/{N} running...
          </span>
        )}
      </div>

      {/* Live results */}
      {(poolTimes.length > 0 || seqTimes.length > 0) && (
        <div className="grid grid-cols-2 gap-4">
          {/* Pool */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-green-400" />
              <h3 className="text-sm font-semibold text-white">Parallel Pool</h3>
              {avgPool && <span className="ml-auto text-xs text-green-400 font-mono">avg per job: {avgPool}ms</span>}
            </div>
            {poolTimes.map((t, i) => (
              <Bar key={i} time={t} maxTime={maxTime} color="bg-green-500" label={`Job ${i+1}`} />
            ))}
            {phase === 'pool' && poolTimes.length < N && (
              <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse">
                <div className="w-3 h-3 border border-green-400 border-t-transparent rounded-full animate-spin" />
                All {N} running simultaneously...
              </div>
            )}
            {poolWall && (
              <div className="pt-2 mt-1 border-t border-gray-700 flex justify-between text-xs">
                <span className="text-gray-500">Total wall-clock time</span>
                <span className="text-green-400 font-mono font-bold">{poolWall}ms</span>
              </div>
            )}
          </div>

          {/* Sequential */}
          <div className="bg-gray-900 border border-gray-700 rounded-xl p-5 space-y-2">
            <div className="flex items-center gap-2 mb-3">
              <div className="w-2 h-2 rounded-full bg-orange-400" />
              <h3 className="text-sm font-semibold text-white">Sequential (one at a time)</h3>
              {avgSeq && <span className="ml-auto text-xs text-orange-400 font-mono">avg per job: {avgSeq}ms</span>}
            </div>
            {seqTimes.map((t, i) => (
              <Bar key={i} time={t} maxTime={maxTime} color="bg-orange-500" label={`Job ${i+1}`} />
            ))}
            {phase === 'seq' && seqTimes.length < N && (
              <div className="flex items-center gap-2 text-xs text-gray-500 animate-pulse">
                <div className="w-3 h-3 border border-orange-400 border-t-transparent rounded-full animate-spin" />
                Waiting for job {seqTimes.length + 1}...
              </div>
            )}
            {phase === 'pool' && seqTimes.length === 0 && (
              <p className="text-xs text-gray-600 italic">Starts after pool benchmark finishes...</p>
            )}
            {seqWall && (
              <div className="pt-2 mt-1 border-t border-gray-700 flex justify-between text-xs">
                <span className="text-gray-500">Total wall-clock time</span>
                <span className="text-orange-400 font-mono font-bold">{seqWall}ms</span>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Summary */}
      {poolWall && seqWall && (
        <div className="bg-gray-900 border border-yellow-700 rounded-xl p-6">
          <h3 className="text-xs font-semibold text-gray-400 uppercase tracking-widest mb-5">Results</h3>

          <div className="grid grid-cols-3 gap-6 mb-6">
            <StatCard value={`${poolWall}ms`} label={`Pool — ${N} parallel jobs`}    color="text-green-400" />
            <StatCard value={`${seqWall}ms`}  label={`Sequential — ${N} queued jobs`} color="text-orange-400" />
            <StatCard value={`${speedup}×`}   label="Pool is faster by"               color="text-yellow-400" />
          </div>

          {/* Visual wall-clock comparison */}
          <div className="space-y-2 mb-4">
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs text-green-400 text-right">Pool</span>
              <div className="flex-1 h-8 bg-gray-800 rounded overflow-hidden">
                <div
                  className="h-full bg-green-600 rounded flex items-center px-3 transition-all duration-1000"
                  style={{ width: `${(poolWall / seqWall) * 100}%` }}
                >
                  <span className="text-xs text-white font-bold whitespace-nowrap">{poolWall}ms</span>
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="w-24 text-xs text-orange-400 text-right">Sequential</span>
              <div className="flex-1 h-8 bg-gray-800 rounded overflow-hidden">
                <div className="h-full bg-orange-600 rounded flex items-center px-3 w-full">
                  <span className="text-xs text-white font-bold">{seqWall}ms</span>
                </div>
              </div>
            </div>
          </div>

          <p className="text-xs text-gray-500">
            The pool handled all {N} submissions in{' '}
            <span className="text-green-400 font-semibold">{poolWall}ms</span> by running them in parallel.
            The sequential system took{' '}
            <span className="text-orange-400 font-semibold">{seqWall}ms</span> — each job waited for the previous one.
            With more submissions or longer code, the gap grows proportionally.
          </p>
        </div>
      )}
    </div>
  );
}
