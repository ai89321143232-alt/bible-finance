import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const budgets = await base44.entities.Budget.list();
    
    const summary = {
      date: new Date().toISOString(),
      user_email: user.email,
      budgets: budgets.map(b => ({
        name: b.name,
        limit: b.limit_amount,
        spent: b.spent_amount,
        percentage: b.limit_amount > 0 ? Math.round((b.spent_amount / b.limit_amount) * 100) : 0,
        period: b.period,
        status: b.spent_amount > b.limit_amount ? 'exceeded' : b.spent_amount / b.limit_amount > 0.8 ? 'warning' : 'ok'
      })),
      total_limit: budgets.reduce((sum, b) => sum + (b.limit_amount || 0), 0),
      total_spent: budgets.reduce((sum, b) => sum + (b.spent_amount || 0), 0)
    };

    const fileName = `BudgetSummary_${new Date().toISOString().split('T')[0]}.json`;
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    const formData = new FormData();
    formData.append('file', new Blob([JSON.stringify(summary, null, 2)], { type: 'application/json' }), fileName);

    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`
      },
      body: formData
    });

    if (!uploadResponse.ok) {
      throw new Error(`Google Drive upload failed: ${uploadResponse.statusText}`);
    }

    const result = await uploadResponse.json();

    return Response.json({
      success: true,
      fileName,
      fileId: result.id,
      summary
    });
  } catch (error) {
    console.error('Budget summary error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});