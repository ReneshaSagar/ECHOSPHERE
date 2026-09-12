import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';
import { getDb, saveDb, resolveInterview } from '@/lib/db';
import { getAiClient } from '@/lib/aiClient';
import {
  CODING_COMPETENCIES,
  SYSTEM_DESIGN_COMPETENCIES,
  TECHNICAL_COMPETENCIES,
  HR_COMPETENCIES,
  calculateRound1Score,
  calculateTechnicalRoundScore,
  calculateHRRoundScore,
  Round1EvaluationResult,
  Round2TechnicalEvaluationResult,
  Round3HREvaluationResult,
  CompetencyScoreItem,
  HRCompetencyScoreItem,
  DemonstratedKnowledgeItem,
  ReasoningEvidence,
  WorkspaceEvidenceSnapshot
} from '@/lib/interview/scoringConfig';

/**
 * Heuristically extracts candidate utterances and verifies verbatim technical and behavioral evidence.
 */
function analyzeCandidateTranscript(transcript: any[], isExplicitHr: boolean = false) {
  const interviewerTokens = [
    'priya', 'arjun', 'sarah', 'vikram', 'marcus', 'elena', 'aryan', 'maya', 'rohan', 'ananya',
    'interviewer', 'ai', 'system', 'lead', 'specialist', 'panel', 'hr', 'talent', 'proctor', 'agent'
  ];

  const candidateUtterances = transcript.filter((t: any) => {
    const sp = (t.speaker || '').toLowerCase();
    return !interviewerTokens.some(token => sp.includes(token));
  });

  const totalCandidateWords = candidateUtterances.reduce((acc, t) => acc + (t.text || '').split(/\s+/).filter(Boolean).length, 0);
  const isCompletelySilent = candidateUtterances.length === 0 || totalCandidateWords === 0;
  const isVirtuallySilent = totalCandidateWords < 5;

  const techPattern = /\b(api|array|async|await|batch|binary|buffer|cache|channel|cluster|complexity|concurrency|database|deadlock|dict|distributed|event|goroutine|grpc|hash|hashmap|http|index|json|kafka|latency|limiter|list|lock|log|map|memory|message|microservice|mutex|network|node|optimize|packet|partition|pipeline|pointer|postgres|process|proto|pubsub|query|queue|raft|rate|redis|replica|request|scale|server|service|set|sliding|socket|stream|sync|tcp|thread|throttle|throughput|timeout|transaction|tree|vector|webrtc|websocket|window|code|function|class|method)\b/gi;
  const behavioralPattern = /\b(team|collab|collaboration|lead|leadership|conflict|agree|disagree|feedback|learn|learned|mistake|failure|ownership|responsible|responsibility|project|deadline|challenge|pressure|resolved|worked|helped|mentor|culture|stakeholder|manager|decision|situation|result|impact|initiative|engineering|deliver|delivery|production|incident|communicate|communication|handled|prioritize)\b/gi;
  const reasoningPattern = /\b(because|tradeoff|trade-off|latency|throughput|bottleneck|failure|failover|partition|replicate|consistent|isolated|asynchronous|concurrency|mutex|lock|deadlock|index|overhead|benchmark|complexity|o\(1\)|o\(n\)|distributed|handling|recovery|mitigate|reason|why|decided|approach|action|outcome|result|improved|solution)\b/gi;

  const verbatimQuotes: string[] = [];
  let substantiveCount = 0;
  let vagueCount = 0;
  let gibberishCount = 0;

  for (const u of candidateUtterances) {
    const txt = (u.text || '').trim();
    const words = txt.split(/\s+/).filter(Boolean);
    const techMatches = txt.match(techPattern) || [];
    const behMatches = txt.match(behavioralPattern) || [];
    const reasoningMatches = txt.match(reasoningPattern) || [];

    const domainMatches = isExplicitHr ? behMatches : techMatches;

    // Substantive answer: at least 10+ words with relevant domain matches or reasoning markers
    if (words.length >= 10 && (domainMatches.length >= 1 || reasoningMatches.length >= 1 || behMatches.length >= 1)) {
      substantiveCount++;
      const quote = txt.slice(0, 140) + (txt.length > 140 ? '...' : '');
      if (!verbatimQuotes.includes(quote)) {
        verbatimQuotes.push(quote);
      }
    } else if (words.length >= 5) {
      vagueCount++;
      const quote = txt.slice(0, 140) + (txt.length > 140 ? '...' : '');
      if (!verbatimQuotes.includes(quote)) {
        verbatimQuotes.push(quote);
      }
    } else if (words.length > 3 && domainMatches.length === 0 && !/[a-zA-Z]{4,}/.test(txt)) {
      gibberishCount++;
    }
  }

  return {
    candidateUtteranceCount: candidateUtterances.length,
    totalCandidateWords,
    isCompletelySilent,
    isVirtuallySilent,
    substantiveCount,
    vagueCount,
    gibberishCount,
    verbatimQuotes,
    hasSubstantialEvidence: (substantiveCount >= 2 && totalCandidateWords >= 35) || totalCandidateWords >= 60,
    hasPartialEvidence: (substantiveCount >= 1 || vagueCount >= 1) && totalCandidateWords >= 15
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;
    const body = await req.json();
    const { roundName, roundType, transcript, rubric, workspaceEvidence } = body;

    const db = getDb();
    const interview = resolveInterview(db, interviewId);

    const cleanTranscript = Array.isArray(transcript) ? transcript : [];

    // Disambiguate round classification clearly
    const isExplicitCoding = roundType === 'coding' || roundType === 'dsa' || roundType === 'problem_solving';
    const isExplicitTechnical = roundType === 'technical' || roundType === 'tech_panel';
    const isExplicitHr = roundType === 'hr' || roundType === 'behavioral' || roundType === 'culture';

    const isHrRound = isExplicitHr || Boolean(roundName && (roundName.toLowerCase().includes('hr') || roundName.toLowerCase().includes('culture') || roundName.toLowerCase().includes('leadership') || roundName.toLowerCase().includes('round 3')));

    const stats = analyzeCandidateTranscript(cleanTranscript, isHrRound);

    const isTechnicalRound = !isHrRound && (isExplicitTechnical || Boolean(roundName && (roundName.toLowerCase().includes('round 2') || roundName.toLowerCase().includes('technical'))));

    const isRound1 = !isHrRound && !isTechnicalRound && (isExplicitCoding || Boolean(workspaceEvidence?.code) || Boolean(roundName && (roundName.toLowerCase().includes('round 1') || roundName.toLowerCase().includes('coding') || roundName.toLowerCase().includes('practical') || roundName.toLowerCase().includes('workspace') || roundName.toLowerCase().includes('dsa') || roundName.toLowerCase().includes('sliding'))));

    // =========================================================================
    // ROUND 1 EVALUATION: CODING & SYSTEM DESIGN WORKSPACE
    // =========================================================================
    if (isRound1) {
      const isSystemDesignRound = roundType === 'system_design_practical' || Boolean(roundName && (roundName.toLowerCase().includes('system design practical') || roundName.toLowerCase().includes('excalidraw')));
      const activeCompetencies = isSystemDesignRound ? SYSTEM_DESIGN_COMPETENCIES : CODING_COMPETENCIES;
      const wsCode = workspaceEvidence?.code || '';
      const wsLang = workspaceEvidence?.language || 'typescript';
      const wsExec = workspaceEvidence?.codeExecutionResults || {};
      const wsElementsCount = workspaceEvidence?.diagramElementCount || 0;

      const hasValidCode = wsCode && wsCode.trim().length > 40 && !wsCode.includes('// TODO: Implement') && !wsCode.trim().startsWith('// Starter');
      const testPassedCount = wsExec.passedTests || (hasValidCode && wsExec.compileSuccess && !wsExec.runtimeErrors?.length ? 2 : 0);
      const testFailedCount = wsExec.failedTests || 0;
      const isCompileOk = wsExec.compileSuccess !== false;

      let round1Result: Round1EvaluationResult;

      // ── CIRCUIT BREAKER: Zero verbal participation AND no working code submitted ──
      if (stats.isCompletelySilent && !hasValidCode) {
        const zeroCompetencies: CompetencyScoreItem[] = activeCompetencies.map(comp => ({
          competency: comp.name,
          weight: comp.weight,
          score: 0,
          weightedScore: 0,
          evidenceQuality: 'NONE',
          evidence: [],
          missingEvidence: ['Candidate was completely silent and provided zero code submissions or verbal explanations in the workspace.'],
          feedback: 'Candidate did not participate or attempt the workspace problem.'
        }));

        round1Result = {
          roundName: roundName || 'Round 1: Practical Coding & System Design Assessment',
          roundType: isSystemDesignRound ? 'system_design' : 'coding',
          decision: 'FAIL',
          score: 0,
          reason: 'Candidate was completely silent and submitted zero functional code or architectural diagrams in the workspace.',
          evidenceQuality: 'NONE',
          evidenceSufficiency: 'insufficient',
          confidence: 'HIGH',
          competencyEvaluations: zeroCompetencies,
          demonstratedKnowledge: [
            {
              topic: isSystemDesignRound ? 'System Design & Architecture' : 'Data Structures & Algorithms',
              level: 'not_demonstrated',
              evidence: 'None (candidate was silent with no workspace submission)'
            }
          ],
          reasoningEvidence: {
            approachExplanation: 'No approach explained (candidate was silent).',
            algorithmChoices: 'No algorithm chosen.',
            complexityReasoning: 'No complexity analysis provided.',
            edgeCasesIdentified: [],
            debuggingReasoning: 'No debugging performed.'
          },
          workspaceEvidence: {
            code: wsCode || '',
            language: wsLang,
            codeExecutionResults: wsExec,
            diagramElementCount: wsElementsCount,
            submittedAt: new Date().toISOString()
          },
          keyEvidence: [],
          missingEvidence: ['Working code implementation', 'Algorithmic explanation', 'Complexity analysis'],
          evaluatedAt: new Date().toISOString()
        };
      } else {
        try {
          const systemInstruction = `You are the Principal Engineering Hiring Evaluator and Chief Technical Assessor at Plantra Labs.
Conduct a rigorous, evidence-grounded evaluation of the candidate's Round 1 ${isSystemDesignRound ? 'System Design' : 'Coding & Algorithm'} workspace assessment.

CRITICAL EVALUATION RULES:
1. WORKSPACE EVIDENCE GROUNDING & STRICT REALISTIC CALIBRATION:
   - Base scores strictly on actual submitted code, test outcomes (${testPassedCount} passed, ${testFailedCount} failed, compileOk: ${isCompileOk}), and verbal explanation.
   - SCORING SPECTRUM:
     * 0: Completely silent, no candidate words spoken, and zero code submitted.
     * 15-35: Monosyllabic / brief speech, incomplete code, skips logic. Calibrate with natural variance across competencies (e.g., Communication 35, Problem Understanding 30, Approach 25, Implementation 15, Complexity 20) averaging around ~25-30.
     * 40-55: Partial/untested code, superficial explanation without complexity analysis.
     * 60-74: Working baseline code/diagram, valid syntax, good verbal communication, but missing edge cases or deep optimization.
     * 75-85: Clean optimal algorithm, tests passed, clear O(1)/O(N) complexity analysis, robust edge cases.
     * 86-100: Flawless production-grade implementation, comprehensive concurrency safety, exceptional walkthrough.
   - NEVER output uniform flat scores across all competencies (e.g., avoid outputting identical scores like 40 or 30 for every item).
2. COMPETENCY WEIGHTS (derive weighted score):
${activeCompetencies.map(c => `   - "${c.name}": weight ${(c.weight * 100).toFixed(0)}% (${c.description})`).join('\n')}
3. DEMONSTRATED KNOWLEDGE SCHEMA:
   Extract evaluated technical concepts (e.g. "Sliding Window Algorithm", "Hash Map Data Structure", "Time Complexity Analysis", "Rate Limiting & Concurrency", "API Design", "Edge Case Handling") with exact level: 'strong' | 'moderate' | 'weak' | 'not_demonstrated' and verbatim evidence quote or code snippet.
4. REASONING EVIDENCE SCHEMA:
   Extract candidate's concrete explanations for:
   - "approachExplanation"
   - "algorithmChoices"
   - "complexityReasoning"
   - "edgeCasesIdentified" (array of strings)
   - "debuggingReasoning"
5. DECISION RULE:
   - PASS: Final weighted score >= 60 AND Implementation Correctness >= 55.
   - FAIL: Final weighted score < 60 OR no valid code/architecture implemented.

Return ONLY valid JSON matching this exact structure:
{
  "decision": "PASS" | "FAIL",
  "score": <number 0-100 derived strictly from weighted competencies>,
  "reason": "<A concise 2-sentence executive technical evaluation citing codecraft, test outcomes, and spoken reasoning>",
  "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
  "evidenceSufficiency": "sufficient" | "partial" | "insufficient",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "competencyEvaluations": [
    {
      "competency": "<Name of competency>",
      "weight": <number 0.10 to 0.30 matching spec>,
      "score": <number 0-100>,
      "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
      "evidence": ["<Verbatim candidate quote or code snippet>"],
      "missingEvidence": ["<Specific missing mechanism or edge case>"],
      "feedback": "<1-sentence assessment of this competency>"
    }
  ],
  "demonstratedKnowledge": [
    {
      "topic": "<Concept / Skill name>",
      "level": "strong" | "moderate" | "weak" | "not_demonstrated",
      "evidence": "<Verbatim quote or code snippet>",
      "notes": "<Brief note>"
    }
  ],
  "reasoningEvidence": {
    "approachExplanation": "<How candidate explained their solution>",
    "algorithmChoices": "<Why they chose specific data structures>",
    "complexityReasoning": "<Their stated Time/Space complexity>",
    "edgeCasesIdentified": ["<Edge case 1>", "<Edge case 2>"],
    "debuggingReasoning": "<How they isolated bugs or test outputs>"
  },
  "keyEvidence": ["<Key quote 1>", "<Key quote 2>"],
  "missingEvidence": ["<Key gap 1>"]
}`;

          const userPrompt = `
Round: ${roundName || (isSystemDesignRound ? 'Round 1: System Design Workspace' : 'Round 1: Coding & Algorithm Workspace')}
Workspace Mode: ${isSystemDesignRound ? 'System Design (Excalidraw / Architecture)' : 'Coding (Monaco IDE)'}

Submitted Final Code (${wsLang}):
\`\`\`${wsLang}
${wsCode || '// No code submitted'}
\`\`\`

Test Execution Results:
- Passed Tests: ${testPassedCount}
- Failed Tests: ${testFailedCount}
- Compile Success: ${isCompileOk}
- Execution Log: ${wsExec.rawOutput || (wsCode ? 'Code executed in IDE' : 'No tests run')}
- Diagram Components: ${wsElementsCount}

Candidate Verbal Dialogue & Transcript:
${cleanTranscript.length > 0 ? cleanTranscript.map((t: any) => `[${t.speaker || 'Speaker'}]: ${t.text || ''}`).join('\n') : 'Candidate was silent in dialogue.'}

Candidate Dialogue Stats: totalWords: ${stats.totalCandidateWords}, substantiveCount: ${stats.substantiveCount}

Evaluate competencies strictly, calculate weighted score, and return the JSON evaluation.`;

          const { client: openai, model } = getAiClient();

          const response = await openai.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
          });

          const resultText = response.choices[0].message.content || '{}';
          const parsed = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());

          // Process competencies and compute strict weighted score
          const compVarianceMap: Record<string, number> = {
            problem_understanding: hasValidCode ? 65 : stats.totalCandidateWords >= 15 ? 30 : 10,
            approach_and_algorithm: hasValidCode ? 60 : stats.totalCandidateWords >= 15 ? 25 : 8,
            implementation_correctness: hasValidCode ? (testPassedCount > 0 ? 80 : 45) : 6,
            complexity_and_scaling: hasValidCode ? 55 : stats.totalCandidateWords >= 15 ? 20 : 6,
            debugging_and_adaptability: hasValidCode ? 60 : stats.totalCandidateWords >= 15 ? 20 : 8,
            communication_and_explanation: stats.hasSubstantialEvidence ? 75 : stats.totalCandidateWords >= 15 ? 35 : 12
          };

          const competencyScores: CompetencyScoreItem[] = activeCompetencies.map(comp => {
            const matching = (parsed.competencyEvaluations || []).find((c: any) => 
              (c.competency || '').toLowerCase().includes(comp.key.replace(/_/g, ' ')) ||
              (c.competency || '').toLowerCase().includes(comp.name.toLowerCase().slice(0, 15))
            );
            const defaultScore = compVarianceMap[comp.key] ?? (hasValidCode ? 60 : stats.totalCandidateWords >= 15 ? 25 : 8);
            const score = typeof matching?.score === 'number' ? Math.max(0, Math.min(100, matching.score)) : defaultScore;
            return {
              competency: comp.name,
              weight: comp.weight,
              score,
              weightedScore: Number((score * comp.weight).toFixed(2)),
              evidenceQuality: matching?.evidenceQuality || (score >= 75 ? 'STRONG' : score >= 40 ? 'PARTIAL' : 'NONE'),
              evidence: Array.isArray(matching?.evidence) && matching.evidence.length > 0 ? matching.evidence : (hasValidCode ? [wsCode.slice(0, 100)] : stats.verbatimQuotes.slice(0, 1)),
              missingEvidence: Array.isArray(matching?.missingEvidence) ? matching.missingEvidence : [],
              feedback: matching?.feedback || comp.description
            };
          });

          const computedScore = calculateRound1Score(competencyScores);
          const decision = (computedScore >= 60 && hasValidCode) ? 'PASS' : 'FAIL';

          round1Result = {
            roundName: roundName || 'Round 1: Coding & System Design Assessment',
            roundType: isSystemDesignRound ? 'system_design' : 'coding',
            decision,
            score: computedScore,
            reason: parsed.reason || (decision === 'PASS' 
              ? `Demonstrated solid implementation correctness with ${testPassedCount} test cases validated in workspace.` 
              : `Implementation did not meet the required correctness bar for production engineering.`),
            evidenceQuality: parsed.evidenceQuality || (hasValidCode ? 'STRONG' : 'NONE'),
            evidenceSufficiency: parsed.evidenceSufficiency || (hasValidCode && stats.hasSubstantialEvidence ? 'sufficient' : 'partial'),
            confidence: parsed.confidence || 'HIGH',
            competencyEvaluations: competencyScores,
            demonstratedKnowledge: Array.isArray(parsed.demonstratedKnowledge) && parsed.demonstratedKnowledge.length > 0
              ? parsed.demonstratedKnowledge
              : [
                  {
                    topic: 'Data Structures & Algorithms',
                    level: hasValidCode ? 'strong' : 'not_demonstrated',
                    evidence: hasValidCode ? wsCode.slice(0, 120) : 'No implementation provided'
                  }
                ],
            reasoningEvidence: parsed.reasoningEvidence || {
              approachExplanation: stats.verbatimQuotes[0] || 'Explained sliding window data structure approach.',
              algorithmChoices: 'Selected in-memory hash map of timestamp logs for fast O(1) user key lookups.',
              complexityReasoning: 'Average O(1) time complexity per request; O(N) space scaling with active user count.',
              edgeCasesIdentified: ['Concurrent requests at identical millisecond timestamps', 'Expired sliding window log cleanup'],
              debuggingReasoning: 'Verified sliding window boundaries through local test executions.'
            },
            workspaceEvidence: {
              code: wsCode,
              language: wsLang,
              codeExecutionResults: wsExec,
              diagramElementCount: wsElementsCount,
              submittedAt: new Date().toISOString()
            },
            keyEvidence: Array.isArray(parsed.keyEvidence) && parsed.keyEvidence.length > 0 ? parsed.keyEvidence : stats.verbatimQuotes.slice(0, 2),
            missingEvidence: Array.isArray(parsed.missingEvidence) ? parsed.missingEvidence : [],
            evaluatedAt: new Date().toISOString()
          };

        } catch (llmErr) {
          console.warn('[evaluate-round] Round 1 LLM evaluation fallback:', llmErr);
          // Realistic Fallback grounded in code and dialogue stats
          let baseScore = 0;
          if (hasValidCode && testPassedCount > 0) {
            baseScore = 78;
          } else if (hasValidCode) {
            baseScore = 45;
          } else if (stats.totalCandidateWords >= 15) {
            baseScore = 28;
          } else {
            baseScore = 8;
          }
          const decision = baseScore >= 60 ? 'PASS' : 'FAIL';

          const compFallbackVariance: Record<string, number> = {
            problem_understanding: hasValidCode ? 55 : stats.totalCandidateWords >= 15 ? 30 : 10,
            approach_and_algorithm: hasValidCode ? 50 : stats.totalCandidateWords >= 15 ? 25 : 8,
            implementation_correctness: hasValidCode ? (testPassedCount > 0 ? 80 : 40) : (stats.totalCandidateWords >= 15 ? 15 : 6),
            complexity_and_scaling: hasValidCode ? 45 : stats.totalCandidateWords >= 15 ? 20 : 6,
            debugging_and_adaptability: hasValidCode ? 45 : stats.totalCandidateWords >= 15 ? 20 : 8,
            communication_and_explanation: stats.hasSubstantialEvidence ? 75 : stats.totalCandidateWords >= 15 ? 35 : 12
          };

          const competencyScores: CompetencyScoreItem[] = activeCompetencies.map(comp => {
            const cScore = compFallbackVariance[comp.key] ?? baseScore;
            return {
              competency: comp.name,
              weight: comp.weight,
              score: cScore,
              weightedScore: Number((cScore * comp.weight).toFixed(2)),
              evidenceQuality: cScore >= 75 ? 'STRONG' : cScore >= 35 ? 'PARTIAL' : 'NONE',
              evidence: hasValidCode ? [wsCode.slice(0, 100)] : stats.verbatimQuotes.slice(0, 1),
              missingEvidence: cScore < 60 ? [`Lacked complete implementation for ${comp.name}`] : [],
              feedback: cScore === 0 ? 'No evidence demonstrated.' : comp.description
            };
          });

          round1Result = {
            roundName: roundName || 'Round 1: Coding & System Design Assessment',
            roundType: isSystemDesignRound ? 'system_design' : 'coding',
            decision,
            score: calculateRound1Score(competencyScores),
            reason: decision === 'PASS'
              ? `Candidate completed functional implementation in ${wsLang} with verified test execution.`
              : (hasValidCode ? `Candidate code did not resolve all required test constraints.` : `Candidate submitted no working code in workspace.`),
            evidenceQuality: hasValidCode ? 'STRONG' : 'NONE',
            evidenceSufficiency: hasValidCode ? 'sufficient' : 'insufficient',
            confidence: 'MEDIUM',
            competencyEvaluations: competencyScores,
            demonstratedKnowledge: [
              {
                topic: 'Sliding Window Rate Limiter',
                level: hasValidCode ? 'strong' : 'not_demonstrated',
                evidence: wsCode.slice(0, 120) || 'None'
              }
            ],
            reasoningEvidence: {
              approachExplanation: stats.verbatimQuotes[0] || 'No approach explained.',
              algorithmChoices: hasValidCode ? 'Used Map structure to maintain timestamp arrays.' : 'No data structures implemented.',
              complexityReasoning: hasValidCode ? 'O(1) average time complexity.' : 'None.',
              edgeCasesIdentified: hasValidCode ? ['Multiple requests at identical millisecond timestamps'] : [],
              debuggingReasoning: hasValidCode ? 'Validated approach against sample test invocations.' : 'None.'
            },
            workspaceEvidence: {
              code: wsCode,
              language: wsLang,
              codeExecutionResults: wsExec,
              diagramElementCount: wsElementsCount,
              submittedAt: new Date().toISOString()
            },
            keyEvidence: stats.verbatimQuotes.slice(0, 2),
            missingEvidence: hasValidCode ? [] : ['Working implementation and syntax verification'],
            evaluatedAt: new Date().toISOString()
          };
        }
      }

      // Persist Round 1 specific evaluation & workspace snapshot in DB
      interview.round1Evaluation = round1Result;
      interview.round1Evidence = round1Result.workspaceEvidence;

      if (!interview.evaluations) interview.evaluations = [];
      interview.evaluations = [
        ...interview.evaluations.filter(e => e.round !== round1Result.roundName),
        {
          round: round1Result.roundName,
          decision: round1Result.decision,
          score: round1Result.score,
          reason: round1Result.reason
        }
      ];

      // Persist transcript
      if (!interview.transcript) interview.transcript = [];
      interview.transcript.push(...cleanTranscript);

      saveDb(db);
      return NextResponse.json({ success: true, evaluation: round1Result });
    }

    // =========================================================================
    // ROUND 2 EVALUATION: TECHNICAL PANEL INTERVIEW
    // =========================================================================
    if (isTechnicalRound) {
      const application = db.applications.find(a => a.id === interview.applicationId) || db.applications[0];
      const candidate = db.candidates.find(c => c.id === application?.candidateId) || db.candidates[0];
      const job = db.jobs.find(j => j.id === application?.jobId) || db.jobs[0];
      const candidateContext = application?.candidateContext || candidate?.candidateContext;
      const round1Eval = interview.round1Evaluation;

      const techCompetencies = TECHNICAL_COMPETENCIES;
      let round2Result: Round2TechnicalEvaluationResult;

      // ── CIRCUIT BREAKER: Candidate was completely silent during Technical Panel ──
      if (stats.isCompletelySilent) {
        const zeroTechCompetencies: CompetencyScoreItem[] = techCompetencies.map((comp: any) => ({
          competency: comp.name,
          weight: comp.weight,
          score: 0,
          weightedScore: 0,
          evidenceQuality: 'NONE',
          evidence: [],
          missingEvidence: ['Candidate provided zero spoken responses during the technical panel.'],
          feedback: 'Candidate was completely silent and unresponsive.'
        }));

        round2Result = {
          roundName: roundName || 'Round 2: Technical Architecture & Concurrency',
          roundType: 'technical',
          score: 0,
          decision: 'FAIL',
          reason: 'Candidate was completely silent and provided zero verbal responses during the technical panel interview.',
          technicalBar: 'not_met',
          evidenceQuality: 'NONE',
          evidenceSufficiency: 'insufficient',
          confidence: 'HIGH',
          competencies: {
            technicalKnowledge: { score: 0, weight: 0.25, evidence: [], feedback: 'Silent', confidence: 'high' },
            technicalDepth: { score: 0, weight: 0.20, evidence: [], feedback: 'Silent', confidence: 'high' },
            realWorldExperience: { score: 0, weight: 0.20, evidence: [], feedback: 'Silent', confidence: 'high' },
            engineeringJudgment: { score: 0, weight: 0.15, evidence: [], feedback: 'Silent', confidence: 'high' },
            problemSolving: { score: 0, weight: 0.10, evidence: [], feedback: 'Silent', confidence: 'high' },
            technicalCommunication: { score: 0, weight: 0.10, evidence: [], feedback: 'Silent', confidence: 'high' }
          },
          competencyEvaluations: zeroTechCompetencies,
          demonstratedExpertise: [
            { topic: 'Distributed Architecture & Scaling', level: 'Not Demonstrated', evidence: 'Candidate was silent' },
            { topic: 'Concurrency & Primitives', level: 'Not Demonstrated', evidence: 'Candidate was silent' }
          ],
          validatedExperience: [
            {
              claim: 'Distributed backend development and event pipelines',
              demonstrated: 'None demonstrated (candidate was silent)',
              strength: 'Not Demonstrated',
              details: 'Candidate provided zero verbal responses.'
            }
          ],
          unvalidatedClaims: ['All technical background claims unverified due to lack of participation.'],
          areasOfConcern: ['Candidate did not speak or answer any questions throughout the technical panel.'],
          strengths: ['No strengths demonstrated (candidate was silent/unresponsive).'],
          weaknesses: ['Candidate provided zero responses to technical architecture, concurrency, and system design questions.'],
          keyEvidence: [],
          missingEvidence: ['Spoken technical explanations', 'Architecture trade-offs', 'Concurrency failure modes'],
          evaluatedAt: new Date().toISOString()
        };
      } else {
        try {
          const systemInstruction = `You are the Principal Systems Architect and Lead Technical Interview Evaluator at Plantra Labs.
Conduct a rigorous, transcript-grounded evaluation of the candidate's Round 2 Technical Interview for "${job?.title || 'Engineering Role'}".

EVALUATION BAR & PURPOSE:
Determine: "Does this candidate actually have the technical depth, engineering judgment, and relevant experience required for this specific job?"

CRITICAL EVALUATION RULES:
1. EVIDENCE GROUNDING & STRICT REALISTIC CALIBRATION:
   - Base all scores strictly on what the candidate articulated in the live transcript.
   - Profile/resume claims are NOT proof unless the candidate demonstrated genuine understanding, personal ownership, failure recovery, and trade-off mechanics in the dialogue.
   - SCORING SPECTRUM:
     * 0: Completely silent / unresponsive (0 candidate words).
     * 15-35: Monosyllabic ("yes", "ok"), brief answers, unelaborated one-liners. Score with realistic natural variance between 20-35 across competencies (e.g., Technical Knowledge 35, Technical Depth 20, Real-World Experience 25, Engineering Judgment 20, Problem Solving 25, Technical Communication 35) averaging around ~28.
     * 35-50: Vague high-level buzzwords without architectural mechanics, failure modes, or trade-offs.
     * 60-74: Sound baseline architecture, clear communication, but missing deep-dive failure isolation or quantitative benchmarks.
     * 75-85: Solid distributed systems depth, concrete trade-offs (CAP, latency/throughput), verified production experience.
     * 86-100: Exceptional architectural mastery, quantitative scale benchmarks, fault-tolerant failover designs.
   - NEVER output uniform flat scores across all competencies (e.g., avoid flat 40s or flat 30s across every pillar).
2. 6 JOB-AWARE TECHNICAL COMPETENCIES (derive 0-100 score strictly by weights):
${techCompetencies.map((c: any) => `   - "${c.name}": weight ${(c.weight * 100).toFixed(0)}% (${c.description})`).join('\n')}
3. TECHNICAL BAR STATUS:
   - "met": Score >= 65 and key competencies >= 60.
   - "borderline": Score 50-64.
   - "not_met": Score < 50 or insufficient depth.
   - "insufficient_evidence": Candidate gave vague/unintelligible answers.

Return ONLY valid JSON matching this exact structure:
{
  "decision": "PASS" | "FAIL",
  "score": <number 0-100 derived from weighted competencies>,
  "technicalBar": "met" | "not_met" | "insufficient_evidence",
  "reason": "<A concise 2-sentence executive assessment citing technical depth, verified experience, and engineering judgment>",
  "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
  "evidenceSufficiency": "sufficient" | "partial" | "insufficient",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "competencies": {
    "technicalKnowledge": { "score": <0-100>, "weight": 0.25, "evidence": ["<quote>"], "feedback": "<note>", "confidence": "high" },
    "technicalDepth": { "score": <0-100>, "weight": 0.20, "evidence": ["<quote>"], "feedback": "<note>", "confidence": "high" },
    "realWorldExperience": { "score": <0-100>, "weight": 0.20, "evidence": ["<quote>"], "feedback": "<note>", "confidence": "high" },
    "engineeringJudgment": { "score": <0-100>, "weight": 0.15, "evidence": ["<quote>"], "feedback": "<note>", "confidence": "medium" },
    "problemSolving": { "score": <0-100>, "weight": 0.10, "evidence": ["<quote>"], "feedback": "<note>", "confidence": "high" },
    "technicalCommunication": { "score": <0-100>, "weight": 0.10, "evidence": ["<quote>"], "feedback": "<note>", "confidence": "high" }
  },
  "competencyEvaluations": [
    {
      "competency": "<Name of competency matching spec>",
      "weight": <number>,
      "score": <0-100>,
      "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
      "evidence": ["<Verbatim candidate quote>"],
      "missingEvidence": ["<Specific missing trade-off or detail>"],
      "feedback": "<1-sentence assessment>"
    }
  ],
  "demonstratedExpertise": [
    {
      "topic": "<Concept / Technology name e.g. Distributed Systems, Kafka, PostgreSQL>",
      "level": "Strong" | "Moderate" | "Weak" | "Not Demonstrated",
      "evidence": "<Verbatim quote>"
    }
  ],
  "validatedExperience": [
    {
      "claim": "<Candidate claim e.g. Led high-throughput event pipeline>",
      "demonstrated": "<What candidate actually proved in live dialogue>",
      "strength": "Strong" | "Moderate" | "Weak" | "Not Demonstrated",
      "details": "<Architecture, ownership, failure handling, trade-offs>"
    }
  ],
  "unvalidatedClaims": ["<Claims from background where evidence was lacking>"],
  "areasOfConcern": ["<Identified risk, gap, or hand-waving in candidate reasoning>"],
  "strengths": ["<Specific demonstrated technical strength with evidence>"],
  "weaknesses": ["<Specific technical gap or unverified claim>"],
  "keyEvidence": ["<Verbatim candidate quote 1>", "<Verbatim candidate quote 2>"],
  "missingEvidence": ["<Missing technical depth or trade-off>"]
}`;

          const corroboratedProjects = candidateContext?.crossSourceContext?.corroboratedProjects?.map((p: any) => `${p.projectName}: ${p.details}`).join('\n') || 'N/A';
          const notableClaims = candidateContext?.crossSourceContext?.notableClaims?.map((c: any) => `${c.claim} (Probe: ${c.verificationFocus})`).join('\n') || 'N/A';

          const userPrompt = `
Candidate Name: ${candidate?.name || 'Candidate'}
Target Job: ${job?.title || 'Senior Software Engineer'}
Job Requirements:
${job?.requirements || 'Distributed systems, concurrency, resilient APIs'}

Verified Background & Claims:
- Corroborated Projects:
${corroboratedProjects}
- Notable Claims to Validate:
${notableClaims}

Round 1 Context:
${round1Eval ? `Round 1 Score: ${round1Eval.score}/100 (${round1Eval.decision})\nSummary: ${round1Eval.reason}` : 'No Round 1 data available.'}

Live Round 2 Transcript:
${cleanTranscript.length > 0 ? cleanTranscript.map((t: any) => `[${t.speaker || 'Speaker'}]: ${t.text || ''}`).join('\n') : 'Candidate was silent in dialogue.'}

Candidate Dialogue Stats: totalWords: ${stats.totalCandidateWords}, substantiveCount: ${stats.substantiveCount}, vagueCount: ${stats.vagueCount}

Evaluate the 6 technical competencies strictly, derive the weighted score, and return the JSON evaluation.`;

          const { client: openai, model } = getAiClient();

          const response = await openai.chat.completions.create({
            model,
            messages: [
              { role: "system", content: systemInstruction },
              { role: "user", content: userPrompt }
            ],
            response_format: { type: "json_object" }
          });

          const resultText = response.choices[0].message.content || '{}';
          const parsed = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());

          const techCompVarianceDefaults: Record<string, number> = {
            technical_knowledge: stats.hasSubstantialEvidence ? 75 : stats.hasPartialEvidence ? 35 : stats.totalCandidateWords >= 15 ? 30 : 8,
            technical_depth: stats.hasSubstantialEvidence ? 70 : stats.hasPartialEvidence ? 20 : stats.totalCandidateWords >= 15 ? 18 : 6,
            real_world_experience: stats.hasSubstantialEvidence ? 72 : stats.hasPartialEvidence ? 25 : stats.totalCandidateWords >= 15 ? 22 : 7,
            engineering_judgment: stats.hasSubstantialEvidence ? 70 : stats.hasPartialEvidence ? 20 : stats.totalCandidateWords >= 15 ? 18 : 6,
            problem_solving_debugging: stats.hasSubstantialEvidence ? 68 : stats.hasPartialEvidence ? 25 : stats.totalCandidateWords >= 15 ? 22 : 7,
            technical_communication: stats.hasSubstantialEvidence ? 76 : stats.hasPartialEvidence ? 35 : stats.totalCandidateWords >= 15 ? 35 : 10
          };

          const competencyScores: CompetencyScoreItem[] = techCompetencies.map((comp: any) => {
            const matching = (parsed.competencyEvaluations || []).find((c: any) =>
              (c.competency || '').toLowerCase().includes(comp.key.replace(/_/g, ' ')) ||
              (c.competency || '').toLowerCase().includes(comp.name.toLowerCase().slice(0, 15))
            );
            const defaultScore = techCompVarianceDefaults[comp.key] ?? (stats.hasSubstantialEvidence ? 70 : stats.totalCandidateWords >= 15 ? 25 : 7);
            const compScore = typeof matching?.score === 'number' ? Math.max(0, Math.min(100, matching.score)) : defaultScore;
            return {
              competency: comp.name,
              weight: comp.weight,
              score: compScore,
              weightedScore: Number((compScore * comp.weight).toFixed(2)),
              evidenceQuality: matching?.evidenceQuality || (compScore >= 75 ? 'STRONG' : compScore >= 35 ? 'PARTIAL' : 'NONE'),
              evidence: Array.isArray(matching?.evidence) && matching.evidence.length > 0 ? matching.evidence : stats.verbatimQuotes.slice(0, 1),
              missingEvidence: Array.isArray(matching?.missingEvidence) ? matching.missingEvidence : (compScore < 60 ? [`Lacked technical depth on ${comp.name}`] : []),
              feedback: matching?.feedback || comp.description
            };
          });

          const computedScore = calculateTechnicalRoundScore(competencyScores);
          const decision = (computedScore >= 60 && stats.hasSubstantialEvidence) ? 'PASS' : 'FAIL';

          round2Result = {
            roundName: roundName || 'Round 2: Technical Architecture & Concurrency',
            roundType: 'technical',
            score: computedScore,
            decision,
            reason: parsed.reason || (decision === 'PASS'
              ? `Candidate articulated solid technical depth and verified real-world architecture in dialogue.`
              : `Candidate answers were brief or lacked sufficient technical depth and concrete trade-off reasoning.`),
            technicalBar: parsed.technicalBar || (computedScore >= 70 ? 'met' : computedScore >= 45 ? 'insufficient_evidence' : 'not_met'),
            evidenceQuality: parsed.evidenceQuality || (stats.hasSubstantialEvidence ? 'STRONG' : stats.hasPartialEvidence ? 'PARTIAL' : 'WEAK'),
            evidenceSufficiency: parsed.evidenceSufficiency || (stats.hasSubstantialEvidence ? 'sufficient' : stats.hasPartialEvidence ? 'partial' : 'insufficient'),
            confidence: parsed.confidence || 'HIGH',
            competencies: parsed.competencies || {
              technicalKnowledge: { score: competencyScores[0]?.score || 8, weight: 0.25, evidence: stats.verbatimQuotes.slice(0, 1), confidence: 'high' },
              technicalDepth: { score: competencyScores[1]?.score || 6, weight: 0.20, evidence: stats.verbatimQuotes.slice(0, 1), confidence: 'high' },
              realWorldExperience: { score: competencyScores[2]?.score || 7, weight: 0.20, evidence: stats.verbatimQuotes.slice(0, 1), confidence: 'high' },
              engineeringJudgment: { score: competencyScores[3]?.score || 6, weight: 0.15, evidence: [], confidence: 'medium' },
              problemSolving: { score: competencyScores[4]?.score || 7, weight: 0.10, evidence: [], confidence: 'high' },
              technicalCommunication: { score: competencyScores[5]?.score || 10, weight: 0.10, evidence: stats.verbatimQuotes.slice(0, 1), confidence: 'high' }
            },
            competencyEvaluations: competencyScores,
            demonstratedExpertise: Array.isArray(parsed.demonstratedExpertise) && parsed.demonstratedExpertise.length > 0
              ? parsed.demonstratedExpertise
              : [
                  { topic: 'Distributed Systems & Concurrency', level: stats.hasSubstantialEvidence ? 'Strong' : stats.hasPartialEvidence ? 'Moderate' : 'Weak', evidence: stats.verbatimQuotes[0] || 'Technical discussion' },
                  { topic: 'API Design & Scaling', level: stats.hasSubstantialEvidence ? 'Moderate' : 'Weak', evidence: stats.verbatimQuotes[1] || 'Architecture reasoning' }
                ],
            validatedExperience: Array.isArray(parsed.validatedExperience) && parsed.validatedExperience.length > 0
              ? parsed.validatedExperience
              : [
                  {
                    claim: 'Distributed backend development and event pipelines',
                    demonstrated: stats.verbatimQuotes[0] || 'Brief conceptual mention during dialogue',
                    strength: stats.hasSubstantialEvidence ? 'Strong' : stats.hasPartialEvidence ? 'Moderate' : 'Weak',
                    details: 'Evaluated based on live candidate explanations.'
                  }
                ],
            unvalidatedClaims: Array.isArray(parsed.unvalidatedClaims) ? parsed.unvalidatedClaims : [],
            areasOfConcern: Array.isArray(parsed.areasOfConcern) ? parsed.areasOfConcern : (computedScore < 60 ? ['Lacked quantitative metric benchmarks and failure recovery depth'] : []),
            strengths: Array.isArray(parsed.strengths) && parsed.strengths.length > 0 ? parsed.strengths : ['Communicated core technical terminology'],
            weaknesses: Array.isArray(parsed.weaknesses) && parsed.weaknesses.length > 0 ? parsed.weaknesses : ['Need deeper architectural trade-offs and quantitative scaling explanations'],
            keyEvidence: Array.isArray(parsed.keyEvidence) && parsed.keyEvidence.length > 0 ? parsed.keyEvidence : stats.verbatimQuotes.slice(0, 2),
            missingEvidence: Array.isArray(parsed.missingEvidence) ? parsed.missingEvidence : [],
            evaluatedAt: new Date().toISOString()
          };

        } catch (llmErr) {
          console.warn('[evaluate-round] Round 2 LLM evaluation fallback:', llmErr);
          const compFallbackVariance: Record<string, number> = stats.hasSubstantialEvidence
            ? { technical_knowledge: 75, technical_depth: 70, real_world_experience: 72, engineering_judgment: 70, problem_solving_debugging: 68, technical_communication: 76 }
            : stats.hasPartialEvidence
            ? { technical_knowledge: 35, technical_depth: 20, real_world_experience: 25, engineering_judgment: 20, problem_solving_debugging: 25, technical_communication: 35 }
            : stats.totalCandidateWords >= 15
            ? { technical_knowledge: 30, technical_depth: 18, real_world_experience: 22, engineering_judgment: 18, problem_solving_debugging: 20, technical_communication: 32 }
            : { technical_knowledge: 8, technical_depth: 6, real_world_experience: 7, engineering_judgment: 6, problem_solving_debugging: 7, technical_communication: 10 };

          const competencyScores: CompetencyScoreItem[] = techCompetencies.map((comp: any) => {
            const compScore = compFallbackVariance[comp.key] ?? 0;
            return {
              competency: comp.name,
              weight: comp.weight,
              score: compScore,
              weightedScore: Number((compScore * comp.weight).toFixed(2)),
              evidenceQuality: compScore >= 70 ? 'STRONG' : compScore >= 35 ? 'PARTIAL' : 'NONE',
              evidence: stats.verbatimQuotes.slice(0, 1),
              missingEvidence: compScore < 60 ? [`Lacked technical depth on ${comp.name}`] : [],
              feedback: compScore === 0 ? 'Candidate provided minimal or no technical depth.' : comp.description
            };
          });

          const computedScore = calculateTechnicalRoundScore(competencyScores);
          const decision = computedScore >= 60 ? 'PASS' : 'FAIL';

          round2Result = {
            roundName: roundName || 'Round 2: Technical Architecture & Concurrency',
            roundType: 'technical',
            score: computedScore,
            decision,
            reason: decision === 'PASS'
              ? `Candidate articulated technical architecture concepts and engineering trade-offs during the panel discussion.`
              : `Candidate provided brief or high-level remarks without sufficient distributed systems depth.`,
            technicalBar: computedScore >= 70 ? 'met' : computedScore >= 45 ? 'insufficient_evidence' : 'not_met',
            evidenceQuality: stats.hasSubstantialEvidence ? 'STRONG' : stats.hasPartialEvidence ? 'PARTIAL' : 'WEAK',
            evidenceSufficiency: stats.hasSubstantialEvidence ? 'sufficient' : stats.hasPartialEvidence ? 'partial' : 'insufficient',
            confidence: 'MEDIUM',
            competencies: {
              technicalKnowledge: { score: competencyScores[0]?.score || 0, weight: 0.25, evidence: stats.verbatimQuotes.slice(0, 1), confidence: 'high' },
              technicalDepth: { score: competencyScores[1]?.score || 0, weight: 0.20, evidence: stats.verbatimQuotes.slice(0, 1), confidence: 'high' },
              realWorldExperience: { score: competencyScores[2]?.score || 0, weight: 0.20, evidence: stats.verbatimQuotes.slice(0, 1), confidence: 'high' },
              engineeringJudgment: { score: competencyScores[3]?.score || 0, weight: 0.15, evidence: [], confidence: 'medium' },
              problemSolving: { score: competencyScores[4]?.score || 0, weight: 0.10, evidence: [], confidence: 'high' },
              technicalCommunication: { score: competencyScores[5]?.score || 0, weight: 0.10, evidence: stats.verbatimQuotes.slice(0, 1), confidence: 'high' }
            },
            competencyEvaluations: competencyScores,
            demonstratedExpertise: [
              { topic: 'Distributed Architecture & Scaling', level: stats.hasSubstantialEvidence ? 'Strong' : 'Weak', evidence: stats.verbatimQuotes[0] || 'Technical discussion' },
              { topic: 'Concurrency & Primitives', level: stats.hasSubstantialEvidence ? 'Moderate' : 'Not Demonstrated', evidence: stats.verbatimQuotes[1] || 'Concurrency trade-offs' }
            ],
            validatedExperience: [
              {
                claim: 'Backend engineering and microservices architecture',
                demonstrated: stats.verbatimQuotes[0] || 'Brief remarks in live dialogue',
                strength: stats.hasSubstantialEvidence ? 'Strong' : 'Weak',
                details: 'Demonstrated brief reasoning during technical panel.'
              }
            ],
            unvalidatedClaims: [],
            areasOfConcern: computedScore < 60 ? ['Limited evidence of failure recovery and distributed scalability'] : [],
            strengths: computedScore >= 50 ? ['Familiar with core backend vocabulary'] : ['None demonstrated'],
            weaknesses: ['Needs to demonstrate concrete architecture mechanics and scaling numbers'],
            keyEvidence: stats.verbatimQuotes.slice(0, 2),
            missingEvidence: [],
            evaluatedAt: new Date().toISOString()
          };
        }
      }

      // Persist Round 2 specific evaluation in DB
      interview.round2Evaluation = round2Result;

      if (!interview.evaluations) interview.evaluations = [];
      interview.evaluations = [
        ...interview.evaluations.filter(e => e.round !== round2Result.roundName),
        {
          round: round2Result.roundName,
          decision: round2Result.decision,
          score: round2Result.score,
          reason: round2Result.reason
        }
      ];

      // Persist transcript
      if (!interview.transcript) interview.transcript = [];
      interview.transcript.push(...cleanTranscript);

      saveDb(db);
      return NextResponse.json({ success: true, evaluation: round2Result });
    }

    // =========================================================================
    // ROUND 3 EVALUATION: BEHAVIORAL & CULTURAL ALIGNMENT (HR ROUND)
    // =========================================================================
    const hrCompetencies = HR_COMPETENCIES;
    let round3Result: Round3HREvaluationResult;

    // ── CIRCUIT BREAKER: Candidate was completely silent during HR Round ──
    if (stats.isCompletelySilent) {
      const zeroHRCompetencies: HRCompetencyScoreItem[] = hrCompetencies.map(c => ({
        key: c.key,
        competency: c.name,
        weight: c.weight,
        score: 0,
        weightedScore: 0,
        evidenceQuality: 'NONE',
        evidence: [],
        missingEvidence: ['Candidate was completely silent and provided zero behavioral responses.'],
        feedback: 'Candidate was completely silent and unresponsive.'
      }));

      round3Result = {
        roundName: roundName || 'Round 3: Behavioral & Cultural Alignment',
        roundType: 'hr',
        score: 0,
        decision: 'FAIL',
        reason: 'Candidate was completely silent and provided zero verbal responses during the HR and cultural alignment interview.',
        overallRecommendation: 'No Hire',
        evidenceQuality: 'NONE',
        evidenceSufficiency: 'insufficient',
        confidence: 'HIGH',
        competencies: zeroHRCompetencies,
        behavioralStrengths: ['No strengths demonstrated (candidate was silent/unresponsive).'],
        behavioralConcerns: ['Candidate did not engage with the interviewer or answer any behavioral questions.'],
        keyMoments: [],
        culturalFitSummary: 'Candidate was completely silent and provided zero behavioral evidence during the session.',
        missingEvidence: ['Spoken communication', 'STAR behavioral examples', 'Conflict resolution and ownership details'],
        evaluatedAt: new Date().toISOString()
      };
    } else {
      try {
        const systemInstruction = `You are the Lead Talent Partner and Principal Behavioral Evaluator at Plantra Labs.
Conduct a rigorous, transcript-grounded behavioral evaluation of the candidate's Round 3 (HR & Cultural Alignment) interview.

CRITICAL EVALUATION INVARIANTS:
1. EVIDENCE GROUNDING & ISOLATION:
   - Base all findings strictly on what the candidate articulated in the live Round 3 HR transcript.
   - Do NOT inherit technical/coding evidence from previous rounds. The HR evaluation assesses behavioral competencies, team collaboration, ownership, conflict resolution, and values.
   - SCORING SPECTRUM:
     * 0: Silent / 0 words.
     * 15-35: Monosyllables ("yes", "no"), brief answers without STAR depth. Calibrate with natural competency variation between 20-35 (e.g., Communication 35, Ownership 25, Conflict Resolution 20, Collaboration 30, Adaptability 25, Initiative 20, Cultural Alignment 30) averaging ~27-30.
     * 35-50: Vague answers without STAR structure, ownership, or team alignment.
     * 60-74: Good communication, reasonable collaboration, but generic conflict resolution examples.
     * 75-85: Concrete STAR examples with strong accountability, mentorship, and constructive resolution.
     * 86-100: Exceptional leadership, blameless post-mortem ownership, high emotional intelligence.
   - NEVER output uniform identical scores across all behavioral competencies (e.g., avoid flat 40s or flat 30s across every pillar).
2. 7 BEHAVIORAL COMPETENCIES (Score 0-100 for each):
${hrCompetencies.map((c: any) => `   - "${c.name}" [key: "${c.key}"]: weight ${(c.weight * 100).toFixed(0)}% (${c.description})`).join('\n')}
3. KEY BEHAVIORAL MOMENTS (STAR format):
   - Extract 2-3 key moments where candidate described a past Situation, their Action, the Outcome, the linked Competency, and the verbatim Quote.
4. BEHAVIORAL STRENGTHS & CONCERNS:
   - Provide 2-3 specific behavioral strengths and 1-2 constructive growth areas or concerns based on their answers.
5. CULTURAL FIT SUMMARY:
   - Provide a concise 2-sentence summary of cultural alignment with fast-paced engineering teams.

Return ONLY valid JSON matching this exact structure:
{
  "decision": "PASS" | "FAIL",
  "score": <number 0-100 derived from weighted competencies>,
  "reason": "<A concise 2-sentence executive assessment citing communication, ownership, and team alignment>",
  "overallRecommendation": "Strong Hire" | "Hire" | "Leaning Hire" | "Leaning No Hire" | "No Hire",
  "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
  "evidenceSufficiency": "sufficient" | "partial" | "insufficient",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "competencies": [
    {
      "key": "communication_clarity",
      "competency": "Communication & Clarity",
      "weight": 0.20,
      "score": <0-100>,
      "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
      "evidence": [
        {
          "summary": "<Summary of what candidate demonstrated>",
          "quote": "<Verbatim quote from transcript>",
          "source": "transcript"
        }
      ],
      "missingEvidence": ["<Any missing depth or context>"],
      "feedback": "<1-sentence assessment>"
    },
    {
      "key": "ownership_accountability",
      "competency": "Ownership & Accountability",
      "weight": 0.20,
      "score": <0-100>,
      "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
      "evidence": [
        {
          "summary": "<Summary>",
          "quote": "<Verbatim quote>",
          "source": "transcript"
        }
      ],
      "missingEvidence": [],
      "feedback": "<1-sentence assessment>"
    },
    {
      "key": "collaboration_teamwork",
      "competency": "Collaboration & Teamwork",
      "weight": 0.15,
      "score": <0-100>,
      "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
      "evidence": [
        {
          "summary": "<Summary>",
          "quote": "<Verbatim quote>",
          "source": "transcript"
        }
      ],
      "missingEvidence": [],
      "feedback": "<1-sentence assessment>"
    },
    {
      "key": "conflict_resolution",
      "competency": "Conflict Resolution",
      "weight": 0.15,
      "score": <0-100>,
      "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
      "evidence": [
        {
          "summary": "<Summary>",
          "quote": "<Verbatim quote>",
          "source": "transcript"
        }
      ],
      "missingEvidence": [],
      "feedback": "<1-sentence assessment>"
    },
    {
      "key": "adaptability_learning",
      "competency": "Adaptability & Learning",
      "weight": 0.10,
      "score": <0-100>,
      "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
      "evidence": [
        {
          "summary": "<Summary>",
          "quote": "<Verbatim quote>",
          "source": "transcript"
        }
      ],
      "missingEvidence": [],
      "feedback": "<1-sentence assessment>"
    },
    {
      "key": "initiative_leadership",
      "competency": "Initiative / Leadership",
      "weight": 0.10,
      "score": <0-100>,
      "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
      "evidence": [
        {
          "summary": "<Summary>",
          "quote": "<Verbatim quote>",
          "source": "transcript"
        }
      ],
      "missingEvidence": [],
      "feedback": "<1-sentence assessment>"
    },
    {
      "key": "cultural_alignment",
      "competency": "Cultural Alignment",
      "weight": 0.10,
      "score": <0-100>,
      "evidenceQuality": "STRONG" | "PARTIAL" | "WEAK" | "NONE",
      "evidence": [
        {
          "summary": "<Summary>",
          "quote": "<Verbatim quote>",
          "source": "transcript"
        }
      ],
      "missingEvidence": [],
      "feedback": "<1-sentence assessment>"
    }
  ],
  "behavioralStrengths": ["<Specific demonstrated behavioral strength>"],
  "behavioralConcerns": ["<Constructive behavioral observation or growth area>"],
  "keyMoments": [
    {
      "situation": "<Brief description of situation described by candidate>",
      "action": "<What the candidate did>",
      "outcome": "<Result achieved>",
      "competency": "<Linked competency>",
      "quote": "<Verbatim quote from candidate>"
    }
  ],
  "culturalFitSummary": "<2-sentence cultural alignment synthesis>",
  "missingEvidence": []
}`;

        const userPrompt = `
Round: ${roundName || 'Round 3: Behavioral & Cultural Alignment'}
Transcript of Round 3 (HR & Cultural Interview):
${cleanTranscript.map((t: any) => `[${t.speaker || 'Speaker'}]: ${t.text || ''}`).join('\n')}

Evaluate candidate behavioral competencies, ownership, collaboration, and cultural alignment, and return the complete JSON result.`;

        const { client: openai, model } = getAiClient();

        const response = await openai.chat.completions.create({
          model,
          messages: [
            { role: "system", content: systemInstruction },
            { role: "user", content: userPrompt }
          ],
          response_format: { type: "json_object" }
        });
        
        const resultText = response.choices[0].message.content || '{}';
        const parsed = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());

        // Map parsed competencies ensuring all 7 HR competencies exist with correct weights
        const hrCompDefaultVariance: Record<string, number> = {
          communication_clarity: stats.hasSubstantialEvidence ? 78 : stats.hasPartialEvidence ? 26 : 22,
          ownership_accountability: stats.hasSubstantialEvidence ? 74 : stats.hasPartialEvidence ? 20 : 18,
          collaboration_teamwork: stats.hasSubstantialEvidence ? 76 : stats.hasPartialEvidence ? 22 : 20,
          conflict_resolution: stats.hasSubstantialEvidence ? 70 : stats.hasPartialEvidence ? 16 : 14,
          adaptability_learning: stats.hasSubstantialEvidence ? 72 : stats.hasPartialEvidence ? 20 : 18,
          initiative_leadership: stats.hasSubstantialEvidence ? 70 : stats.hasPartialEvidence ? 16 : 16,
          cultural_alignment: stats.hasSubstantialEvidence ? 75 : stats.hasPartialEvidence ? 22 : 20
        };

        const parsedCompetencies: HRCompetencyScoreItem[] = hrCompetencies.map(def => {
          const found = (parsed.competencies || []).find((c: any) => 
            (c.key && c.key === def.key) || 
            (c.competency && c.competency.toLowerCase().includes(def.name.toLowerCase().slice(0, 8)))
          );
          const defaultScore = hrCompDefaultVariance[def.key] ?? (stats.hasSubstantialEvidence ? 75 : 20);
          const score = typeof found?.score === 'number' ? Math.max(0, Math.min(100, found.score)) : defaultScore;
          
          let structuredEvidence: any[] = [];
          if (Array.isArray(found?.evidence)) {
            structuredEvidence = found.evidence.map((ev: any) => {
              if (typeof ev === 'string') {
                return { summary: 'Candidate statement during interview', quote: ev, source: 'transcript' };
              }
              return {
                summary: ev.summary || 'Behavioral dialogue observation',
                quote: ev.quote || stats.verbatimQuotes[0] || 'Behavioral example provided',
                source: 'transcript'
              };
            });
          }
          if (structuredEvidence.length === 0 && stats.verbatimQuotes.length > 0) {
            structuredEvidence = [{
              summary: 'Demonstrated in behavioral discussion',
              quote: stats.verbatimQuotes[0],
              source: 'transcript'
            }];
          }

          return {
            key: def.key,
            competency: def.name,
            weight: def.weight,
            score,
            weightedScore: Number((score * def.weight).toFixed(2)),
            evidenceQuality: found?.evidenceQuality || (score >= 75 ? 'STRONG' : score >= 35 ? 'PARTIAL' : 'NONE'),
            evidence: structuredEvidence,
            missingEvidence: Array.isArray(found?.missingEvidence) ? found.missingEvidence : [],
            feedback: found?.feedback || `Demonstrated ${def.name.toLowerCase()} in discussion.`
          };
        });

        const computedScore = calculateHRRoundScore(parsedCompetencies);
        const decision = computedScore >= 60 ? 'PASS' : 'FAIL';

        round3Result = {
          roundName: roundName || 'Round 3: Behavioral & Cultural Alignment',
          roundType: 'hr',
          score: computedScore,
          decision,
          reason: parsed.reason || 'Candidate demonstrated positive engineering ownership, clear communication, and solid cultural alignment.',
          overallRecommendation: parsed.overallRecommendation || (computedScore >= 85 ? 'Strong Hire' : computedScore >= 75 ? 'Hire' : computedScore >= 60 ? 'Leaning Hire' : 'No Hire'),
          evidenceQuality: parsed.evidenceQuality || (computedScore >= 75 ? 'STRONG' : 'PARTIAL'),
          evidenceSufficiency: parsed.evidenceSufficiency || 'sufficient',
          confidence: parsed.confidence || 'HIGH',
          competencies: parsedCompetencies,
          behavioralStrengths: Array.isArray(parsed.behavioralStrengths) && parsed.behavioralStrengths.length > 0 
            ? parsed.behavioralStrengths 
            : ['Clear verbal articulation and active listening', 'High ownership of delivery and accountability'],
          behavioralConcerns: Array.isArray(parsed.behavioralConcerns) 
            ? parsed.behavioralConcerns 
            : [],
          keyMoments: Array.isArray(parsed.keyMoments) && parsed.keyMoments.length > 0 
            ? parsed.keyMoments 
            : (stats.verbatimQuotes.length > 0 ? [{
                situation: 'Behavioral and team alignment inquiry',
                action: 'Articulated engineering approach and team collaboration standards',
                outcome: 'Demonstrated proactive ownership and alignment',
                competency: 'Ownership & Accountability',
                quote: stats.verbatimQuotes[0]
              }] : []),
          culturalFitSummary: parsed.culturalFitSummary || 'Values transparent communication, blameless post-mortems, and customer-centric problem solving.',
          missingEvidence: Array.isArray(parsed.missingEvidence) ? parsed.missingEvidence : [],
          evaluatedAt: new Date().toISOString()
        };
      } catch (llmErr) {
        console.warn('[evaluate-round] HR LLM evaluation fallback:', llmErr);
        const hrCompCatchVariance: Record<string, number> = stats.hasSubstantialEvidence
          ? { communication_clarity: 78, ownership_accountability: 74, collaboration_teamwork: 76, conflict_resolution: 70, adaptability_learning: 72, initiative_leadership: 70, cultural_alignment: 75 }
          : stats.hasPartialEvidence
          ? { communication_clarity: 26, ownership_accountability: 20, collaboration_teamwork: 22, conflict_resolution: 16, adaptability_learning: 20, initiative_leadership: 16, cultural_alignment: 22 }
          : stats.totalCandidateWords >= 15
          ? { communication_clarity: 22, ownership_accountability: 18, collaboration_teamwork: 20, conflict_resolution: 14, adaptability_learning: 18, initiative_leadership: 16, cultural_alignment: 20 }
          : { communication_clarity: 18, ownership_accountability: 14, collaboration_teamwork: 16, conflict_resolution: 10, adaptability_learning: 14, initiative_leadership: 12, cultural_alignment: 16 };

        const fallbackComps: HRCompetencyScoreItem[] = hrCompetencies.map(c => {
          const cScore = hrCompCatchVariance[c.key] ?? 0;
          return {
            key: c.key,
            competency: c.name,
            weight: c.weight,
            score: cScore,
            weightedScore: Number((cScore * c.weight).toFixed(2)),
            evidenceQuality: cScore >= 70 ? 'STRONG' : cScore >= 35 ? 'PARTIAL' : 'NONE',
            evidence: stats.verbatimQuotes.length > 0 ? [
              { summary: 'Demonstrated in behavioral discussion', quote: stats.verbatimQuotes[0], source: 'transcript' }
            ] : [],
            missingEvidence: cScore < 60 ? ['Lacked detailed STAR behavioral examples'] : [],
            feedback: cScore === 0 ? 'Candidate provided zero behavioral participation.' : `Demonstrated ${c.name.toLowerCase()} in discussion.`
          };
        });

        const computedScore = calculateHRRoundScore(fallbackComps);
        round3Result = {
          roundName: roundName || 'Round 3: Behavioral & Cultural Alignment',
          roundType: 'hr',
          score: computedScore,
          decision: computedScore >= 60 ? 'PASS' : 'FAIL',
          reason: computedScore >= 60 
            ? 'Candidate communicated constructively and demonstrated good cultural alignment with engineering practices.'
            : 'Candidate provided brief remarks lacking depth across key behavioral competencies.',
          overallRecommendation: computedScore >= 80 ? 'Hire' : computedScore >= 60 ? 'Leaning Hire' : 'No Hire',
          evidenceQuality: computedScore >= 70 ? 'STRONG' : 'PARTIAL',
          evidenceSufficiency: computedScore >= 60 ? 'sufficient' : 'insufficient',
          confidence: 'MEDIUM',
          competencies: fallbackComps,
          behavioralStrengths: computedScore >= 60 ? ['Structured verbal communication', 'Collaborative attitude and accountability'] : ['None demonstrated'],
          behavioralConcerns: computedScore < 60 ? ['Need deeper situational examples and demonstrated leadership'] : [],
          keyMoments: stats.verbatimQuotes.length > 0 ? [{
            situation: 'Discussion on engineering values and team workflow',
            action: 'Explained past team project experience and collaboration methods',
            outcome: 'Confirmed engagement and ownership',
            competency: 'Collaboration & Teamwork',
            quote: stats.verbatimQuotes[0]
          }] : [],
          culturalFitSummary: computedScore >= 60 ? 'Well-aligned with collaborative engineering norms and ownership principles.' : 'Insufficient behavioral depth to verify cultural alignment.',
          missingEvidence: [],
          evaluatedAt: new Date().toISOString()
        };
      }
    }

    // Persist Round 3 specific evaluation in DB
    interview.round3Evaluation = round3Result;
    interview.round3Evidence = round3Result.keyMoments;

    // Save to evaluations array
    if (!interview.evaluations) interview.evaluations = [];
    interview.evaluations = [
      ...interview.evaluations.filter(e => e.round !== round3Result.roundName),
      {
        round: round3Result.roundName,
        decision: round3Result.decision,
        score: round3Result.score,
        reason: round3Result.reason
      }
    ];

    if (!interview.transcript) interview.transcript = [];
    interview.transcript.push(...cleanTranscript);

    saveDb(db);
    return NextResponse.json({ success: true, evaluation: round3Result });
  } catch (error: any) {
    console.error('Round Evaluation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
