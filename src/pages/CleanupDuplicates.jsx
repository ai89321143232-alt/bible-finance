import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default function CleanupDuplicates() {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const cleanupCategories = async () => {
    setLoading(true);
    setResult(null);

    try {
      const user = await base44.auth.me();
      const allCategories = await base44.entities.Category.list();
      
      // Группируем по пользователю и названию категории
      const categoryMap = new Map();
      
      allCategories.forEach(cat => {
        const key = `${cat.created_by}|${cat.data.name}|${cat.data.type}`;
        
        if (!categoryMap.has(key)) {
          categoryMap.set(key, []);
        }
        categoryMap.get(key).push(cat);
      });
      
      // Для каждой группы оставляем только самую новую
      let deletedCount = 0;
      for (const [key, categories] of categoryMap) {
        if (categories.length > 1) {
          // Сортируем по дате создания (новые первые)
          categories.sort((a, b) => new Date(b.created_date) - new Date(a.created_date));
          
          // Удаляем все кроме первой (самой новой)
          for (let i = 1; i < categories.length; i++) {
            await base44.entities.Category.delete(categories[i].id);
            deletedCount++;
          }
        }
      }
      
      // Обновляем is_system на false для всех оставшихся
      const remainingCategories = await base44.entities.Category.list();
      for (const cat of remainingCategories) {
        if (cat.data.is_system) {
          await base44.entities.Category.update(cat.id, { is_system: false });
        }
      }
      
      setResult({
        success: true,
        message: `Удалено ${deletedCount} дубликатов. Обновлено ${remainingCategories.length} категорий.`
      });
    } catch (error) {
      setResult({
        success: false,
        message: `Ошибка: ${error.message}`
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-6">
      <div className="max-w-2xl mx-auto">
        <Card>
          <CardHeader>
            <CardTitle>Очистка дубликатов категорий</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-slate-600 dark:text-slate-400">
              Эта утилита удалит все дубликаты категорий, оставив только по одной категории каждого типа для каждого пользователя.
            </p>
            
            <Button 
              onClick={cleanupCategories}
              disabled={loading}
              className="w-full"
            >
              {loading ? 'Очистка...' : 'Очистить дубликаты'}
            </Button>
            
            {result && (
              <div className={`p-4 rounded-lg ${
                result.success 
                  ? 'bg-green-50 dark:bg-green-900/20 text-green-800 dark:text-green-200' 
                  : 'bg-red-50 dark:bg-red-900/20 text-red-800 dark:text-red-200'
              }`}>
                {result.message}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}