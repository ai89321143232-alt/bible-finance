import { createClientFromRequest } from 'npm:@base44/sdk@0.8.44';

const ENTITIES_WITH_USER_ID = [
  'Transaction', 'Account', 'Budget', 'Goal', 'Investment', 'InvestmentCashFlow',
  'RecurringPayment', 'DebtAccount', 'ChildExpense', 'PushSubscription',
  'TelegramBotConfig', 'UserGamification', 'ChildGameProfile', 'WorkspaceMember',
  'BackupRecord'
];

const ENTITIES_BY_CREATOR = [
  'Category', 'Note', 'Task', 'TransactionTemplate', 'FixedAsset'
];

export default async function(req: Request): Promise<Response> {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    await Promise.all(ENTITIES_WITH_USER_ID.map((entityName) =>
      base44.asServiceRole.entities[entityName].deleteMany({
        $or: [{ created_by_id: user.id }, { user_id: user.id }]
      })
    ));

    await Promise.all(ENTITIES_BY_CREATOR.map((entityName) =>
      base44.asServiceRole.entities[entityName].deleteMany({ created_by_id: user.id })
    ));

    await base44.asServiceRole.entities.User.delete(user.id);
    return Response.json({ success: true });
  } catch (error) {
    return Response.json({ error: error.message || 'Unable to delete account' }, { status: 500 });
  }
}