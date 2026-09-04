import { NextRequest, NextResponse } from 'next/server';
import { AgoraClient, Area } from 'agora-agents';

export async function POST(req: NextRequest) {
  try {
    const { session_id, agent_id, agent_ids } = await req.json();
    
    const idsToStop: string[] = agent_ids && Array.isArray(agent_ids)
      ? agent_ids.filter(Boolean)
      : agent_id
        ? [agent_id]
        : [];

    console.log(`[AGENT_STOP_REQUEST] session_id: ${session_id}, agents: [${idsToStop.join(', ')}], timestamp: ${new Date().toISOString()}`);
    
    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

    if (!appId || !appCertificate || !customerId || !customerSecret) {
      throw new Error("Missing required Agora environment variables");
    }

    if (idsToStop.length === 0) {
      console.warn(`[AGENT_STOP_SKIPPED] No agent_id or agent_ids provided for session ${session_id}`);
      return NextResponse.json({ status: "no_agents_provided" });
    }

    const client = new AgoraClient({
      area: Area.US,
      appId,
      appCertificate,
      customerId,
      customerSecret
    });

    const stopped: string[] = [];
    for (const id of idsToStop) {
      try {
        await client.agents.stop({
          appid: appId,
          agentId: id
        });
        stopped.push(id);
        console.log(`[AGENT_STOPPED] agent_id: ${id}, timestamp: ${new Date().toISOString()}`);
      } catch (err: any) {
        console.warn(`[AGENT_STOP_WARN] Failed to stop agent ${id}: ${err.message}`);
      }
    }

    return NextResponse.json({ status: "stopped", stopped_agents: stopped });
  } catch (error: any) {
    console.error(`[AGENT_STOP_FAILED] error: ${error.message}`);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
