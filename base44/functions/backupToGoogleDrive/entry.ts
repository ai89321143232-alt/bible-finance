import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Получаем все финансовые данные
    const [transactions, accounts, budgets, goals, investments] = await Promise.all([
      base44.entities.Transaction.list(),
      base44.entities.Account.list(),
      base44.entities.Budget.list(),
      base44.entities.Goal.list(),
      base44.entities.Investment.list()
    ]);

    // Формируем отчет
    const backupData = {
      backup_date: new Date().toISOString(),
      user_email: user.email,
      summary: {
        total_transactions: transactions.length,
        total_accounts: accounts.length,
        total_budgets: budgets.length,
        total_goals: goals.length,
        total_investments: investments.length
      },
      data: {
        transactions: transactions.map(t => ({
          ...t,
          created_by: undefined // Remove sensitive data
        })),
        accounts: accounts.map(a => ({
          ...a,
          created_by: undefined
        })),
        budgets: budgets.map(b => ({
          ...b,
          created_by: undefined
        })),
        goals: goals.map(g => ({
          ...g,
          created_by: undefined
        })),
        investments: investments.map(i => ({
          ...i,
          created_by: undefined
        }))
      }
    };

    // Преобразуем в JSON
    const jsonContent = JSON.stringify(backupData, null, 2);
    const fileName = `FinanceBackup_${new Date().toISOString().split('T')[0]}_${Math.random().toString(36).substring(7)}.json`;

    // Получаем токен Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Загружаем в Google Drive
    const formData = new FormData();
    formData.append('file', new Blob([jsonContent], { type: 'application/json' }), fileName);

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

    const uploadedFile = await uploadResponse.json();

    return Response.json({
      success: true,
      message: 'Резервная копия загружена в Google Drive',
      backup_info: {
        file_id: uploadedFile.id,
        file_name: fileName,
        backup_date: backupData.backup_date,
        summary: backupData.summary
      }
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});