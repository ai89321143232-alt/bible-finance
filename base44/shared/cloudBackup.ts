// base44/shared/cloudBackup.ts
// Общая логика резервного копирования в Google Drive (shared connector)
// Бэкапы хранятся в папке bible_finance_<userId> на общем Drive

export const BACKUP_ENTITIES = [
  { name: 'Transaction', key: 'transactions', label: 'Транзакции', userField: 'user_id' },
  { name: 'Account', key: 'accounts', label: 'Счета', userField: 'user_id' },
  { name: 'Budget', key: 'budgets', label: 'Бюджеты', userField: 'user_id' },
  { name: 'Goal', key: 'goals', label: 'Цели', userField: 'user_id' },
  { name: 'Investment', key: 'investments', label: 'Инвестиции', userField: 'user_id' },
  { name: 'DebtAccount', key: 'debts', label: 'Долги', userField: 'user_id' },
  { name: 'RecurringPayment', key: 'subscriptions', label: 'Подписки', userField: 'user_id' },
  { name: 'Category', key: 'categories', label: 'Категории', userField: 'created_by_id' },
  { name: 'FixedAsset', key: 'fixed_assets', label: 'Активы', userField: 'created_by_id' },
  { name: 'Task', key: 'tasks', label: 'Задачи', userField: 'created_by_id' },
];

export async function collectSnapshot(base44, userId) {
  const snapshot = {};
  const summary = {};
  for (const entity of BACKUP_ENTITIES) {
    const records = await base44.asServiceRole.entities[entity.name].filter(
      { [entity.userField]: userId }
    );
    snapshot[entity.key] = records;
    summary[entity.key] = records.length;
  }
  return { snapshot, summary };
}

export async function getOrCreateDriveFolder(accessToken, folderName) {
  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${encodeURIComponent(
      `name='${folderName}' and mimeType='application/vnd.google-apps.folder' and trashed=false`
    )}&fields=files(id,name)`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files?fields=id,name', {
    method: 'POST',
    headers: { Authorization: `Bearer ${accessToken}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ name: folderName, mimeType: 'application/vnd.google-apps.folder' }),
  });
  const createData = await createRes.json();
  if (!createData.id) throw new Error('Folder creation failed: ' + JSON.stringify(createData));
  return createData.id;
}

export async function uploadBackupFile(accessToken, folderId, fileName, content) {
  const boundary = 'backup_boundary_' + Date.now();
  const metadata = { name: fileName, parents: [folderId] };
  const body =
    `--${boundary}\r\n` +
    `Content-Type: application/json; charset=UTF-8\r\n\r\n` +
    `${JSON.stringify(metadata)}\r\n` +
    `--${boundary}\r\n` +
    `Content-Type: application/json\r\n\r\n` +
    `${content}\r\n` +
    `--${boundary}--`;

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': `multipart/related; boundary=${boundary}`,
      },
      body,
    }
  );
  const data = await res.json();
  if (!data.id) throw new Error('Upload failed: ' + JSON.stringify(data));
  return data;
}

export async function downloadBackupFile(accessToken, fileId) {
  const res = await fetch(
    `https://www.googleapis.com/drive/v3/files/${fileId}?alt=media`,
    { headers: { Authorization: `Bearer ${accessToken}` } }
  );
  if (!res.ok) throw new Error(`Download failed: ${res.status}`);
  return await res.text();
}

export async function deleteDriveFile(accessToken, fileId) {
  await fetch(`https://www.googleapis.com/drive/v3/files/${fileId}`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
}

export function computeChecksum(content) {
  let hash = 0;
  for (let i = 0; i < content.length; i++) {
    hash = (hash << 5) - hash + content.charCodeAt(i);
    hash = hash & hash;
  }
  return Math.abs(hash).toString(16);
}

export async function backupUser(base44, userId, isPreRestore = false) {
  const { accessToken } = await base44.asServiceRole.connectors.getConnection('googledrive');

  const { snapshot, summary } = await collectSnapshot(base44, userId);
  const totalRecords = Object.values(summary).reduce((a, b) => a + b, 0);
  if (totalRecords === 0) return { skipped: true, reason: 'no_data', summary };

  const folderName = `bible_finance_${userId}`;
  const folderId = await getOrCreateDriveFolder(accessToken, folderName);

  const now = new Date();
  const prefix = isPreRestore ? 'PreRestore' : 'FinanceBackup';
  const fileName = `${prefix}_${now.toISOString().split('T')[0]}_${now.getTime()}.json`;
  const content = JSON.stringify(
    {
      metadata: {
        date: now.toISOString(),
        userId,
        type: isPreRestore ? 'pre_restore' : 'scheduled',
      },
      data: snapshot,
    },
    null,
    2
  );

  const file = await uploadBackupFile(accessToken, folderId, fileName, content);

  const record = await base44.asServiceRole.entities.BackupRecord.create({
    provider: 'googledrive',
    file_id: file.id,
    file_name: fileName,
    backup_date: now.toISOString(),
    checksum: computeChecksum(content),
    summary,
    is_pre_restore: isPreRestore,
    user_id: userId,
  });

  return { skipped: false, record, summary };
}