import React, { useState, useEffect, useRef } from 'react';
import CodeEditor from '../components/CodeEditor';
import { api } from '../services/api';
import { LANGUAGES } from '../config';

const DIFFICULTIES = ['Easy', 'Medium', 'Hard'];

const DEFAULT_TEMPLATES = {
  python: `import sys
input = sys.stdin.readline

def solution():
    // INSERT_CODE_HERE
    pass

# Read your inputs here
result = solution()
print(result)
`,
  javascript: `const readline = require('readline');
const rl = readline.createInterface({ input: process.stdin });
let lines = [];
rl.on('line', l => lines.push(l.trim()));
rl.on('close', () => {
    function solution() {
        // INSERT_CODE_HERE
    }
    console.log(solution());
});
`,
  cpp: `#include <bits/stdc++.h>
using namespace std;

int solution() {
    // INSERT_CODE_HERE
    return 0;
}

int main() {
    cout << solution() << endl;
    return 0;
}
`,
  java: `import java.util.*;

public class Solution {
    public static Object solution() {
        // INSERT_CODE_HERE
        return null;
    }

    public static void main(String[] args) {
        System.out.println(solution());
    }
}
`,
};

function Section({ title, children }) {
  return (
    <div className="space-y-2">
      <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">{title}</h3>
      {children}
    </div>
  );
}

function Input({ label, value, onChange, placeholder, type = 'text' }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-400 mb-1">{label}</label>}
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-yellow-400 placeholder-gray-600"
      />
    </div>
  );
}

function Textarea({ label, value, onChange, placeholder, rows = 4 }) {
  return (
    <div>
      {label && <label className="block text-xs text-gray-400 mb-1">{label}</label>}
      <textarea
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        rows={rows}
        className="w-full bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-yellow-400 placeholder-gray-600 font-mono resize-y"
      />
    </div>
  );
}

export default function Admin() {
  const [problemId, setProblemId] = useState('');
  const [loadedId, setLoadedId] = useState('');
  const [msg, setMsg] = useState(null); // {type: 'success'|'error', text}

  // Problem metadata
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [difficulty, setDifficulty] = useState('Medium');
  const [tags, setTags] = useState('');
  const [constraints, setConstraints] = useState('');
  const [examples, setExamples] = useState([{ input: '', output: '', explanation: '' }]);

  // Judge config
  const [testcases, setTestcases] = useState('');
  const [inputnames, setInputnames] = useState('');
  const [timeout, setTimeout_] = useState(5);

  // Code
  const [adminCodeLang, setAdminCodeLang] = useState('python');
  const [adminCode, setAdminCode] = useState('');
  const [templateLang, setTemplateLang] = useState('python');
  const [templates, setTemplates] = useState({ ...DEFAULT_TEMPLATES });

  // Admin execution
  const [execResult, setExecResult] = useState(null);
  const [executing, setExecuting] = useState(false);

  const [saving, setSaving] = useState(false);
  const [loading, setLoading] = useState(false);

  function showMsg(type, text) {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 5000);
  }

  async function loadProblem() {
    if (!problemId.trim()) return;
    setLoading(true);
    try {
      const res = await api.getProblem(problemId.trim());
      const p = res.data || res;
      setLoadedId(problemId.trim());
      setTitle(p.title || '');
      setDescription(p.description || '');
      setDifficulty(p.difficulty || 'Medium');
      setTags((p.tags || []).join(', '));
      setConstraints(p.constraints || '');
      setExamples(p.examples?.length ? p.examples : [{ input: '', output: '', explanation: '' }]);
      setTestcases((p.Testcases || []).join('\n'));
      setInputnames((p.Inputname || []).join(', '));
      setTimeout_(p.Timeout || 5);
      // Decode admin code
      if (p.Adminsrc) {
        try { setAdminCode(atob(p.Adminsrc)); } catch { setAdminCode(p.Adminsrc); }
      }
      // Decode templates
      if (p.Remaining) {
        const decoded = {};
        Object.entries(p.Remaining).forEach(([lang, b64]) => {
          try { decoded[lang] = atob(b64); } catch { decoded[lang] = b64; }
        });
        setTemplates((prev) => ({ ...prev, ...decoded }));
      }
      showMsg('success', `Loaded problem: ${problemId}`);
    } catch (e) {
      if (e.message.includes('404') || e.message.includes('not found')) {
        setLoadedId(problemId.trim());
        showMsg('success', `New problem: ${problemId}. Fill in the details and save.`);
      } else {
        showMsg('error', e.message);
      }
    } finally {
      setLoading(false);
    }
  }

  async function executeAdminCode() {
    if (!adminCode.trim()) {
      showMsg('error', 'Admin code is empty');
      return;
    }
    const tcList = testcases.trim().split('\n').filter(Boolean);
    if (tcList.length === 0) {
      showMsg('error', 'No testcases defined');
      return;
    }
    setExecuting(true);
    setExecResult(null);
    try {
      const res = await api.executeAdmin({
        adminCode: btoa(adminCode),
        testcases: tcList,
        language: adminCodeLang,
      });
      const { jobId } = res.data || res;
      // Poll for result
      let attempts = 0;
      const interval = setInterval(async () => {
        try {
          const r = await api.getAdminResult(jobId);
          const data = r.data || r;
          if (data.status !== 'pending') {
            setExecResult(data);
            setExecuting(false);
            clearInterval(interval);
          }
        } catch {}
        if (++attempts > 30) {
          clearInterval(interval);
          setExecuting(false);
          showMsg('error', 'Execution timed out');
        }
      }, 1500);
    } catch (e) {
      showMsg('error', e.message);
      setExecuting(false);
    }
  }

  async function saveProblem() {
    if (!loadedId) {
      showMsg('error', 'Enter and load a problem ID first');
      return;
    }
    setSaving(true);
    try {
      // Encode templates to base64
      const encodedTemplates = {};
      LANGUAGES.forEach(({ id }) => {
        encodedTemplates[id] = btoa(templates[id] || DEFAULT_TEMPLATES[id] || '');
      });

      const tcList = testcases.trim().split('\n').filter(Boolean);
      const inputnameList = inputnames.split(',').map((s) => s.trim()).filter(Boolean);
      const tagList = tags.split(',').map((s) => s.trim()).filter(Boolean);

      await api.saveProblem(loadedId, {
        title: title || loadedId,
        description,
        difficulty,
        tags: tagList,
        constraints,
        examples: examples.filter((e) => e.input || e.output),
        Adminsrc: btoa(adminCode),
        Remaining: encodedTemplates,
        Testcases: tcList,
        Inputname: inputnameList,
        Timeout: Number(timeout),
      });
      showMsg('success', `Problem "${loadedId}" saved successfully!`);
    } catch (e) {
      showMsg('error', e.message);
    } finally {
      setSaving(false);
    }
  }

  function addExample() {
    setExamples((prev) => [...prev, { input: '', output: '', explanation: '' }]);
  }
  function updateExample(i, field, val) {
    setExamples((prev) => prev.map((ex, idx) => idx === i ? { ...ex, [field]: val } : ex));
  }
  function removeExample(i) {
    setExamples((prev) => prev.filter((_, idx) => idx !== i));
  }

  return (
    <div className="h-full overflow-y-auto p-6 max-w-6xl mx-auto">
      <h1 className="text-2xl font-bold text-white mb-6">Admin Panel</h1>

      {msg && (
        <div className={`mb-4 px-4 py-3 rounded border text-sm ${
          msg.type === 'success'
            ? 'bg-green-900/40 border-green-700 text-green-300'
            : 'bg-red-900/40 border-red-700 text-red-300'
        }`}>
          {msg.text}
        </div>
      )}

      {/* Problem ID */}
      <div className="bg-gray-900 rounded-lg border border-gray-700 p-5 mb-4">
        <Section title="Problem ID">
          <div className="flex gap-2">
            <input
              type="text"
              value={problemId}
              onChange={(e) => setProblemId(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadProblem()}
              placeholder="e.g. two-sum, valid-parentheses"
              className="flex-1 bg-gray-800 text-white text-sm px-3 py-2 rounded border border-gray-600 focus:outline-none focus:border-yellow-400"
            />
            <button
              onClick={loadProblem}
              disabled={loading}
              className="px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white text-sm rounded transition-colors disabled:opacity-50"
            >
              {loading ? 'Loading...' : 'Load / New'}
            </button>
          </div>
          {loadedId && (
            <p className="text-xs text-gray-500 mt-1">Editing: <span className="text-yellow-400">{loadedId}</span></p>
          )}
        </Section>
      </div>

      {loadedId && (
        <>
          {/* Metadata */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-5 mb-4 space-y-4">
            <Section title="Problem Info">
              <Input label="Title" value={title} onChange={setTitle} placeholder="Two Sum" />
              <div>
                <label className="block text-xs text-gray-400 mb-1">Difficulty</label>
                <div className="flex gap-2">
                  {DIFFICULTIES.map((d) => (
                    <button
                      key={d}
                      onClick={() => setDifficulty(d)}
                      className={`px-4 py-1.5 text-sm rounded transition-colors ${
                        difficulty === d
                          ? d === 'Easy' ? 'bg-green-700 text-white' : d === 'Medium' ? 'bg-yellow-700 text-white' : 'bg-red-700 text-white'
                          : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                      }`}
                    >
                      {d}
                    </button>
                  ))}
                </div>
              </div>
              <Input label="Tags (comma-separated)" value={tags} onChange={setTags} placeholder="Array, Hash Table, Two Pointers" />
              <Textarea
                label="Description (Markdown supported)"
                value={description}
                onChange={setDescription}
                placeholder="Given an array of integers nums and an integer target, return indices of the two numbers such that they add up to target."
                rows={6}
              />
              <Textarea
                label="Constraints (Markdown)"
                value={constraints}
                onChange={setConstraints}
                placeholder="- `2 <= nums.length <= 10^4`&#10;- `-10^9 <= nums[i] <= 10^9`"
                rows={3}
              />
            </Section>
          </div>

          {/* Examples */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-5 mb-4">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-sm font-semibold text-gray-300 uppercase tracking-wide">Examples</h3>
              <button
                onClick={addExample}
                className="text-xs text-yellow-400 hover:text-yellow-300 transition-colors"
              >
                + Add Example
              </button>
            </div>
            <div className="space-y-4">
              {examples.map((ex, i) => (
                <div key={i} className="bg-gray-800 rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-400">Example {i + 1}</span>
                    {examples.length > 1 && (
                      <button
                        onClick={() => removeExample(i)}
                        className="text-xs text-red-400 hover:text-red-300"
                      >
                        Remove
                      </button>
                    )}
                  </div>
                  <Input
                    label="Input"
                    value={ex.input}
                    onChange={(v) => updateExample(i, 'input', v)}
                    placeholder="nums = [2,7,11,15], target = 9"
                  />
                  <Input
                    label="Output"
                    value={ex.output}
                    onChange={(v) => updateExample(i, 'output', v)}
                    placeholder="[0,1]"
                  />
                  <Input
                    label="Explanation (optional)"
                    value={ex.explanation}
                    onChange={(v) => updateExample(i, 'explanation', v)}
                    placeholder="Because nums[0] + nums[1] == 9, we return [0, 1]."
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Judge Config */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-5 mb-4 space-y-4">
            <Section title="Judge Configuration">
              <Textarea
                label="Testcases (one per line — these are the stdin inputs the judge uses)"
                value={testcases}
                onChange={setTestcases}
                placeholder={"2 7 11 15\n9\n3 2 4\n6"}
                rows={5}
              />
              <Input
                label="Input parameter names (comma-separated, for grouping multi-line inputs)"
                value={inputnames}
                onChange={setInputnames}
                placeholder="nums, target"
              />
              <Input
                label="Timeout (seconds)"
                value={timeout}
                onChange={(v) => setTimeout_(Number(v))}
                type="number"
              />
            </Section>
          </div>

          {/* Code Templates */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-5 mb-4">
            <Section title="Code Templates (one per language — must include // INSERT_CODE_HERE)">
              <div className="flex gap-2 mb-3">
                {LANGUAGES.map(({ id, name }) => (
                  <button
                    key={id}
                    onClick={() => setTemplateLang(id)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      templateLang === id
                        ? 'bg-yellow-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div style={{ height: '280px' }} className="rounded overflow-hidden border border-gray-700">
                <CodeEditor
                  value={templates[templateLang] || DEFAULT_TEMPLATES[templateLang]}
                  onChange={(v) => setTemplates((prev) => ({ ...prev, [templateLang]: v || '' }))}
                  language={templateLang}
                />
              </div>
              <p className="text-xs text-gray-500 mt-2">
                The marker <code className="text-yellow-600">// INSERT_CODE_HERE</code> is where user's solution gets inserted.
              </p>
            </Section>
          </div>

          {/* Admin (Reference) Solution */}
          <div className="bg-gray-900 rounded-lg border border-gray-700 p-5 mb-4">
            <Section title="Reference Solution (Admin Code — used to generate expected outputs)">
              <div className="flex gap-2 mb-3">
                {LANGUAGES.map(({ id, name }) => (
                  <button
                    key={id}
                    onClick={() => setAdminCodeLang(id)}
                    className={`px-3 py-1 text-xs rounded transition-colors ${
                      adminCodeLang === id
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-700 text-gray-400 hover:bg-gray-600'
                    }`}
                  >
                    {name}
                  </button>
                ))}
              </div>
              <div style={{ height: '280px' }} className="rounded overflow-hidden border border-gray-700">
                <CodeEditor
                  value={adminCode}
                  onChange={(v) => setAdminCode(v || '')}
                  language={adminCodeLang}
                />
              </div>
              <div className="flex items-center gap-3 mt-3">
                <button
                  onClick={executeAdminCode}
                  disabled={executing}
                  className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white text-sm rounded transition-colors disabled:opacity-50"
                >
                  {executing ? 'Executing...' : 'Test Admin Code'}
                </button>
                <span className="text-xs text-gray-500">Run admin code against testcases to verify expected outputs</span>
              </div>
              {execResult && (
                <div className="mt-3 bg-gray-800 rounded-lg p-4">
                  <div className="text-xs text-gray-400 mb-2">Execution Result:</div>
                  {execResult.testcases?.map((tc, i) => (
                    <div key={i} className="mb-2 text-sm">
                      <span className="text-gray-500">Input: </span>
                      <code className="text-yellow-300">{tc.input}</code>
                      <span className="text-gray-500 ml-3">Output: </span>
                      <code className="text-green-300">{tc.output}</code>
                    </div>
                  ))}
                  {execResult.error && (
                    <pre className="text-red-300 text-sm whitespace-pre-wrap">{execResult.error}</pre>
                  )}
                  {!execResult.testcases && !execResult.error && (
                    <pre className="text-gray-300 text-sm">{JSON.stringify(execResult, null, 2)}</pre>
                  )}
                </div>
              )}
            </Section>
          </div>

          {/* Save */}
          <div className="flex justify-end gap-3 pb-8">
            <button
              onClick={saveProblem}
              disabled={saving}
              className="px-6 py-2.5 bg-green-600 hover:bg-green-500 text-white font-medium rounded transition-colors disabled:opacity-50"
            >
              {saving ? 'Saving...' : 'Save Problem'}
            </button>
          </div>
        </>
      )}
    </div>
  );
}
