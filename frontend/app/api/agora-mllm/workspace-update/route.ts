import { NextRequest, NextResponse } from 'next/server';
import { AgoraClient, Area } from 'agora-agents';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { 
      session_id, 
      candidate_uid, 
      agent_uid, 
      agent_id, 
      event_type, 
      summary, 
      source, 
      metadata, 
      timestamp 
    } = body;

    console.log(`[WORKSPACE_REALTIME_SYNC] session_id: ${session_id}, agent_id: ${agent_id || 'none'}, agent_uid: ${agent_uid}, event: ${event_type}, summary: "${summary}", timestamp: ${new Date(timestamp || Date.now()).toISOString()}`);

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

    if (agent_id && appId && appCertificate && customerId && customerSecret) {
      try {
        const client = new AgoraClient({
          area: Area.US,
          appId,
          appCertificate,
          customerId,
          customerSecret
        });

        const codeSnippet = metadata?.code || metadata?.fullCode || '';
        const language = metadata?.language || 'code';

        let formattedText = `[REAL-TIME WORKSPACE OBSERVATION] Candidate activity (${source || 'IDE'}): ${summary}`;
        if (codeSnippet) {
          formattedText += `\n\nCandidate Current IDE Source Code (${language}):\n\`\`\`${language}\n${codeSnippet.slice(0, 1500)}\n\`\`\``;
        }
        formattedText += `\n\n[SYSTEM INSTRUCTION FOR INTERVIEWER]: The candidate's live IDE screen content above is updated in real-time. If the candidate asks what is on their screen, what you see, or asks for code feedback, YOU MUST QUOTE line numbers or code constructs from the source code above and discuss their specific implementation.`;

        await client.agentManagement.agentThink({
          appid: appId,
          agentId: agent_id,
          text: formattedText,
          on_listening_action: 'inject',
          on_thinking_action: 'append',
          on_speaking_action: 'append'
        });

        console.log(`[WORKSPACE_SYNC_AGENT_THINK_SUCCESS] Successfully injected workspace update to agent ${agent_id}`);
      } catch (thinkErr: any) {
        console.warn(`[WORKSPACE_SYNC_AGENT_THINK_WARN] agentThink call failed:`, thinkErr?.message || thinkErr);
      }
    } else {
      if (!agent_id) {
        console.log('[WORKSPACE_REALTIME_SYNC] No agent_id provided in body, skipped agentThink injection');
      }
    }

    return NextResponse.json({
      status: 'synced',
      event_type,
      summary,
      timestamp: timestamp || Date.now()
    });
  } catch (err: any) {
    console.error('[WORKSPACE_SYNC_ERROR]', err);
    return NextResponse.json({ error: err.message || 'Failed to sync workspace update' }, { status: 500 });
  }
}
