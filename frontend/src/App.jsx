import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import Navbar from './components/Navbar';
import ProblemList from './pages/ProblemList';
import ProblemPage from './pages/ProblemPage';
import Submissions from './pages/Submissions';
import Admin from './pages/Admin';
import Benchmark from './pages/Benchmark';

export default function App() {
  return (
    <BrowserRouter>
      <div className="flex flex-col h-full min-h-screen bg-gray-950">
        <Navbar />
        <div className="flex-1 overflow-hidden">
          <Routes>
            <Route path="/" element={<ProblemList />} />
            <Route path="/problems/:id" element={<ProblemPage />} />
            <Route path="/submissions" element={<Submissions />} />
            <Route path="/admin" element={<Admin />} />
            <Route path="/benchmark" element={<Benchmark />} />
            <Route path="*" element={<Navigate to="/" />} />
          </Routes>
        </div>
      </div>
    </BrowserRouter>
  );
}
