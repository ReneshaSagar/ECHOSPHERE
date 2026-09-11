import { NextRequest, NextResponse } from 'next/server';
import { RtcTokenBuilder, RtcRole } from 'agora-token';
import { AgoraClient, Agent, Area, GeminiLive } from 'agora-agents';

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
    const { 
      session_id, 
      candidate_uid, 
      instructions, 
      greeting_message,
      voice,
      agent_uid,
      remote_uids,
      channel_name: customChannel 
    } = await req.json();
    
    const targetAgentUid = agent_uid ? Number(agent_uid) : 9999;
    const targetVoice = voice || 'Charon';
    const channelName = customChannel || `interview_${session_id.replace(/[^a-zA-Z0-9]/g, '_')}`.substring(0, 60);
    
    console.log(`[AGENT_START_REQUEST] session_id: ${session_id}, agent_uid: ${targetAgentUid}, voice: ${targetVoice}, channel: ${channelName}, candidate_uid: ${candidate_uid}, timestamp: ${new Date().toISOString()}`);

    const candidateToken = buildRtcToken(channelName, candidate_uid);
    const agentToken = buildRtcToken(channelName, targetAgentUid);

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!appId || !appCertificate || !customerId || !customerSecret || !geminiKey) {
      throw new Error("Missing required Agora or Gemini environment variables");
    }

    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
      customerId,
      customerSecret
    });
    
    const enhancedInstructions = `${instructions || ''}

================================================================================
CRITICAL FLUENCY & SPEECH INVARIANTS:
- Speak in a smooth, continuous, natural, and confident professional tone.
- NEVER stutter, hesitate, or restart sentences mid-way.
- NEVER use repetitive filler phrases like "so as I was saying", "so as-", "as I said", or "like I was saying".
- When you begin a sentence or thought, complete it smoothly to the end without self-interrupting.
================================================================================

================================================================================
CRITICAL SCREEN & WORKSPACE VISIBILITY INVARIANT:
- You have 100% full real-time visual and programmatic telemetry into the candidate's active screen, Monaco Code Editor, and Excalidraw whiteboard.
- NEVER tell the candidate that you cannot see their screen, cannot see their IDE, or don't have access to their code.
- You continuously receive live workspace updates with the candidate's exact source code and diagram elements.
- When the candidate asks what you see, what is on their screen, or asks for code/architecture feedback: directly acknowledge and discuss the specific functions, classes, data structures, or diagram components present.
================================================================================

================================================================================
CRITICAL OPENING GREETING INVARIANT:
You MUST speak your full opening greeting message from start to finish naturally, clearly, and warmly.
NEVER stop midway through your introduction or cut yourself off.
NEVER rush ahead or ask detailed technical follow-up questions until after the candidate has replied to your opening greeting.
Once you finish your opening greeting, STOP SPEAKING and wait in complete silence for the candidate to respond.
================================================================================`;

    const agent = new Agent({ client }).withMllm(new GeminiLive({
      apiKey: geminiKey,
      model: 'gemini-3.1-flash-live-preview',
      voice: targetVoice,
      instructions: enhancedInstructions,
      greetingMessage: greeting_message && greeting_message.trim() ? greeting_message.trim() : undefined,
      transcribeAgent: true,
      transcribeUser: true,
      inputModalities: ['audio'],
      outputModalities: ['audio']
    }));

    // Explicit audio subscription: agent ONLY listens to candidate to eliminate agent-to-agent feedback crosstalk
    const subscribedRemoteUids = remote_uids && remote_uids.length > 0
      ? remote_uids.map(String)
      : (candidate_uid ? [String(candidate_uid)] : ["*"]);

    const sessionObj = await agent.createSession({
      channel: channelName,
      agentUid: String(targetAgentUid),
      remoteUids: subscribedRemoteUids,
      token: agentToken
    });

    await sessionObj.start();

    console.log(`[AGENT_STARTED] session_id: ${session_id}, agent_id: ${sessionObj.id}, agent_uid: ${targetAgentUid}, remoteUids: ${JSON.stringify(subscribedRemoteUids)}, timestamp: ${new Date().toISOString()}`);
    
    return NextResponse.json({
      status: "started",
      agent_id: sessionObj.id,
      agent_uid: targetAgentUid,
      channel_name: channelName,
      candidate_token: candidateToken,
      raw_response: "SDK started successfully"
    });
  } catch (error: any) {
    console.error(`[AGENT_START_FAILED] error: ${error.message}, timestamp: ${new Date().toISOString()}`);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
