import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.109.0';

// ============================================================
// supabaseData — прокси для CRUD-операций в Supabase через service_role ключ.
// service_role ключ обходит RLS, поэтому используется ТОЛЬКО здесь (бэкенд),
// никогда во фронтенд-коде.
// Payload: { table, operation, id?, data?, dataArray?, filterQuery?, sort?, limit? }
// operation: "list" | "filter" | "get" | "create" | "bulkCreate" | "update" | "delete"
// ============================================================

const ALLOWED_TABLES = ['transactions', 'accounts', 'budgets', 'goals', 'investments', 'categories'];

// Таблицы, в которых есть колонка user_id для изоляции по пользователю
const TABLES_WITH_USER_ID = ['transactions', 'accounts', 'budgets', 'goals', 'investments'];
// Таблицы, в которых есть колонка family_id для изоляции по семье
const TABLES_WITH_FAMILY_ID = ['transactions', 'accounts', 'budgets', 'goals', 'investments'];

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const isAdmin = user.role === 'admin';
    const userId = user.id;
    const familyId = user.data?.family_id || null;

    const { table, operation, id, data, dataArray, filterQuery, sort, limit } = await req.json();
    if (!table || !operation) {
      return Response.json({ error: 'Missing table or operation' }, { status: 400 });
    }
    if (!ALLOWED_TABLES.includes(table)) {
      return Response.json({ error: 'Table not allowed' }, { status: 403 });
    }

    const supabase = createClient(
      'https://bniqnepyvqamsxcujsji.supabase.co',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
    );

    const applySort = (query, sortParam) => {
      if (!sortParam) return query;
      const isDesc = sortParam.startsWith('-');
      const column = isDesc ? sortParam.slice(1) : sortParam;
      return query.order(column, { ascending: !isDesc });
    };

    // Применяет фильтр изоляции: пользователь видит только свои записи или записи своей семьи
    const applyIsolation = (query) => {
      if (isAdmin) return query; // админ видит всё
      if (TABLES_WITH_USER_ID.includes(table)) {
        return query.or(`user_id.eq.${userId},created_by_id.eq.${userId}`);
      }
      return query;
    };

    // Проверка владения записью перед update/delete
    const checkOwnership = async (recordId) => {
      if (isAdmin) return true;
      const { data: row, error } = await supabase
        .from(table)
        .select('user_id, created_by_id, family_id')
        .eq('id', recordId)
        .maybeSingle();
      if (error) throw error;
      if (!row) return false;
      const isOwner = row.user_id === userId || row.created_by_id === userId;
      const isFamilyMember = familyId && row.family_id === familyId;
      return isOwner || isFamilyMember;
    };

    let result;

    if (operation === 'list') {
      let query = supabase.from(table).select('*');
      query = applyIsolation(query);
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data: rows, error } = await query;
      if (error) throw error;
      result = rows;
    } else if (operation === 'filter') {
      let query = supabase.from(table).select('*');
      // Применяем пользовательский фильтр
      Object.entries(filterQuery || {}).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      // Поверх пользовательского фильтра — изоляция
      query = applyIsolation(query);
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data: rows, error } = await query;
      if (error) throw error;
      result = rows;
    } else if (operation === 'get') {
      let query = supabase.from(table).select('*').eq('id', id);
      if (!isAdmin) {
        const hasAccess = await checkOwnership(id);
        if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });
      }
      const { data: row, error } = await query.maybeSingle();
      if (error) throw error;
      result = row;
    } else if (operation === 'create') {
      // Принудительно устанавливаем user_id и created_by_id текущего пользователя
      const recordData = { ...data, user_id: userId, created_by_id: userId };
      if (familyId && TABLES_WITH_FAMILY_ID.includes(table) && !recordData.family_id) {
        recordData.family_id = familyId;
      }
      const { data: row, error } = await supabase.from(table).insert([recordData]).select().single();
      if (error) throw error;
      result = row;
    } else if (operation === 'bulkCreate') {
      // Принудительно устанавливаем user_id для каждой записи
      const records = (dataArray || []).map(item => ({
        ...item,
        user_id: userId,
        created_by_id: userId,
        family_id: (familyId && TABLES_WITH_FAMILY_ID.includes(table) && !item.family_id) ? familyId : item.family_id,
      }));
      const { data: rows, error } = await supabase.from(table).insert(records).select();
      if (error) throw error;
      result = rows;
    } else if (operation === 'update') {
      const hasAccess = await checkOwnership(id);
      if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });
      // Запрещаем менять user_id через update
      const safeData = { ...data };
      delete safeData.user_id;
      delete safeData.created_by_id;
      const { data: row, error } = await supabase.from(table).update(safeData).eq('id', id).select().single();
      if (error) throw error;
      result = row;
    } else if (operation === 'delete') {
      const hasAccess = await checkOwnership(id);
      if (!hasAccess) return Response.json({ error: 'Forbidden' }, { status: 403 });
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      result = null;
    } else {
      return Response.json({ error: `Unknown operation: ${operation}` }, { status: 400 });
    }

    return Response.json({ result });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});