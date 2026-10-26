import React from 'react';

export default function RestoreReport({ report }) {
  const rows = Object.entries(report.entities || {}).filter(([, v]) => v.total > 0);
  return (
    <div className="text-xs space-y-2 border-t border-border pt-3">
      <p className="font-medium">Результат восстановления</p>
      <div className="flex flex-wrap gap-1">
        {rows.map(([name, v]) => (
          <span key={name} className="px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
            {name}: {v.restored}/{v.total}
          </span>
        ))}
      </div>
      <p className="text-muted-foreground">Пользователей сопоставлено: {report.users?.matched || 0}</p>
      {report.users?.unmatched?.length > 0 && (
        <p className="text-muted-foreground">
          Не найдены (данные привязаны к вам): {report.users.unmatched.join(', ')}
        </p>
      )}
      {report.errors?.length > 0 && (
        <ul className="text-destructive list-disc pl-4">
          {report.errors.map((e, i) => <li key={i}>{e}</li>)}
        </ul>
      )}
    </div>
  );
}