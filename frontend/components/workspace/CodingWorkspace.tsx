"use client";

import React, { useState } from 'react';
import Editor from '@monaco-editor/react';
import { Play, CheckCircle2, Code2, Terminal, RefreshCw, FileText, ChevronRight } from 'lucide-react';

export interface Problem {
  title: string;
  difficulty?: 'Easy' | 'Medium' | 'Hard';
  description: string;
  constraints?: string[];
  examples?: { input: string; output: string; explanation?: string }[];
  initialCode?: Record<string, string>;
}

export const DEFAULT_PROBLEM: Problem = {
  title: "1. High-Throughput Rate Limiter & Event Throttler",
  difficulty: "Medium",
  description: "Implement a sliding window rate limiter class that tracks incoming user requests and enforces a maximum threshold of requests per sliding window in TypeScript or Python. The implementation must support high concurrency and handle edge cases where multiple requests arrive at identical millisecond timestamps.",
  constraints: [
    "allowRequest(userId, timestampMs) should run in O(1) or O(log N) average time complexity.",
    "Space complexity should scale with the number of unique active user IDs.",
    "Handle concurrent burst traffic and sliding window cleanup cleanly."
  ],
  examples: [
    {
      input: "limiter.allowRequest('user_123', 1000) // limit: 3 per 5000ms",
      output: "true",
      explanation: "First request at t=1000ms is allowed."
    },
    {
      input: "limiter.allowRequest('user_123', 1050)",
      output: "true",
      explanation: "Second request at t=1050ms is allowed."
    }
  ],
  initialCode: {
    typescript: `class SlidingWindowRateLimiter {
  private limit: number;
  private windowMs: number;
  private userLogs: Map<string, number[]>;

  constructor(limit: number = 5, windowMs: number = 10000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.userLogs = new Map();
  }

  public allowRequest(userId: string, timestampMs: number = Date.now()): boolean {
    // TODO: Implement sliding window rate limiting logic
    return true;
  }
}

// Test instance
const limiter = new SlidingWindowRateLimiter(3, 5000);
console.log("Allowed t=1000:", limiter.allowRequest("user1", 1000));
console.log("Allowed t=2000:", limiter.allowRequest("user1", 2000));
`,
    python: `class SlidingWindowRateLimiter:
    def __init__(self, limit: int = 5, window_ms: int = 10000):
        self.limit = limit
        self.window_ms = window_ms
        self.user_logs = {}

    def allow_request(self, user_id: str, timestamp_ms: int) -> bool:
        # TODO: Implement sliding window rate limiting logic
        return True

limiter = SlidingWindowRateLimiter(3, 5000)
print("Allowed t=1000:", limiter.allow_request("user1", 1000))
`,
    javascript: `class SlidingWindowRateLimiter {
  constructor(limit = 5, windowMs = 10000) {
    this.limit = limit;
    this.windowMs = windowMs;
    this.userLogs = new Map();
  }

  allowRequest(userId, timestampMs = Date.now()) {
    // TODO: Implement sliding window rate limiting logic
    return true;
  }
}

const limiter = new SlidingWindowRateLimiter(3, 5000);
console.log("Allowed t=1000:", limiter.allowRequest("user1", 1000));
`
  }
};

interface CodingWorkspaceProps {
  code: string;
  setCode: (code: string) => void;
  language: string;
  setLanguage: (lang: string) => void;
  onRunCode: (success: boolean, output: string) => void;
  onSubmit: () => void;
  problem?: Problem;
}

export default function CodingWorkspace({
  code,
  setCode,
  language,
  setLanguage,
  onRunCode,
  onSubmit,
  problem
}: CodingWorkspaceProps) {
  const activeProblem = problem || DEFAULT_PROBLEM;
  const activeCodeTemplates = activeProblem.initialCode || DEFAULT_PROBLEM.initialCode!;

  const [activeTab, setActiveTab] = useState<'problem' | 'output'>('problem');
  const [output, setOutput] = useState<string | null>(null);
  const [isRunning, setIsRunning] = useState(false);

  // Initialize code if empty
  React.useEffect(() => {
    if (!code) {
      setCode(activeCodeTemplates[language] || activeCodeTemplates['typescript'] || DEFAULT_PROBLEM.initialCode!['typescript']);
    }
  }, [language]);

  const handleLanguageChange = (newLang: string) => {
    setLanguage(newLang);
    setCode(activeCodeTemplates[newLang] || activeCodeTemplates['typescript'] || DEFAULT_PROBLEM.initialCode!['typescript']);
  };

  const handleRun = () => {
    setIsRunning(true);
    setActiveTab('output');
    setOutput('Compiling and executing test cases...\n');

    setTimeout(() => {
      let runOutput = '';
      let isSuccess = true;

      try {
        if (language === 'javascript' || language === 'typescript') {
          const logs: string[] = [];
          const customConsole = {
            log: (...args: any[]) => logs.push(args.map(a => typeof a === 'object' ? JSON.stringify(a) : a).join(' ')),
            error: (...args: any[]) => logs.push('[ERROR] ' + args.join(' '))
          };
          const runFn = new Function('console', code);
          runFn(customConsole);
          runOutput = logs.length > 0 ? logs.join('\n') : 'Code executed successfully with no stdout output.';
        } else {
          runOutput = `Simulated execution output for ${language}:\n✓ Test Case 1 Passed (t=1000ms)\n✓ Test Case 2 Passed (t=1050ms)\n✓ Rate limit boundary correctly enforced.`;
        }
      } catch (err: any) {
        isSuccess = false;
        runOutput = `Runtime Exception Error:\n${err.message || String(err)}`;
      }

      setOutput(runOutput);
      setIsRunning(false);
      onRunCode(isSuccess, runOutput);
    }, 600);
  };

  return (
    <div className="w-full h-full flex flex-col lg:flex-row bg-[#1e1e1e] border border-gray-800 rounded-2xl overflow-hidden shadow-2xl">
      
      {/* Left Column: Problem & Output Drawer */}
      <div className="w-full lg:w-2/5 flex flex-col border-b lg:border-b-0 lg:border-r border-gray-800 bg-[#252526]">
        
        {/* Tab Selector Header */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-800 text-xs">
          <div className="flex items-center gap-1">
            <button
              onClick={() => setActiveTab('problem')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'problem' ? 'bg-[#1e1e1e] text-white font-medium' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <FileText className="w-3.5 h-3.5" />
              <span>Problem</span>
            </button>
            <button
              onClick={() => setActiveTab('output')}
              className={`px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition ${
                activeTab === 'output' ? 'bg-[#1e1e1e] text-white font-medium' : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Terminal className="w-3.5 h-3.5" />
              <span>Console Log</span>
              {output && <span className="w-2 h-2 rounded-full bg-emerald-400"></span>}
            </button>
          </div>

          <span className="text-[10px] font-mono bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded-full">
            {activeProblem.difficulty || 'Medium'}
          </span>
        </div>

        {/* Tab Body */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs font-sans custom-scrollbar">
          {activeTab === 'problem' ? (
            <>
              <div>
                <h3 className="text-base font-bold text-white mb-2">{activeProblem.title}</h3>
                <p className="text-gray-300 leading-relaxed">{activeProblem.description}</p>
              </div>

              {activeProblem.constraints && activeProblem.constraints.length > 0 && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Constraints</h4>
                  <ul className="space-y-1 text-gray-400 font-mono text-[11px]">
                    {activeProblem.constraints.map((c, i) => (
                      <li key={i} className="flex items-start gap-1.5">
                        <ChevronRight className="w-3 h-3 text-blue-400 shrink-0 mt-0.5" />
                        <span>{c}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {activeProblem.examples && activeProblem.examples.length > 0 && (
                <div>
                  <h4 className="font-mono text-[10px] uppercase font-bold text-gray-400 tracking-wider mb-2">Examples</h4>
                  <div className="space-y-2">
                    {activeProblem.examples.map((ex, i) => (
                      <div key={i} className="bg-[#1e1e1e] p-3 rounded-xl border border-gray-800 space-y-1 font-mono text-[11px]">
                        <div className="text-gray-300"><strong className="text-gray-500">Input:</strong> {ex.input}</div>
                        <div className="text-emerald-400"><strong className="text-gray-500">Output:</strong> {ex.output}</div>
                        {ex.explanation && <div className="text-gray-500 text-[10px]">{ex.explanation}</div>}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          ) : (
            <div className="h-full flex flex-col font-mono">
              <span className="text-[10px] text-gray-500 uppercase tracking-wider mb-2 block">Execution Terminal Output</span>
              <pre className="flex-1 bg-[#1e1e1e] p-4 rounded-xl text-emerald-300 border border-gray-800 text-xs overflow-x-auto custom-scrollbar leading-relaxed">
                {output || 'No execution output yet. Click "Run Code" to execute test cases.'}
              </pre>
            </div>
          )}
        </div>
      </div>

      {/* Right Column: Monaco Code Editor */}
      <div className="flex-1 flex flex-col bg-[#1e1e1e]">
        
        {/* Editor Toolbar */}
        <div className="flex items-center justify-between px-4 py-2 bg-[#2d2d2d] border-b border-gray-800 text-xs">
          <div className="flex items-center gap-2">
            <Code2 className="w-4 h-4 text-blue-400" />
            <select
              value={language}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="bg-[#1e1e1e] text-white border border-gray-700 rounded-lg px-2.5 py-1 text-xs font-mono focus:outline-none focus:border-blue-500 cursor-pointer"
            >
              <option value="typescript">TypeScript</option>
              <option value="python">Python 3</option>
              <option value="javascript">JavaScript (Node)</option>
            </select>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleRun}
              disabled={isRunning}
              className="px-3.5 py-1.5 bg-[#3c4043] hover:bg-[#4d5156] text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer"
            >
              {isRunning ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : <Play className="w-3.5 h-3.5 text-emerald-400 fill-emerald-400" />}
              <span>Run Code</span>
            </button>
            <button
              onClick={onSubmit}
              className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg text-xs flex items-center gap-1.5 transition cursor-pointer shadow-md"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Submit Solution</span>
            </button>
          </div>
        </div>

        {/* Monaco Editor Container */}
        <div className="flex-1 w-full min-h-[300px] overflow-hidden">
          <Editor
            height="100%"
            language={language}
            theme="vs-dark"
            value={code}
            onChange={(val) => setCode(val || '')}
            options={{
              fontSize: 13,
              minimap: { enabled: false },
              scrollBeyondLastLine: false,
              automaticLayout: true,
              tabSize: 2,
              wordWrap: 'on'
            }}
          />
        </div>
      </div>

    </div>
  );
}
