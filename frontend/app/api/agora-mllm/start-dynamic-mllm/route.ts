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
      channel_name: customChannel 
    } = await req.json();
    
    const targetAgentUid = agent_uid ? Number(agent_uid) : 9999;
    const targetVoice = voice || 'Charon';
    const channelName = customChannel || `interview_${session_id.replace(/[^a-zA-Z0-9]/g, '_')}`.substring(0, 60);
    
    console.log(`[AGENT_START_REQUEST] session_id: ${session_id}, agent_uid: ${targetAgentUid}, voice: ${targetVoice}, channel: ${channelName}, timestamp: ${new Date().toISOString()}`);

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
    
    const agent = new Agent({ client }).withMllm(new GeminiLive({
      apiKey: geminiKey,
      model: 'gemini-3.1-flash-live-preview',
      voice: targetVoice,
      instructions: instructions,
      greetingMessage: greeting_message && greeting_message.trim() ? greeting_message.trim() : undefined,
      transcribeAgent: true,
      transcribeUser: true,
      inputModalities: ['audio'],
      outputModalities: ['audio']
    }));

    // Allow agents in a multi-agent panel to hear all participants (candidate + co-interviewer)
    const sessionObj = await agent.createSession({
      channel: channelName,
      agentUid: String(targetAgentUid),
      remoteUids: ["*"],
      token: agentToken
    });

    await sessionObj.start();

    console.log(`[AGENT_STARTED] session_id: ${session_id}, agent_id: ${sessionObj.id}, agent_uid: ${targetAgentUid}, timestamp: ${new Date().toISOString()}`);
    
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
