import React from 'react';
import Editor from '@monaco-editor/react';

const MONACO_LANGUAGE_MAP = {
  python: 'python',
  javascript: 'javascript',
  cpp: 'cpp',
  java: 'java',
};

export default function CodeEditor({ value, onChange, language, readOnly = false }) {
  return (
    <Editor
      height="100%"
      language={MONACO_LANGUAGE_MAP[language] || 'plaintext'}
      value={value}
      onChange={onChange}
      theme="vs-dark"
      options={{
        minimap: { enabled: false },
        fontSize: 14,
        lineNumbers: 'on',
        scrollBeyondLastLine: false,
        automaticLayout: true,
        readOnly,
        tabSize: language === 'python' ? 4 : 2,
        insertSpaces: true,
        wordWrap: 'off',
        renderLineHighlight: 'line',
        contextmenu: true,
        folding: true,
        fontFamily: "'Fira Code', 'Cascadia Code', 'Consolas', monospace",
        fontLigatures: true,
        padding: { top: 12, bottom: 12 },
      }}
    />
  );
}
