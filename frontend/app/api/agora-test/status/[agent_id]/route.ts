import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest, { params }: { params: { agent_id: string } }) {
  try {
    const agent_id = params.agent_id;
    const appId = process.env.AGORA_APP_ID;
    const customerId = process.env.AGORA_CUSTOMER_ID;
    const customerSecret = process.env.AGORA_CUSTOMER_SECRET;

    if (!appId || !customerId || !customerSecret) {
      throw new Error("Missing required Agora environment variables");
    }

    const credentials = Buffer.from(`${customerId}:${customerSecret}`).toString('base64');

    const response = await fetch(`https://api.agora.io/v1/projects/${appId}/agents/${agent_id}`, {
      method: 'GET',
      headers: {
        'Authorization': `Basic ${credentials}`
      }
    });

    if (!response.ok) {
      throw new Error(`Agora Status Fetch Failed: ${response.status}`);
    }

    const agoraResp = await response.json();
    return NextResponse.json({ status: "ok", response: JSON.stringify(agoraResp) });
  } catch (error: any) {
    return NextResponse.json({ detail: error.message }, { status: 500 });
  }
}
