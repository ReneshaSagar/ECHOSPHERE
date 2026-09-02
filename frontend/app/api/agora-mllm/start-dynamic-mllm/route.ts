import { NextRequest, NextResponse } from 'next/server';
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
    
    const channelName = `interview_${session_id.replace(/[^a-zA-Z0-9]/g, '_')}`.substring(0, 60);
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

    const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString('base64');

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

    const response = await fetch(`https://api.agora.io/v1/projects/${appId}/agents`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Basic ${credentials}`
      },
      body: JSON.stringify(agentPayload)
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agora API Error:", errorText);
      throw new Error(`Agora Agent Creation Failed: ${response.status} ${errorText}`);
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
