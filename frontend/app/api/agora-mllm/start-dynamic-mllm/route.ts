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
    const { session_id, candidate_uid, instructions, greeting_message } = await req.json();
    
    const channelName = `interview_${session_id.replace(/[^a-zA-Z0-9]/g, '_')}`.substring(0, 60);
    const candidateToken = buildRtcToken(channelName, candidate_uid);
    const agentUid = 9999;
    const agentToken = buildRtcToken(channelName, agentUid);

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
      voice: 'Charon',
      instructions: instructions,
      greetingMessage: greeting_message,
      transcribeAgent: true,
      transcribeUser: true,
      inputModalities: ['audio'],
      outputModalities: ['audio']
    }));

    const sessionObj = await agent.createSession({
      channel: channelName,
      agentUid: String(agentUid),
      remoteUids: [String(candidate_uid)],
      token: agentToken
    });

    await sessionObj.start();

    // WARNING: In serverless (Next.js), the sessionObj cannot be persisted in memory easily.
    // If you need to stop it later, you will need to stop it via the Agora REST API directly
    // or by passing the agent_id to the REST API in stop-mllm/route.ts.
    
    return NextResponse.json({
      status: "started",
      agent_id: sessionObj.id,
      channel_name: channelName,
      candidate_token: candidateToken,
      raw_response: "SDK started successfully"
    });
  } catch (error: any) {
    console.error('Agora start error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
