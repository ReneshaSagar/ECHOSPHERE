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
        const language = metadata?.language || 'typescript';
        const diagramSummary = metadata?.diagramSummary || metadata?.diagramText || '';
        const isExcalidraw = source === 'excalidraw';

        let formattedText = '';
        if (isExcalidraw) {
          formattedText = `[ACTIVE CANDIDATE SCREEN: SYSTEM DESIGN WHITEBOARD (EXCALIDRAW)]
Candidate is CURRENTLY VIEWING AND WORKING ON THE WHITEBOARD.
Activity: ${summary}
${diagramSummary ? `\nLive Architecture Diagram Components & Relationships:\n${diagramSummary}` : '\n(Canvas is currently empty or in progress)'}

[CRITICAL INTERVIEWER INSTRUCTION]:
You have 100% real-time visual telemetry of the candidate's whiteboard canvas.
If the candidate asks what is on their screen, if you can see their diagram, or asks for architecture feedback, YOU MUST discuss the whiteboard components (e.g. API Gateway, Services, Queues, Databases, Caches) and their connections from the diagram above. NEVER claim you cannot see their screen.`;
        } else {
          formattedText = `[ACTIVE CANDIDATE SCREEN: MONACO CODE EDITOR (${language.toUpperCase()})]
Candidate is CURRENTLY VIEWING AND CODING IN THE IDE.
Activity: ${summary}
${codeSnippet ? `\nCandidate Current IDE Source Code (${language}):\n\`\`\`${language}\n${codeSnippet.slice(0, 1500)}\n\`\`\`` : '\n(Code editor is currently empty)'}

[CRITICAL INTERVIEWER INSTRUCTION]:
You have 100% real-time visual telemetry of the candidate's Monaco Code Editor (${language}).
If the candidate asks what is on their screen, what you see, or asks for code feedback, YOU MUST directly quote and reference their exact source code constructs, algorithms, class definitions, and logic from the code snapshot above. NEVER claim you cannot see their screen or code.`;
        }

        await client.agentManagement.agentThink({
          appid: appId,
          agentId: agent_id,
          text: formattedText,
          on_listening_action: 'inject',
          on_thinking_action: 'append',
          on_speaking_action: 'append'
        });

        console.log(`[WORKSPACE_SYNC_AGENT_THINK_SUCCESS] Successfully injected workspace update (${isExcalidraw ? 'Excalidraw' : 'Code'}) to agent ${agent_id}`);
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
