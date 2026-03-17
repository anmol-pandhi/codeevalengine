# User Manual — Code Eval Engine

## Overview

**Code Eval Engine** is a web-based platform for writing, running, and submitting code solutions to programming problems. It uses a Docker container pool to evaluate code in isolated sandboxes and delivers results in real time.

Supported languages: **Python**, **JavaScript**, **C++**, **Java**

---

## Navigation

The top navigation bar has four sections:

| Link | Description |
|------|-------------|
| **Problems** | Browse and solve programming problems |
| **My Submissions** | View your past submission history |
| **Benchmark** | Compare parallel vs sequential execution performance |
| **Admin** | Add or manage problems |

Your anonymous user ID is shown in the top-right corner.

---

## Solving a Problem

### 1. Open a Problem

Click any problem from the **Problems** list. The problem page has three panels:

- **Left** — Problem description, constraints, and example test cases
- **Middle** — Code editor
- **Right** — Result output

### 2. Write Your Code

The code editor (Monaco Editor — the same editor used in VS Code) pre-fills a starter solution. Select your language from the dropdown at the top of the editor.

Available languages:
- Python
- JavaScript
- C++
- Java

### 3. Run Your Code (Test)

Click **Run Code** to test against a single custom test case.

- Edit the **Custom Test Case** input below the editor before running
- Results appear in the right panel within a few seconds
- Only your custom test case is checked — no hidden tests

### 4. Submit Your Code

Click **Submit** to evaluate against all hidden test cases.

- All test cases are run automatically
- Results show: status, pass count, runtime, and per-test-case details
- Submission is saved to your history

### 5. Reading Results

| Status | Meaning |
|--------|---------|
| **Accepted** | All test cases passed |
| **Wrong Answer** | Output did not match expected on at least one test case |
| **Runtime Error** | Code crashed during execution |
| **Compilation Error** | Code failed to compile (C++/Java) |
| **Time Limit Exceeded** | Code took too long |

Expand each test case row to see input, your output, expected output, and any error messages.

---

## My Submissions

The **My Submissions** page shows all submissions you have made, ordered by most recent.

Each row shows:
- Problem name
- Language used
- Status (color-coded)
- Timestamp

Click any row to view the full submission result.

---

## Benchmark Page

The **Benchmark** page demonstrates the performance advantage of the container pool system over a traditional one-at-a-time sequential system.

### How to Run a Benchmark

1. Click **Run Benchmark (6 jobs)**
2. Wait for both rounds to complete (~10–15 seconds)
3. View results

### What It Measures

**Round 1 — Parallel Pool:**
All 6 jobs are sent to the server simultaneously. Each job grabs its own container from the pool and executes at the same time. Total time ≈ time of a single job.

**Round 2 — Sequential:**
The same 6 jobs go through a server-side queue that allows only one job to run at a time. Each job must wait for the previous one to finish. Total time ≈ sum of all job times.

### Reading the Results

- **Bar charts** show individual job execution times
- **Wall-clock time** at the bottom of each panel shows total elapsed time
- **Speedup factor** (e.g., `5.8×`) shows how much faster the pool is

---

## Admin Panel

The **Admin** page allows adding new problems to the system.

### Adding a Problem

Fill in:
- **Title** — Problem name
- **Description** — Full problem statement (supports plain text)
- **Difficulty** — Easy / Medium / Hard
- **Test Cases** — Input and expected output pairs (add multiple)
- **Starter Code** — Default code shown in the editor per language
- **Admin Code** — JavaScript reference solution used to validate submissions

Click **Create Problem** to save.

---

## Tips

- Use **Run Code** first to verify your logic before submitting
- The editor supports standard keyboard shortcuts (Ctrl+Z undo, Ctrl+/ comment, etc.)
- If the result panel shows a spinner for more than 10 seconds, refresh the page and check **My Submissions** — the result may already be saved
- C++ and Java submissions are slightly slower on first run due to compilation; subsequent runs of the same code are faster due to binary caching
