import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { sendPushToUser } from '../../shared/webPush.ts';

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
      },
    });
  }

  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { user_id, title, body: messageBody, tag, data } = body;

    if (!user_id) {
      return Response.json({ error: 'user_id is required' }, { status: 400 });
    }

    const results = await sendPushToUser(base44, user_id, {
      title: title || 'Библия Финансов',
      body: messageBody || '',
      tag,
      data,
    });

    return Response.json({ results }, {
      headers: { 'Access-Control-Allow-Origin': '*' },
    });
  } catch (error) {
    console.error('sendWebPush error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});