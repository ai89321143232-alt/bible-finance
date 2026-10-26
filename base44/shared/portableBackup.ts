// base44/shared/portableBackup.ts
// Переносимый бэкап ВСЕХ данных приложения (для переноса на другой сервер).
// Формат: { format, version, created_at, users: [...], entities: { Name: [records] } }
// Связи сохраняются через исходные id; при восстановлении id переназначаются.

export const PORTABLE_FORMAT = 'bible_finance_portable';
export const PORTABLE_VERSION = 1;

// Порядок важен только для удобства отчёта — связи переназначаются после создания всех записей.
export const PORTABLE_ENTITIES = [
  'Family', 'Workspace', 'WorkspaceMember', 'Account', 'Category', 'Budget', 'Goal',
  'Investment', 'InvestmentCashFlow', 'DebtAccount', 'Transaction', 'TransactionTemplate',
  'RecurringPayment', 'FixedAsset', 'ChildExpense', 'ChildGameProfile', 'UserGamification',
  'Task', 'Note', 'FamilyMessage', 'FamilyDecision', 'FamilyPractice', 'FinancialValue',
  'FinancialScenario', 'RecoveryPlan', 'GenerosityPlan', 'PromoCode',
  'LearningCourse', 'LearningModule', 'LearningLesson', 'LearningGroup', 'CourseAssignment',
  'LessonProgress', 'LessonAnswer', 'CourseCertificate',
];
// Не переносятся: TelegramBotConfig (токены бота), PushSubscription (ключи устройств), BackupRecord.

const SYSTEM_FIELDS = ['id', 'created_date', 'updated_date', 'created_by', 'created_by_id', 'is_sample'];
const SECRET_FIELD = /token|secret|password|api_key/i;
const USER_BUILTIN = ['id', 'email', 'full_name', 'role', 'created_date', 'updated_date', 'created_by',
  'created_by_id', 'app_id', 'disabled', 'is_verified', 'is_service', '_app_role', 'collaborator_role'];

function stripSecrets(obj) {
  const out = {};
  for (const [k, v] of Object.entries(obj)) if (!SECRET_FIELD.test(k)) out[k] = v;
  return out;
}

async function listAll(entity) {
  const all = [];
  let cursor;
  do {
    const page = await entity.list({ limit: 500, ...(cursor ? { cursor } : {}) });
    all.push(...(page.items || []));
    cursor = page.has_more ? page.next_cursor : null;
  } while (cursor);
  return all;
}

export async function buildPortableSnapshot(base44) {
  const entities = {};
  const counts = {};
  for (const name of PORTABLE_ENTITIES) {
    const records = (await listAll(base44.asServiceRole.entities[name])).map(stripSecrets);
    entities[name] = records;
    counts[name] = records.length;
  }
  const rawUsers = await base44.asServiceRole.entities.User.list();
  const users = rawUsers.map((u) => {
    const extra = {};
    for (const [k, v] of Object.entries(u)) if (!USER_BUILTIN.includes(k) && !SECRET_FIELD.test(k)) extra[k] = v;
    return { id: u.id, email: u.email, full_name: u.full_name, role: u.role, data: extra };
  });
  const total = Object.values(counts).reduce((a, b) => a + b, 0);
  return {
    content: { format: PORTABLE_FORMAT, version: PORTABLE_VERSION, created_at: new Date().toISOString(), users, entities },
    counts,
    total,
  };
}

export function validatePortable(data) {
  if (!data || data.format !== PORTABLE_FORMAT) return 'Файл не является бэкапом Bible Finance';
  if (data.version !== PORTABLE_VERSION) return 'Неподдерживаемая версия бэкапа';
  if (!data.entities || typeof data.entities !== 'object') return 'В файле нет данных';
  if (!Array.isArray(data.users)) return 'В файле нет списка пользователей';
  return null;
}

// Заменяет все строки, совпадающие со старыми id, на новые (в т.ч. в массивах и вложенных объектах)
function remap(value, idMap) {
  if (typeof value === 'string') return idMap[value] || value;
  if (Array.isArray(value)) return value.map((v) => remap(v, idMap));
  if (value && typeof value === 'object') {
    const out = {};
    for (const [k, v] of Object.entries(value)) out[k] = remap(v, idMap);
    return out;
  }
  return value;
}

function clean(record) {
  const out = { ...record };
  for (const f of SYSTEM_FIELDS) delete out[f];
  return out;
}

function chunk(arr, size) {
  const res = [];
  for (let i = 0; i < arr.length; i += size) res.push(arr.slice(i, i + size));
  return res;
}

export async function restorePortable(base44, data, adminId) {
  const report = { entities: {}, users: { matched: 0, unmatched: [] }, errors: [] };

  // 1. Сопоставляем пользователей по email
  const existing = await base44.asServiceRole.entities.User.list();
  const byEmail = Object.fromEntries(existing.map((u) => [String(u.email || '').toLowerCase(), u.id]));
  const idMap = {};
  const matchedUsers = [];
  for (const u of data.users) {
    const newId = byEmail[String(u.email || '').toLowerCase()];
    if (newId) { idMap[u.id] = newId; matchedUsers.push({ ...u, newId }); report.users.matched++; }
    else { idMap[u.id] = adminId; report.users.unmatched.push(u.email); }
  }

  // 2. Создаём записи и запоминаем соответствие старых и новых id
  const created = [];
  for (const name of PORTABLE_ENTITIES) {
    const records = Array.isArray(data.entities[name]) ? data.entities[name] : [];
    report.entities[name] = { total: records.length, restored: 0 };
    for (const part of chunk(records, 500)) {
      try {
        const res = await base44.asServiceRole.entities[name].bulkCreate(part.map(clean));
        const list = Array.isArray(res) ? res : (res?.records || res?.items || []);
        part.forEach((orig, i) => {
          const newId = list[i]?.id;
          if (!newId) return;
          if (orig.id) idMap[orig.id] = newId;
          created.push({ name, newId, orig });
        });
        report.entities[name].restored += list.length;
      } catch (e) {
        report.errors.push(`${name}: ${e.message}`);
      }
    }
  }

  // 3. Переназначаем связи (счета, бюджеты, семьи, пользователи) и владельцев
  const byEntity = {};
  for (const item of created) {
    const before = clean(item.orig);
    const after = remap(before, idMap);
    const patch = { id: item.newId, created_by_id: idMap[item.orig.created_by_id] || adminId };
    for (const k of Object.keys(after)) {
      if (JSON.stringify(after[k]) !== JSON.stringify(before[k])) patch[k] = after[k];
    }
    (byEntity[item.name] ||= []).push(patch);
  }
  for (const [name, patches] of Object.entries(byEntity)) {
    for (const part of chunk(patches, 500)) {
      try {
        await base44.asServiceRole.entities[name].bulkUpdate(part);
      } catch (e) {
        report.errors.push(`${name} (связи): ${e.message}`);
      }
    }
  }

  // 4. Восстанавливаем профили пользователей (семья, настройки)
  for (const u of matchedUsers) {
    const patch = remap(u.data || {}, idMap);
    if (Object.keys(patch).length === 0) continue;
    try {
      await base44.asServiceRole.entities.User.update(u.newId, patch);
    } catch (e) {
      report.errors.push(`Профиль ${u.email}: ${e.message}`);
    }
  }

  return report;
}