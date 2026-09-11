import { NextRequest, NextResponse } from 'next/server';
import { getDb, saveDb, resolveInterview } from '@/lib/db';
import OpenAI from 'openai';
import {
  calculateFinalAggregateScore,
  FinalScoreAggregation
} from '@/lib/interview/scoringConfig';

/**
 * Heuristically analyzes candidate responses from full multi-round transcript.
 */
function analyzeCandidateFullTranscript(transcript: any[]) {
  const candidateUtterances = transcript.filter((t: any) => {
    const sp = (t.speaker || '').toLowerCase();
    return !sp.includes('priya') && 
           !sp.includes('arjun') && 
           !sp.includes('sarah') && 
           !sp.includes('vikram') && 
           !sp.includes('marcus') && 
           !sp.includes('elena') && 
           !sp.includes('interviewer') && 
           !sp.includes('ai') && 
           !sp.includes('system') && 
           !sp.includes('specialist') && 
           !sp.includes('lead') && 
           !sp.includes('panel') && 
           !sp.includes('proctor') && 
           !sp.includes('hr') && 
           !sp.includes('agent');
  });

  const totalCandidateWords = candidateUtterances.reduce((acc, t) => acc + (t.text || '').split(/\s+/).filter(Boolean).length, 0);
  const isCompletelySilent = candidateUtterances.length === 0 || totalCandidateWords === 0;
  const isVirtuallySilent = candidateUtterances.length <= 1 && totalCandidateWords <= 5;
  
  const techPattern = /\b(api|array|async|await|batch|binary|buffer|cache|channel|cluster|complexity|concurrency|database|deadlock|dict|distributed|event|goroutine|grpc|hash|hashmap|http|index|json|kafka|latency|limiter|list|lock|log|map|memory|message|microservice|mutex|network|node|optimize|packet|partition|pipeline|pointer|postgres|process|proto|pubsub|query|queue|raft|rate|redis|replica|request|scale|server|service|set|sliding|socket|stream|sync|tcp|thread|throttle|throughput|timeout|transaction|tree|vector|webrtc|websocket|window)\b/gi;
  const reasoningPattern = /\b(because|tradeoff|trade-off|latency|throughput|bottleneck|failure|failover|partition|replicate|consistent|isolated|asynchronous|concurrency|mutex|lock|deadlock|index|overhead|benchmark|complexity|o\(1\)|o\(n\)|distributed|handling|recovery|mitigate)\b/gi;

  const verbatimQuotes: string[] = [];
  let substantiveCount = 0;
  let vagueCount = 0;
  let gibberishCount = 0;

  for (const u of candidateUtterances) {
    const txt = (u.text || '').trim();
    const words = txt.split(/\s+/).filter(Boolean);
    const techMatches = txt.match(techPattern) || [];
    const reasoningMatches = txt.match(reasoningPattern) || [];

    // Substantive answer: at least 14+ words, mentions technical terms AND includes reasoning/trade-off markers
    if (words.length >= 14 && techMatches.length >= 1 && reasoningMatches.length >= 1) {
      substantiveCount++;
      const quote = txt.slice(0, 140) + (txt.length > 140 ? '...' : '');
      if (!verbatimQuotes.includes(quote)) {
        verbatimQuotes.push(quote);
      }
    } else if (words.length >= 6 && techMatches.length >= 1) {
      vagueCount++;
      const quote = txt.slice(0, 140) + (txt.length > 140 ? '...' : '');
      if (!verbatimQuotes.includes(quote)) {
        verbatimQuotes.push(quote);
      }
    } else if (words.length > 3 && techMatches.length === 0 && !/[a-zA-Z]{4,}/.test(txt)) {
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
    hasSubstantialEvidence: substantiveCount >= 2 && totalCandidateWords >= 50,
    hasPartialEvidence: (substantiveCount >= 1 || vagueCount >= 2) && totalCandidateWords >= 25
  };
}

export async function POST(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params;
    const interviewId = resolvedParams.id;
    
    let body: any = {};
    try {
      body = await req.json();
    } catch (e) {
      // Body is optional
    }

    const db = getDb();
    const interview = resolveInterview(db, interviewId);
    
    const application = db.applications.find(a => a.id === interview.applicationId);
    const candidate = db.candidates.find(c => c.id === application?.candidateId);
    const job = db.jobs.find(j => j.id === application?.jobId);
    const blueprint = db.blueprints.find(b => b.interviewId === interview.id || b.id === (interview as any).blueprintId);

    // Merge transcript from request body or DB
    const transcript = (body?.transcript && body.transcript.length > 0)
      ? body.transcript
      : (interview.transcript && interview.transcript.length > 0)
        ? interview.transcript
        : [];

    if (transcript.length > 0) {
      interview.transcript = transcript;
    }

    // Collect individual round results
    const existingEvaluations = interview.evaluations || [];
    let round1Eval = interview.round1Evaluation;
    let round2Eval = interview.round2Evaluation;
    let round3Eval = interview.round3Evaluation;

    const stats = analyzeCandidateFullTranscript(transcript);

    // Ensure Round 1 is always structured
    if (!round1Eval) {
      const r1 = existingEvaluations.find(e => 
        (e.round || '').toLowerCase().includes('coding') || 
        (e.round || '').toLowerCase().includes('round 1') ||
        (e.round || '').toLowerCase().includes('sliding')
      );
      const r1Score = r1 ? r1.score : (stats.isCompletelySilent ? 0 : stats.hasSubstantialEvidence ? 75 : stats.hasPartialEvidence ? 45 : 20);
      round1Eval = {
        roundName: r1?.round || 'Round 1: Practical Problem Solving & Codecraft',
        roundType: 'coding',
        score: r1Score,
        decision: r1Score >= 60 ? 'PASS' : 'FAIL',
        reason: r1?.reason || (r1Score >= 60 ? 'Candidate demonstrated algorithmic problem solving and system design in workspace.' : r1Score === 0 ? 'Candidate was completely silent and submitted zero code or architectural design in workspace.' : 'Insufficient practical implementation or algorithmic justification demonstrated in workspace.'),
        workspaceEvidence: interview.round1Evidence || null
      };
      interview.round1Evaluation = round1Eval;
    }

    // Ensure Round 2 is always structured
    if (!round2Eval) {
      const r2 = existingEvaluations.find(e => 
        (e.round || '').toLowerCase().includes('technical') || 
        (e.round || '').toLowerCase().includes('round 2') ||
        (e.round || '').toLowerCase().includes('panel')
      );
      const r2Score = r2 ? r2.score : (stats.isCompletelySilent ? 0 : stats.hasSubstantialEvidence ? 72 : stats.hasPartialEvidence ? 40 : 15);
      round2Eval = {
        roundName: r2?.round || 'Round 2: Technical Interview Assessment',
        roundType: 'technical',
        score: r2Score,
        decision: r2Score >= 60 ? 'PASS' : 'FAIL',
        technicalBar: r2Score >= 70 ? 'met' : r2Score >= 55 ? 'borderline' : 'not_met',
        summary: r2?.reason || (r2Score >= 60 ? 'Candidate addressed distributed systems architecture and concurrency fundamentals.' : r2Score === 0 ? 'Candidate was completely silent during technical panel inquiries.' : 'Candidate provided superficial or brief answers without architectural depth or trade-off analysis.'),
        reason: r2?.reason || (r2Score >= 60 ? 'Candidate addressed distributed systems architecture and concurrency fundamentals.' : r2Score === 0 ? 'Candidate was completely silent during technical panel inquiries.' : 'Candidate provided superficial or brief answers without architectural depth or trade-off analysis.')
      };
      interview.round2Evaluation = round2Eval;
    }

    // Ensure Round 3 is always structured
    if (!round3Eval) {
      const r3 = existingEvaluations.find(e => 
        (e.round || '').toLowerCase().includes('hr') || 
        (e.round || '').toLowerCase().includes('culture') ||
        (e.round || '').toLowerCase().includes('behavioral') ||
        (e.round || '').toLowerCase().includes('round 3')
      );
      const r3Score = r3 ? r3.score : (stats.isCompletelySilent ? 0 : stats.hasSubstantialEvidence ? 75 : stats.hasPartialEvidence ? 45 : 20);
      round3Eval = {
        roundName: r3?.round || 'Round 3: Behavioral & Cultural Alignment',
        roundType: 'hr',
        score: r3Score,
        decision: r3Score >= 60 ? 'PASS' : 'FAIL',
        overallRecommendation: r3Score >= 75 ? 'Hire' : r3Score >= 60 ? 'Leaning Hire' : 'No Hire',
        reason: r3?.reason || (r3Score >= 60 ? 'Candidate demonstrated engineering ownership, communication, and team alignment.' : r3Score === 0 ? 'Candidate was completely silent during HR behavioral inquiries.' : 'Candidate provided brief or high-level answers lacking specific behavioural examples or project ownership.')
      };
      interview.round3Evaluation = round3Eval;
    }

    // Prepare list of round scores for deterministic aggregation: Coding 35%, Technical 50%, HR 15%
    const roundsForAggregation: Array<{ roundName: string; roundType: string; score: number }> = [
      {
        roundName: round1Eval.roundName || 'Round 1: Practical Problem Solving & Codecraft',
        roundType: 'coding',
        score: round1Eval.score
      },
      {
        roundName: round2Eval.roundName || 'Round 2: Technical Interview Assessment',
        roundType: 'technical',
        score: round2Eval.score
      },
      {
        roundName: round3Eval.roundName || 'Round 3: Behavioral & Cultural Alignment',
        roundType: 'hr',
        score: round3Eval.score
      }
    ];

    // Compute central deterministic aggregated score
    const scoreAggregation: FinalScoreAggregation = calculateFinalAggregateScore(roundsForAggregation);

    let rubric = {
      "Problem Solving & Algorithm Craft": "Evaluates implementation correctness, data structures, and edge-case handling (Round 1: Coding 35%)",
      "Distributed Systems & Architecture": "Evaluates architectural trade-offs, scalability, and system decomposition (Round 2: Technical 50%)",
      "Real-World Engineering Experience": "Validates claimed projects, failure modes, and engineering judgment (Round 2: Technical 50%)",
      "Ownership & Accountability": "Evaluates taking responsibility for outcomes, initiative, and delivery (Round 3: HR 15%)",
      "Collaboration & Cultural Alignment": "Evaluates team empathy, constructive conflict resolution, and values alignment (Round 3: HR 15%)",
      "Communication & Articulation": "Evaluates clarity, structured thinking, and active listening across all rounds"
    };

    if (blueprint?.blueprintJson) {
      try {
        const bp = JSON.parse(blueprint.blueprintJson);
        if (bp.rubric) rubric = bp.rubric;
      } catch (e) {}
    }

    const integrityEvents = interview.suspiciousEvents || [];
    const hasIntegrityFlags = integrityEvents.length > 0;
    const proctoringSummary = hasIntegrityFlags 
      ? JSON.stringify(integrityEvents.map(e => ({ type: e.type, details: e.details, timestamp: e.timestamp })))
      : "No integrity flags detected.";

    let scorecard: any = null;

    try {
      const systemInstruction = `You are the Lead Hiring Partner and Chief Technical Proctor at Plantra Labs.
Synthesize the complete multi-round interview results into a final executive scorecard.

CRITICAL SYNTHESIS INSTRUCTIONS:
1. MULTI-ROUND EVALUATION SUMMARY:
   Synthesize evidence from all rounds:
   - Round 1 (Coding & System Design): 35% weight
   - Round 2 (Technical Panel): 50% weight
   - Round 3 (HR & Cultural Fit): 15% weight
2. ZERO-PARTICIPATION & SILENCE CIRCUIT BREAKER:
   - If candidate was completely silent (0 candidate words) or provided no answers across rounds and submitted no code, composite score MUST be 0 / 100 ("No Hire").
   - Never invent or hallucinate strengths or positive feedback if candidate was silent or submitted zero workspace code.
3. GROUNDED EVIDENCE & STRICT CALIBRATION:
   - Base all pillar ratings and overall recommendations strictly on substantiated proof (verbatim candidate quotes and concrete workspace outcomes).
   - DO NOT inflate scores for high-level buzzwords, 1-2 sentence hand-wavy answers, or unanswered questions.
   - If candidate was vague, brief, or skipped technical depth, score them strictly between 20-40 ("No Hire" or "Leaning No Hire").
   - Only award scores >= 70 when candidate provided deep architectural explanations, clear trade-off justification, or working code.
4. ADVISORY SIGNAL:
   Align with the calculated multi-round score: ${scoreAggregation.finalScore}/100.
   - 85+: Strong Hire
   - 75-84: Hire
   - 60-74: Leaning Hire
   - 45-59: Leaning No Hire
   - <45 or integrity disqualification: No Hire / Disqualified

Return ONLY valid JSON matching this exact structure:
{
  "overall_recommendation": "Strong Hire" | "Hire" | "Leaning Hire" | "Leaning No Hire" | "No Hire" | "Disqualified / No Hire",
  "confidence": "HIGH" | "MEDIUM" | "LOW",
  "overall_summary": "A concise, professional executive assessment synthesizing candidate performance across coding, technical architecture, and HR rounds.",
  "strengths": ["<Specific demonstrated technical or behavioral strength with evidence>"],
  "weaknesses": ["<Specific missing trade-off, lack of depth, or unverified claim>"],
  "rubric_evaluations": [
    {
      "pillar": "<Competency Name e.g. Problem Solving & Algorithms, Distributed Architecture, Engineering Judgment, Ownership & Accountability, Collaboration & Culture, Communication>",
      "competencyScore": <number 0-100>,
      "round": "Round 1: Coding" | "Round 2: Technical" | "Round 3: HR" | "Cross-Round",
      "evidenceQuality": "STRONG" | "PARTIAL" | "VAGUE" | "NONE",
      "evidence": ["<Verbatim candidate quote or code snippet>"],
      "missingEvidence": ["<Specific edge case or trade-off missed>"],
      "confidence": "HIGH",
      "feedback": "<1-2 sentence assessment>"
    }
  ]
}`;

      const formattedTranscript = transcript.length > 0 
        ? transcript.map((t: any) => `[${t.speaker || 'Speaker'}]: ${t.text || ''}`).join('\n')
        : "No transcript data captured. Candidate was silent or absent.";

      const prompt = `
Candidate Name: ${candidate?.name || 'Candidate'}
Job Title: ${job?.title || 'Senior Software Engineer'}
Job Description: ${job?.description || 'Build scalable software systems'}

Round Evaluations Breakdown:
${JSON.stringify(scoreAggregation.rounds, null, 2)}
Computed Multi-Round Aggregate Score: ${scoreAggregation.finalScore}/100 (${scoreAggregation.formula})

Round 1 Workspace Snapshot:
${round1Eval ? JSON.stringify({
  codeSnippet: round1Eval.workspaceEvidence?.code?.slice(0, 300),
  language: round1Eval.workspaceEvidence?.language,
  testResults: round1Eval.workspaceEvidence?.codeExecutionResults,
  score: round1Eval.score
}, null, 2) : 'No Round 1 workspace data'}

Round 2 Technical Assessment Snapshot:
${round2Eval ? JSON.stringify({
  technicalBar: round2Eval.technicalBar,
  demonstratedExpertise: round2Eval.demonstratedExpertise,
  competencies: round2Eval.competencies ? Object.entries(round2Eval.competencies).map(([k, v]: any) => ({ name: k, score: v.score, weight: v.weight })) : [],
  validatedExperience: round2Eval.validatedExperience,
  areasOfConcern: round2Eval.areasOfConcern,
  score: round2Eval.score
}, null, 2) : 'No Round 2 specific structured assessment'}

Round 3 Behavioral Assessment Snapshot:
${round3Eval ? JSON.stringify({
  overallRecommendation: round3Eval.overallRecommendation,
  competencies: round3Eval.competencies?.map((c: any) => ({ name: c.competency, score: c.score, weight: c.weight })),
  behavioralStrengths: round3Eval.behavioralStrengths,
  behavioralConcerns: round3Eval.behavioralConcerns,
  keyMoments: round3Eval.keyMoments,
  culturalFitSummary: round3Eval.culturalFitSummary,
  score: round3Eval.score
}, null, 2) : 'No Round 3 behavioral assessment'}

Proctoring / Integrity Log:
${proctoringSummary}

Full Multi-Round Transcript:
${formattedTranscript}

Generate the JSON Scorecard.`;

      const openai = new OpenAI({
        apiKey: process.env.GEMINI_DIRECT_API_KEY || process.env.REQUESTY_API_KEY || process.env.GEMINI_API_KEY || '',
        baseURL: 'https://router.requesty.ai/v1'
      });
      
      const response = await openai.chat.completions.create({
        model: "google/gemini-2.0-flash-exp",
        messages: [
          { role: "system", content: systemInstruction },
          { role: "user", content: prompt }
        ],
        response_format: { type: "json_object" }
      });
      
      const resultText = response.choices[0].message.content || '{}';
      const parsed = JSON.parse(resultText.replace(/```json/g, '').replace(/```/g, '').trim());

      let finalScore = scoreAggregation.finalScore;
      let rec = parsed.overall_recommendation || scoreAggregation.recommendation;

      const isCandidateSilent = stats.isCompletelySilent || (stats.totalCandidateWords === 0 && (round1Eval?.score === 0 || !round1Eval?.workspaceEvidence?.code));

      // ── CIRCUIT BREAKER: Zero Participation Candidate ──────────────────
      if (isCandidateSilent) {
        finalScore = 0;
        rec = 'No Hire';
        parsed.overall_summary = "Candidate was completely silent and provided zero verbal responses or code submissions during the multi-round evaluation, resulting in an automatic failure across all assessed competencies.";
        parsed.strengths = ["No strengths demonstrated (candidate was completely silent and unresponsive)."];
        parsed.weaknesses = [
          "Candidate did not answer any interviewer questions across Coding, Technical Panel, or HR rounds.",
          "Zero code or architectural designs submitted in workspace."
        ];
        parsed.rubric_evaluations = Object.keys(rubric).map(pillar => ({
          pillar,
          competencyScore: 0,
          round: pillar.includes('Problem') ? 'Round 1: Coding' : pillar.includes('Architecture') || pillar.includes('Experience') ? 'Round 2: Technical' : pillar.includes('Ownership') || pillar.includes('Collaboration') ? 'Round 3: HR' : 'Cross-Round',
          evidenceQuality: "NONE",
          evidence: [],
          missingEvidence: ["No verbal response or workspace code provided during evaluation."],
          confidence: "HIGH",
          feedback: "Candidate was silent and provided zero demonstrable evidence for this competency."
        }));
      } else if (!stats.hasSubstantialEvidence && stats.substantiveCount === 0 && (!round1Eval || round1Eval.score < 50) && (!round2Eval || round2Eval.score < 50) && (!round3Eval || round3Eval.score < 50)) {
        // Enforce low/failing score if candidate only gave vague buzzwords
        finalScore = Math.min(finalScore, 35);
        rec = 'No Hire';
        parsed.overall_summary = "Candidate provided minimal or high-level buzzword answers without demonstrated algorithmic depth, architecture trade-offs, or clear behavioral examples.";
        if (!parsed.strengths || parsed.strengths.length === 0 || (parsed.strengths.length === 1 && parsed.strengths[0].includes('Practical problem solving'))) {
          parsed.strengths = stats.vagueCount > 0 ? ["Mentioned high-level engineering terminology"] : ["Attended interview session"];
        }
      }

      scorecard = {
        overall_recommendation: rec,
        overallScore: finalScore,
        confidence: parsed.confidence || 'HIGH',
        overall_summary: parsed.overall_summary || `Candidate completed the multi-round assessment with a composite score of ${finalScore}/100.`,
        multiRoundBreakdown: scoreAggregation.rounds,
        scoringFormula: scoreAggregation.formula,
        round1Evaluation: round1Eval || null,
        round2Evaluation: round2Eval || null,
        round3Evaluation: round3Eval || null,
        strengths: Array.isArray(parsed.strengths) ? parsed.strengths : ["Structured problem solving and algorithmic reasoning", "Constructive behavioral alignment and ownership"],
        weaknesses: Array.isArray(parsed.weaknesses) ? parsed.weaknesses : ["Could deepen quantitative benchmarking in distributed systems"],
        rubric_evaluations: Array.isArray(parsed.rubric_evaluations) && parsed.rubric_evaluations.length > 0 
          ? parsed.rubric_evaluations 
          : Object.keys(rubric).map(pillar => ({
              pillar,
              competencyScore: finalScore,
              round: pillar.includes('Problem') ? 'Round 1: Coding' : pillar.includes('Architecture') || pillar.includes('Experience') ? 'Round 2: Technical' : pillar.includes('Ownership') || pillar.includes('Collaboration') ? 'Round 3: HR' : 'Cross-Round',
              evidenceQuality: finalScore >= 75 ? "STRONG" : finalScore >= 50 ? "PARTIAL" : "VAGUE",
              evidence: stats.verbatimQuotes.slice(0, 2),
              missingEvidence: finalScore >= 75 ? [] : ["Detailed trade-off analysis and architectural failure modes"],
              confidence: "HIGH",
              feedback: finalScore >= 60 ? "Evaluated across multi-round criteria." : "Candidate provided brief or high-level answers lacking technical depth."
            }))
      };

    } catch (llmErr) {
      console.warn('[evaluate-final] LLM evaluation fallback triggered:', llmErr);
      const isCandidateSilent = stats.isCompletelySilent || (stats.totalCandidateWords === 0 && (round1Eval?.score === 0 || !round1Eval?.workspaceEvidence?.code));
      const finalScore = isCandidateSilent ? 0 : (scoreAggregation.finalScore > 0 ? scoreAggregation.finalScore : (stats.hasSubstantialEvidence ? 75 : stats.hasPartialEvidence ? 40 : 20));
      const isHire = finalScore >= 75;
      const isPass = finalScore >= 60;

      scorecard = {
        overall_recommendation: isCandidateSilent ? "No Hire" : (scoreAggregation.recommendation || (isHire ? "Hire" : isPass ? "Leaning Hire" : "No Hire")),
        overallScore: finalScore,
        confidence: isCandidateSilent ? "HIGH" : "MEDIUM",
        overall_summary: isCandidateSilent
          ? "Candidate was completely silent and provided zero verbal responses or code submissions during the multi-round evaluation, resulting in an automatic failure across all assessed competencies."
          : isPass
            ? `Candidate completed the multi-round assessment for ${job?.title || 'the role'} with a composite score of ${finalScore}/100.`
            : `Candidate completed the multi-round assessment with a composite score of ${finalScore}/100. Responses were brief or superficial, failing to meet the bar for senior technical depth.`,
        multiRoundBreakdown: scoreAggregation.rounds,
        scoringFormula: scoreAggregation.formula,
        round1Evaluation: round1Eval || null,
        round2Evaluation: round2Eval || null,
        round3Evaluation: round3Eval || null,
        strengths: isCandidateSilent ? [
          "No strengths demonstrated (candidate was completely silent and unresponsive)."
        ] : isPass ? [
          "Practical problem solving in workspace and clear algorithmic approach",
          "Collaborative communication during live technical panel",
          "Accountability and positive cultural fit"
        ] : [
          "Familiarity with general high-level terminology and concepts"
        ],
        weaknesses: isCandidateSilent ? [
          "Candidate did not answer any interviewer questions across Coding, Technical Panel, or HR rounds.",
          "Zero code or architectural designs submitted in workspace."
        ] : isPass ? [
          "Could deepen quantitative benchmarking and metric tracking in system design"
        ] : [
          "Lacked concrete architectural trade-off justification and depth",
          "Superficial technical explanations without detailed failure mode handling",
          "Workspace implementation was incomplete or unverified"
        ],
        rubric_evaluations: Object.keys(rubric || {}).map(pillar => ({
          pillar,
          competencyScore: isCandidateSilent ? 0 : finalScore,
          round: pillar.includes('Problem') ? 'Round 1: Coding' : pillar.includes('Architecture') || pillar.includes('Experience') ? 'Round 2: Technical' : pillar.includes('Ownership') || pillar.includes('Collaboration') ? 'Round 3: HR' : 'Cross-Round',
          evidenceQuality: isCandidateSilent ? "NONE" : isHire ? "STRONG" : isPass ? "PARTIAL" : "VAGUE",
          evidence: isCandidateSilent ? [] : stats.verbatimQuotes.slice(0, 2),
          missingEvidence: isCandidateSilent ? ["No verbal response or workspace code provided during evaluation."] : isHire ? [] : ["Detailed multi-region failover mechanics and concurrency trade-offs"],
          confidence: isCandidateSilent ? "HIGH" : "MEDIUM",
          feedback: isCandidateSilent ? "Candidate was silent and did not demonstrate this competency." : isPass ? "Demonstrated practical knowledge in discussion and code." : "Candidate provided brief or high-level answers lacking architectural depth."
        }))
      };
    }

    // Save scorecard and update interview status
    interview.scorecard = scorecard;
    interview.status = 'COMPLETED';
    (interview as any).completedAt = new Date().toISOString();

    // Update application pipeline record
    if (application) {
      const rec = scorecard.overall_recommendation || 'Hire';
      const score = scorecard.overallScore ?? 75;

      application.status = 'UNDER_REVIEW';
      application.evaluationScore = score;
      application.evaluationSummary = scorecard.overall_summary || 'Autonomous multi-round practical coding, technical panel, and HR evaluation completed.';
      application.decisionStage = 'PENDING_HIRING_DECISION';
      application.decisionReason = `Multi-round assessment concluded with composite evaluation score ${score}/100. Scorecard synthesized for human hiring committee review.`;
    }

    saveDb(db);
    return NextResponse.json({ success: true, scorecard });
  } catch (error: any) {
    console.error('Final Evaluation error:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
