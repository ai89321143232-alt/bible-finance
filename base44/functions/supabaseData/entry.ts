import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { createClient } from 'npm:@supabase/supabase-js@2.109.0';

// ============================================================
// supabaseData — прокси для CRUD-операций в Supabase через service_role ключ.
// service_role ключ обходит RLS, поэтому используется ТОЛЬКО здесь (бэкенд),
// никогда во фронтенд-коде.
// Payload: { table, operation, id?, data?, dataArray?, filterQuery?, sort?, limit? }
// operation: "list" | "filter" | "get" | "create" | "bulkCreate" | "update" | "delete"
// ============================================================

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { table, operation, id, data, dataArray, filterQuery, sort, limit } = await req.json();
    if (!table || !operation) {
      return Response.json({ error: 'Missing table or operation' }, { status: 400 });
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

    let result;

    if (operation === 'list') {
      let query = supabase.from(table).select('*');
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data: rows, error } = await query;
      if (error) throw error;
      result = rows;
    } else if (operation === 'filter') {
      let query = supabase.from(table).select('*');
      Object.entries(filterQuery || {}).forEach(([key, value]) => {
        query = query.eq(key, value);
      });
      query = applySort(query, sort);
      if (limit) query = query.limit(limit);
      const { data: rows, error } = await query;
      if (error) throw error;
      result = rows;
    } else if (operation === 'get') {
      const { data: row, error } = await supabase.from(table).select('*').eq('id', id).maybeSingle();
      if (error) throw error;
      result = row;
    } else if (operation === 'create') {
      const { data: row, error } = await supabase.from(table).insert([data]).select().single();
      if (error) throw error;
      result = row;
    } else if (operation === 'bulkCreate') {
      const { data: rows, error } = await supabase.from(table).insert(dataArray).select();
      if (error) throw error;
      result = rows;
    } else if (operation === 'update') {
      const { data: row, error } = await supabase.from(table).update(data).eq('id', id).select().single();
      if (error) throw error;
      result = row;
    } else if (operation === 'delete') {
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