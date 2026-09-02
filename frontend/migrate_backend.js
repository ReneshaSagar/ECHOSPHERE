const fs = require('fs');
const path = require('path');

const apiDir = path.join(__dirname, 'app', 'api');

const filesToCreate = {
  'orchestrator/blueprint/route.ts': `import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const { job_description, resume } = await req.json();

    const systemInstruction = \`You are an expert AI Interview Orchestrator. 
Your job is to analyze a Job Description and a Candidate Resume, and design a technical interview blueprint.
You MUST return ONLY valid JSON matching this exact structure:

{
  "interview_rounds": [
    {
      "round_name": "Technical Interview",
      "purpose": "Evaluate technical skills and experience match",
      "interviewer": {
        "name": "Alex",
        "role": "Senior Software Engineer",
        "instructions": "<highly specific instructions for the LLM voice agent>",
        "greeting_message": "<the exact opening line Alex will speak>"
      },
      "topics": ["topic 1", "topic 2"]
    }
  ],
  "rubric": {
    "Problem Solving": "What to look for",
    "Technical Depth": "What to look for"
  }
}

The instructions for Alex MUST explicitly tell him to:
- speak naturally and concisely
- ask one question at a time and listen carefully
- ask relevant follow-up questions based on the candidate's answers
- avoid unnecessarily repeating questions
- stay within the scope of the provided JD and Resume
- use the candidate's resume and JD context naturally in conversation
- never reveal the evaluation rubric
- never give the candidate the answers
- maintain a professional interviewer personality

Keep the instructions highly contextual to the specific JD and Resume provided.\`;

    const userPrompt = \`Job Description:\\n\${job_description}\\n\\nCandidate Resume:\\n\${resume}\\n\\nGenerate the JSON Interview Blueprint.\`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(userPrompt);
    const blueprint = JSON.parse(result.response.text());
    
    return NextResponse.json(blueprint);
  } catch (error: any) {
    console.error('Orchestrator error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
`,

  'evaluator/evaluate/route.ts': `import { NextRequest, NextResponse } from 'next/server';
import { GoogleGenerativeAI } from '@google/generative-ai';

export async function POST(req: NextRequest) {
  try {
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || '');
    const { job_description, resume, rubric, transcript } = await req.json();

    const systemInstruction = \`You are an expert AI Technical Interview Evaluator.
Your job is to deeply analyze an interview transcript and evaluate the candidate's performance against the provided Job Description and Rubric.

You MUST return ONLY valid JSON matching this exact structure:

{
  "overall_recommendation": "Strong Hire | Hire | Leaning Hire | Leaning No Hire | No Hire",
  "overall_summary": "A concise 2-3 sentence summary of the candidate's performance.",
  "strengths": ["Key strength 1", "Key strength 2"],
  "weaknesses": ["Key weakness 1", "Key weakness 2"],
  "rubric_evaluations": [
    {
      "pillar": "Name of the rubric pillar",
      "score": 4, 
      "feedback": "Detailed feedback on why they received this score for this pillar.",
      "evidence": ["Exact quote from the candidate in the transcript demonstrating this."]
    }
  ]
}

Instructions:
1. Ensure the 'score' is an integer between 1 and 5.
2. Provide concrete 'evidence' quotes directly from the transcript to justify your scores.
3. Be objective, fair, and highly critical just like a real Senior Engineering Manager.\`;

    const formattedTranscript = transcript.map((t: any) => \`\${t.speaker}: \${t.text}\`).join("\\n");

    const userPrompt = \`
--- JOB DESCRIPTION ---
\${job_description}

--- CANDIDATE RESUME ---
\${resume}

--- EVALUATION RUBRIC ---
\${JSON.stringify(rubric, null, 2)}

--- INTERVIEW TRANSCRIPT ---
\${formattedTranscript}

Analyze the transcript and generate the JSON Scorecard.\`;

    const model = genAI.getGenerativeModel({
      model: "gemini-3.5-flash",
      systemInstruction,
      generationConfig: { responseMimeType: "application/json" },
    });

    const result = await model.generateContent(userPrompt);
    const scorecard = JSON.parse(result.response.text());
    
    return NextResponse.json(scorecard);
  } catch (error: any) {
    console.error('Evaluator error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
`,

  'agora-mllm/start-dynamic-mllm/route.ts': `import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';

function buildRtcToken(channelName: string, uid: number) {
  const appId = process.env.AGORA_APP_ID || '';
  const appCertificate = process.env.AGORA_APP_CERTIFICATE || '';
  const expirationTimeInSeconds = 3600;
  const currentTimestamp = Math.floor(Date.now() / 1000);
  const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

  if (!appId || !appCertificate) return "";
  
  return RtcTokenBuilder.buildTokenWithUid(
    appId, 
    appCertificate, 
    channelName, 
    uid, 
    RtcRole.PUBLISHER, 
    privilegeExpiredTs, 
    privilegeExpiredTs
  );
}

export async function POST(req: NextRequest) {
  try {
    const { session_id, candidate_uid, instructions, greeting_message } = await req.json();
    
    const channelName = \`interview_\${session_id.replace(/[^a-zA-Z0-9]/g, '_')}\`.substring(0, 60);
    const candidateToken = buildRtcToken(channelName, candidate_uid);
    const agentUid = 9999;
    const agentToken = buildRtcToken(channelName, agentUid);

    const appId = process.env.AGORA_APP_ID;
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!appId || !customerId || !customerSecret || !geminiKey) {
      throw new Error("Missing required Agora or Gemini environment variables");
    }

    const credentials = Buffer.from(\`\${customerId}:\${customerSecret}\`).toString('base64');

    const agentPayload = {
      "channel_name": channelName,
      "uid": agentUid,
      "channel_options": {
        "auto_subscribe_audio": true,
        "auto_subscribe_video": false
      },
      "agent_config": {
        "greeting_message": greeting_message,
        "prompt": instructions
      },
      "llm_config": {
        "provider": "google",
        "model": "gemini-3.1-flash-live-preview",
        "parameters": {
          "api_key": geminiKey,
          "temperature": 0.3
        }
      },
      "token": agentToken
    };

    const response = await fetch(\`https://api.agora.io/v1/projects/\${appId}/agents\`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': \`Basic \${credentials}\`
      },
      body: JSON.stringify(agentPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agora API Error:", errorText);
      throw new Error(\`Agora Agent Creation Failed: \${response.status} \${errorText}\`);
    }

    const agoraResp = await response.json();
    
    return NextResponse.json({
      status: "started",
      agent_id: agoraResp.agent_id,
      channel_name: channelName,
      candidate_token: candidateToken,
      raw_response: agoraResp
    });
  } catch (error: any) {
    console.error('Agora start error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
`,

  'agora-mllm/stop-mllm/route.ts': `import { NextRequest, NextResponse } from 'next/server';

export async function POST(req: NextRequest) {
  try {
    const { session_id, agent_id } = await req.json();
    
    const appId = process.env.AGORA_APP_ID;
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

    if (!appId || !customerId || !customerSecret) {
      throw new Error("Missing required Agora environment variables");
    }

    if (!agent_id) {
      return NextResponse.json({ detail: "No agent_id provided" }, { status: 400 });
    }

    const credentials = Buffer.from(\`\${customerId}:\${customerSecret}\`).toString('base64');

    const response = await fetch(\`https://api.agora.io/v1/projects/\${appId}/agents/\${agent_id}\`, {
      method: 'DELETE',
      headers: {
        'Authorization': \`Basic \${credentials}\`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agora API Delete Error:", errorText);
      throw new Error(\`Failed to stop agent: \${response.status}\`);
    }

    return NextResponse.json({ status: "stopped", agent_id });
  } catch (error: any) {
    console.error('Agora stop error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
`,

  'agora-test/health/route.ts': `import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({ status: 'ok', stack: 'nextjs' });
}
`,

  'agora-test/status/[agent_id]/route.ts': `import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { agent_id: string } }) {
  try {
    const agent_id = params.agent_id;
    const appId = process.env.AGORA_APP_ID;
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

    if (!appId || !customerId || !customerSecret) {
      throw new Error("Missing required Agora environment variables");
    }

    const credentials = Buffer.from(\`\${customerId}:\${customerSecret}\`).toString('base64');

    const response = await fetch(\`https://api.agora.io/v1/projects/\${appId}/agents/\${agent_id}\`, {
      method: 'GET',
      headers: {
        'Authorization': \`Basic \${credentials}\`
      }
    });

    if (!response.ok) {
      throw new Error(\`Agora Status Fetch Failed: \${response.status}\`);
    }

    const agoraResp = await response.json();
    return NextResponse.json({ status: "ok", response: JSON.stringify(agoraResp) });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
`
};

for (const [filePath, content] of Object.entries(filesToCreate)) {
  const fullPath = path.join(apiDir, filePath);
  const dir = path.dirname(fullPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  fs.writeFileSync(fullPath, content);
  console.log('Created:', fullPath);
}
console.log('Migration scripts created successfully!');
