import { NextRequest, NextResponse } from 'next/server';
import { AgoraClient, Area } from 'agora-agents';

export async function POST(req: NextRequest) {
  try {
    const { session_id, agent_id } = await req.json();
    
    console.log(`[AGENT_STOP_REQUEST] session_id: ${session_id}, agent_id: ${agent_id}, timestamp: ${new Date().toISOString()}`);
    
    const appId = process.env.AGORA_APP_ID;
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

    if (!appId || !customerId || !customerSecret) {
      throw new Error("Missing required Agora environment variables");
    }

    if (!agent_id) {
      console.warn(`[AGENT_STOP_FAILED] No agent_id provided for session ${session_id}`);
      return NextResponse.json({ detail: "No agent_id provided" }, { status: 400 });
    }

    const client = new AgoraClient({
      area: Area.US,
      appId,
      customerId,
      customerSecret
    });

    await client.agents.stop({
      appid: appId,
      agentId: agent_id
    });

    console.log(`[AGENT_STOPPED] agent_id: ${agent_id}, timestamp: ${new Date().toISOString()}`);
    return NextResponse.json({ status: "stopped", agent_id });
  } catch (error: any) {
    console.error(`[AGENT_STOP_FAILED] error: ${error.message}`);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
