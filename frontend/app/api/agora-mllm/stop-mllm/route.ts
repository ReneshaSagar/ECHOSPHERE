import { NextRequest, NextResponse } from 'next/server';

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

    const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString('base64');

    const response = await fetch(`https://api.agora.io/v1/projects/${appId}/agents/${agent_id}`, {
      method: 'DELETE',
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      console.error("Agora API Delete Error:", errorText);
      throw new Error(`Failed to stop agent: ${response.status}`);
    }

    return NextResponse.json({ status: "stopped", agent_id });
  } catch (error: any) {
    console.error('Agora stop error:', error);
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
