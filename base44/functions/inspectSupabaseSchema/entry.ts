import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });

    const { accessToken } = await base44.asServiceRole.connectors.getConnection('supabase');

    // Step 1: Get projects list
    const projectsRes = await fetch('https://api.supabase.com/v1/projects', {
      headers: { 'Authorization': `Bearer ${accessToken}` }
    });
    if (!projectsRes.ok) {
      const err = await projectsRes.text();
      return Response.json({ error: `Failed to fetch projects: ${err}` }, { status: 500 });
    }
    const projects = await projectsRes.json();
    if (!projects || projects.length === 0) {
      return Response.json({ error: 'No Supabase projects found' }, { status: 404 });
    }

    const results = [];

    for (const project of projects) {
      const projectRef = project.ref;
      const projectName = project.name;

      // Step 2: Inspect schema via read-only query — get all tables in public schema
      const schemaRes = await fetch(
        `https://api.supabase.com/v1/projects/${projectRef}/database/query/read-only`,
        {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query: `
            SELECT
              t.table_name,
              c.column_name,
              c.data_type,
              c.is_nullable,
              c.column_default,
              c.character_maximum_length
            FROM information_schema.tables t
            JOIN information_schema.columns c
              ON t.table_name = c.table_name AND t.table_schema = c.table_schema
            WHERE t.table_schema = 'public'
              AND t.table_type = 'BASE TABLE'
            ORDER BY t.table_name, c.ordinal_position
            `
          })
        }
      );

      if (!schemaRes.ok) {
        const err = await schemaRes.text();
        results.push({ project: projectName, ref: projectRef, error: err });
        continue;
      }

      const schemaData = await schemaRes.json();
      const rows = Array.isArray(schemaData) ? schemaData : (schemaData.rows || []);

      // Group columns by table
      const tables = {};
      for (const row of rows) {
        const tname = row.table_name;
        if (!tables[tname]) tables[tname] = { table_name: tname, columns: [] };
        tables[tname].columns.push({
          column_name: row.column_name,
          data_type: row.data_type,
          is_nullable: row.is_nullable,
          column_default: row.column_default,
          max_length: row.character_maximum_length
        });
      }

      results.push({
        project: projectName,
        ref: projectRef,
        transaction_tables: Object.values(tables)
      });
    }

    return Response.json({ results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});