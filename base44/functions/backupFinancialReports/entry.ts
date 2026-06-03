import { createClientFromRequest } from 'npm:@base44/sdk@0.8.6';
import { jsPDF } from 'npm:jspdf@4.0.0';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (!user) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // Get financial data
    const [transactions, accounts, budgets, goals, investments] = await Promise.all([
      base44.entities.Transaction.list('-created_date', 1000),
      base44.entities.Account.list(),
      base44.entities.Budget.list(),
      base44.entities.Goal.list(),
      base44.entities.Investment.list()
    ]);

    // Generate PDF report
    const doc = new jsPDF();
    let yPosition = 20;
    const pageHeight = doc.internal.pageSize.height;
    const margin = 15;

    // Helper function to add new page if needed
    const checkNewPage = (height = 10) => {
      if (yPosition + height > pageHeight - margin) {
        doc.addPage();
        yPosition = margin;
      }
    };

    // Title
    doc.setFontSize(20);
    doc.text('Финансовый отчет', margin, yPosition);
    yPosition += 15;

    doc.setFontSize(10);
    doc.setTextColor(100);
    doc.text(`Дата создания: ${new Date().toLocaleDateString('ru-RU')}`, margin, yPosition);
    doc.text(`Пользователь: ${user.full_name} (${user.email})`, margin, yPosition + 5);
    yPosition += 15;

    // Summary
    const totalBalance = accounts.reduce((sum, acc) => sum + (acc.balance || 0), 0);
    const totalInvested = investments.reduce((sum, inv) => {
      const cost = (inv.quantity || 0) * (inv.purchase_price || 0);
      return sum + cost;
    }, 0);
    const totalGoalTarget = goals.reduce((sum, goal) => sum + (goal.target_amount || 0), 0);
    const totalGoalSaved = goals.reduce((sum, goal) => sum + (goal.current_amount || 0), 0);

    doc.setFontSize(14);
    doc.setTextColor(0);
    doc.text('Итоговая сводка', margin, yPosition);
    yPosition += 8;

    doc.setFontSize(11);
    const summaryData = [
      `Общий баланс счетов: ₽${totalBalance.toFixed(2)}`,
      `Инвестировано: ₽${totalInvested.toFixed(2)}`,
      `Цели - Собрано: ₽${totalGoalSaved.toFixed(2)} / Цель: ₽${totalGoalTarget.toFixed(2)}`
    ];

    summaryData.forEach(line => {
      checkNewPage();
      doc.text(line, margin, yPosition);
      yPosition += 6;
    });

    yPosition += 5;

    // Accounts
    if (accounts.length > 0) {
      checkNewPage(10);
      doc.setFontSize(14);
      doc.text('Счета', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      accounts.forEach(acc => {
        checkNewPage();
        doc.text(`${acc.name} (${acc.type}): ₽${acc.balance.toFixed(2)}`, margin + 5, yPosition);
        yPosition += 5;
      });

      yPosition += 3;
    }

    // Recent Transactions
    if (transactions.length > 0) {
      checkNewPage(10);
      doc.setFontSize(14);
      doc.text('Последние операции', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(9);
      transactions.slice(0, 20).forEach(txn => {
        checkNewPage();
        const date = new Date(txn.date).toLocaleDateString('ru-RU');
        const type = txn.type === 'income' ? '+' : txn.type === 'expense' ? '-' : '↔';
        doc.text(
          `${date} | ${txn.category} | ${type}₽${txn.amount.toFixed(2)} | ${txn.description || ''}`,
          margin + 5,
          yPosition,
          { maxWidth: 180 }
        );
        yPosition += 4;
      });

      yPosition += 3;
    }

    // Budgets
    if (budgets.length > 0) {
      checkNewPage(10);
      doc.setFontSize(14);
      doc.text('Бюджеты', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      budgets.forEach(budget => {
        checkNewPage();
        const progress = budget.limit_amount > 0 ? (budget.spent_amount / budget.limit_amount * 100).toFixed(1) : 0;
        doc.text(
          `${budget.name}: ₽${budget.spent_amount.toFixed(2)} / ₽${budget.limit_amount.toFixed(2)} (${progress}%)`,
          margin + 5,
          yPosition
        );
        yPosition += 5;
      });

      yPosition += 3;
    }

    // Goals
    if (goals.length > 0) {
      checkNewPage(10);
      doc.setFontSize(14);
      doc.text('Цели', margin, yPosition);
      yPosition += 8;

      doc.setFontSize(10);
      goals.forEach(goal => {
        checkNewPage();
        const progress = goal.target_amount > 0 ? (goal.current_amount / goal.target_amount * 100).toFixed(1) : 0;
        doc.text(
          `${goal.title}: ₽${goal.current_amount.toFixed(2)} / ₽${goal.target_amount.toFixed(2)} (${progress}%)`,
          margin + 5,
          yPosition
        );
        yPosition += 5;
      });
    }

    // Get PDF as base64
    const pdfData = doc.output('dataurlstring');
    const base64Data = pdfData.split(',')[1];

    // Get access token for Google Drive
    const accessToken = await base44.asServiceRole.connectors.getAccessToken('googledrive');

    // Create metadata
    const fileName = `FinancialReport_${new Date().toISOString().split('T')[0]}.pdf`;
    const metadata = {
      name: fileName,
      mimeType: 'application/pdf'
    };

    // Upload to Google Drive
    const uploadResponse = await fetch('https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${accessToken}`,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        metadata,
        content: base64Data
      })
    });

    if (!uploadResponse.ok) {
      const error = await uploadResponse.text();
      return Response.json({ error: 'Failed to upload to Google Drive: ' + error }, { status: 500 });
    }

    const result = await uploadResponse.json();

    return Response.json({
      success: true,
      message: 'Отчет успешно загружен в Google Drive',
      fileName,
      fileId: result.id,
      backupDate: new Date().toISOString()
    });
  } catch (error) {
    console.error('Backup error:', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});