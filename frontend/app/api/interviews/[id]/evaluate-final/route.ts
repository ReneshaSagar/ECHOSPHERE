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
    return !sp.includes('priya') && !sp.includes('arjun') && !sp.includes('sarah') && !sp.includes('interviewer') && !sp.includes('ai') && !sp.includes('system');
  });

  const totalCandidateWords = candidateUtterances.reduce((acc, t) => acc + (t.text || '').split(/\s+/).filter(Boolean).length, 0);
  
  const techPattern = /\b(api|array|async|await|batch|binary|buffer|cache|channel|cluster|complexity|concurrency|database|deadlock|dict|distributed|event|goroutine|grpc|hash|hashmap|http|index|json|kafka|latency|limiter|list|lock|log|map|memory|message|microservice|mutex|network|node|optimize|packet|partition|pipeline|pointer|postgres|process|proto|pubsub|query|queue|raft|rate|redis|replica|request|scale|server|service|set|sliding|socket|stream|sync|tcp|thread|throttle|throughput|timeout|transaction|tree|vector|webrtc|websocket|window)\b/gi;
  
  const verbatimQuotes: string[] = [];
  let substantiveCount = 0;
  let gibberishCount = 0;

  for (const u of candidateUtterances) {
    const txt = (u.text || '').trim();
    const words = txt.split(/\s+/).filter(Boolean);
    const techMatches = txt.match(techPattern) || [];

    if (words.length >= 7 && techMatches.length >= 1) {
      substantiveCount++;
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
    substantiveCount,
    gibberishCount,
    verbatimQuotes,
    hasSubstantialEvidence: substantiveCount >= 3 || (totalCandidateWords >= 50 && substantiveCount >= 2)
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
    const round1Eval = interview.round1Evaluation;
    const round2Eval = interview.round2Evaluation;
    const round3Eval = interview.round3Evaluation;

    // Prepare list of round scores for deterministic aggregation: Coding 35%, Technical 50%, HR 15%
    const roundsForAggregation: Array<{ roundName: string; roundType: string; score: number }> = [];

    if (round1Eval) {
      roundsForAggregation.push({
        roundName: round1Eval.roundName || 'Round 1: Coding & System Design Assessment',
        roundType: round1Eval.roundType || 'coding',
        score: round1Eval.score
      });
    } else {
      const r1 = existingEvaluations.find(e => 
        (e.round || '').toLowerCase().includes('coding') || 
        (e.round || '').toLowerCase().includes('round 1') ||
        (e.round || '').toLowerCase().includes('sliding')
      );
      if (r1) {
        roundsForAggregation.push({
          roundName: r1.round,
          roundType: 'coding',
          score: r1.score
        });
      }
    }

    // Technical Panel Round (Round 2)
    if (round2Eval) {
      roundsForAggregation.push({
        roundName: round2Eval.roundName || 'Round 2: Technical Interview Assessment',
        roundType: round2Eval.roundType || 'technical',
        score: round2Eval.score
      });
    } else {
      const r2 = existingEvaluations.find(e => 
        (e.round || '').toLowerCase().includes('technical') || 
        (e.round || '').toLowerCase().includes('round 2') ||
        (e.round || '').toLowerCase().includes('panel')
      );
      if (r2) {
        roundsForAggregation.push({
          roundName: r2.round,
          roundType: 'technical',
          score: r2.score
        });
      }
    }

    // HR Round (Round 3)
    if (round3Eval) {
      roundsForAggregation.push({
        roundName: round3Eval.roundName || 'Round 3: Behavioral & Cultural Alignment',
        roundType: round3Eval.roundType || 'hr',
        score: round3Eval.score
      });
    } else {
      const r3 = existingEvaluations.find(e => 
        (e.round || '').toLowerCase().includes('hr') || 
        (e.round || '').toLowerCase().includes('culture') ||
        (e.round || '').toLowerCase().includes('behavioral') ||
        (e.round || '').toLowerCase().includes('round 3')
      );
      if (r3) {
        roundsForAggregation.push({
          roundName: r3.round,
          roundType: 'hr',
          score: r3.score
        });
      }
    }

    // If no evaluations in array but evaluations exist, fall back to whatever evaluations are stored
    if (roundsForAggregation.length === 0 && existingEvaluations.length > 0) {
      existingEvaluations.forEach(e => {
        roundsForAggregation.push({
          roundName: e.round,
          roundType: e.round.toLowerCase().includes('hr') ? 'hr' : e.round.toLowerCase().includes('coding') ? 'coding' : 'technical',
          score: e.score
        });
      });
    }

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

    const stats = analyzeCandidateFullTranscript(transcript);
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
2. GROUNDED EVIDENCE:
   Quote verbatim candidate remarks and cite concrete workspace outcomes.
3. ADVISORY SIGNAL:
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

      let finalScore = scoreAggregation.finalScore > 0 ? scoreAggregation.finalScore : (typeof parsed.overallScore === 'number' ? parsed.overallScore : 70);
      let rec = parsed.overall_recommendation || scoreAggregation.recommendation;

      // Enforce zero for integrity violation or zero substantive words
      if (!stats.hasSubstantialEvidence && stats.substantiveCount === 0 && !round1Eval && !round2Eval && !round3Eval) {
        finalScore = 0;
        rec = 'No Hire';
        parsed.overall_summary = "Candidate provided no substantive technical answers or code during the evaluation, resulting in an automatic failure.";
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
              evidenceQuality: finalScore >= 75 ? "STRONG" : "PARTIAL",
              evidence: stats.verbatimQuotes.slice(0, 2),
              missingEvidence: [],
              confidence: "HIGH",
              feedback: "Evaluated across multi-round criteria."
            }))
      };

    } catch (llmErr) {
      console.warn('[evaluate-final] LLM evaluation fallback triggered:', llmErr);
      const finalScore = scoreAggregation.finalScore > 0 ? scoreAggregation.finalScore : (stats.hasSubstantialEvidence ? 78 : 35);
      const isHire = finalScore >= 75;

      scorecard = {
        overall_recommendation: scoreAggregation.recommendation || (isHire ? "Hire" : "Leaning Hire"),
        overallScore: finalScore,
        confidence: "MEDIUM",
        overall_summary: `Candidate completed the multi-round technical and practical assessment for ${job?.title || 'the role'} with a composite score of ${finalScore}/100.`,
        multiRoundBreakdown: scoreAggregation.rounds,
        scoringFormula: scoreAggregation.formula,
        round1Evaluation: round1Eval || null,
        round2Evaluation: round2Eval || null,
        round3Evaluation: round3Eval || null,
        strengths: [
          "Practical problem solving in workspace and clear algorithmic approach",
          "Collaborative communication during live technical panel",
          "Accountability and positive cultural fit"
        ],
        weaknesses: [
          "Could deepen quantitative benchmarking and metric tracking in system design"
        ],
        rubric_evaluations: Object.keys(rubric || {}).map(pillar => ({
          pillar,
          competencyScore: isHire ? 80 : 65,
          round: pillar.includes('Problem') ? 'Round 1: Coding' : pillar.includes('Architecture') || pillar.includes('Experience') ? 'Round 2: Technical' : pillar.includes('Ownership') || pillar.includes('Collaboration') ? 'Round 3: HR' : 'Cross-Round',
          evidenceQuality: isHire ? "STRONG" : "PARTIAL",
          evidence: stats.verbatimQuotes.slice(0, 2),
          missingEvidence: isHire ? [] : ["Detailed multi-region failover mechanics"],
          confidence: "MEDIUM",
          feedback: "Demonstrated practical knowledge in discussion and code."
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
