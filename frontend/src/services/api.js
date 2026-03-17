import { API_URL } from '../config';

async function request(method, path, body) {
  const opts = {
    method,
    headers: { 'Content-Type': 'application/json' },
  };
  if (body) opts.body = JSON.stringify(body);

  let res;
  try {
    res = await fetch(API_URL + path, opts);
  } catch (e) {
    throw new Error(`Network error: ${e.message}. Is the backend running on port 9000?`);
  }

  // Parse JSON safely — some responses may have empty bodies
  let json;
  const text = await res.text();
  try {
    json = text ? JSON.parse(text) : {};
  } catch {
    throw new Error(`Invalid JSON response from server: ${text.slice(0, 100)}`);
  }

  if (!res.ok) {
    // Backend errorResponse shape: { status: "error", error: { code, message } }
    const msg =
      json?.error?.message ||
      json?.message ||
      (typeof json?.error === 'string' ? json.error : null) ||
      `Request failed (${res.status})`;
    throw new Error(msg);
  }

  // Backend successResponse shape: { status: "ok", data: ... }
  // Return the whole json so callers can do res.data or res
  return json;
}

export const api = {
  // Problems
  listProblems: () => request('GET', '/api/problems'),
  getProblem: (id) => request('GET', `/api/problems/${id}`),
  saveProblem: (id, data) => request('PUT', `/api/problems/${id}`, data),

  // Submissions
  submit: (data) => request('POST', '/submit', data),
  runCode: (data) => request('POST', '/interpret_solution', data),
  getSubmission: (id) => request('GET', `/submissions/${id}`),
  getUserSubmissions: (userId) => request('GET', `/users/${userId}/submissions`),
  getProblemStats: (problemId) => request('GET', `/problems/${problemId}/stats`),

  // Admin execution
  executeAdmin: (data) => request('POST', '/api/execute-admin', data),
  getAdminResult: (jobId) => request('GET', `/api/execute-admin/${jobId}`),
};
