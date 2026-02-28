import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Sparkles, TrendingUp, AlertTriangle, Lightbulb } from 'lucide-react';
import { motion } from 'framer-motion';

export default function PremiumAIAnalytics() {
  const [activeTab, setActiveTab] = useState('forecast');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState(null);

  const analyzeData = async (type) => {
    setLoading(true);
    setError(null);
    try {
      const response = await base44.functions.invoke('analyzeBudgetAI', {
        analysisType: type
      });
      setData(response.data);
    } catch (err) {
      setError('Ошибка при анализе данных. Попробуйте позже.');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    analyzeData(tab);
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.3 }}
    >
      <Card className="bg-gradient-to-br from-indigo-50 to-blue-50 border-indigo-200">
        <CardHeader className="flex flex-row items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-indigo-100">
              <Sparkles className="w-5 h-5 text-indigo-600" />
            </div>
            <div>
              <CardTitle className="text-indigo-900">ИИ Аналитика</CardTitle>
              <CardDescription className="text-indigo-700">
                Интеллектуальный анализ ваших финансов
              </CardDescription>
            </div>
          </div>
        </CardHeader>

        <CardContent>
          <Tabs value={activeTab} onValueChange={handleTabChange} className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-white/50">
              <TabsTrigger value="forecast" className="data-[state=active]:bg-indigo-100">
                <TrendingUp className="w-4 h-4 mr-2" />
                Прогноз
              </TabsTrigger>
              <TabsTrigger value="recommendations" className="data-[state=active]:bg-indigo-100">
                <Lightbulb className="w-4 h-4 mr-2" />
                Советы
              </TabsTrigger>
              <TabsTrigger value="anomalies" className="data-[state=active]:bg-indigo-100">
                <AlertTriangle className="w-4 h-4 mr-2" />
                Аномалии
              </TabsTrigger>
            </TabsList>

            <TabsContent value="forecast" className="mt-6 space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Анализируем ваши расходы...</p>
                </div>
              ) : error ? (
                <div className="text-center py-6 text-red-600">{error}</div>
              ) : data?.forecast ? (
                <div className="space-y-3">
                  <p className="text-sm text-gray-700">{data.summary}</p>
                  {data.forecast?.map((item, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-3 border border-indigo-100">
                      <div className="flex justify-between items-center">
                        <span className="font-medium text-gray-800">{item.category}</span>
                        <div className="text-right">
                          <span className="text-lg font-semibold text-indigo-600">
                            {item.predicted_amount.toFixed(0)} ₽
                          </span>
                          <p className="text-xs text-gray-500">{item.confidence}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="recommendations" className="mt-6 space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Подбираем советы...</p>
                </div>
              ) : error ? (
                <div className="text-center py-6 text-red-600">{error}</div>
              ) : data?.recommendations ? (
                <div className="space-y-3">
                  {data.recommendations?.map((rec, idx) => (
                    <div key={idx} className="bg-white rounded-lg p-4 border border-yellow-100">
                      <h4 className="font-semibold text-gray-800">{rec.title}</h4>
                      <p className="text-sm text-gray-600 mt-1">{rec.description}</p>
                      {rec.potential_savings > 0 && (
                        <p className="text-xs text-green-600 mt-2 font-medium">
                          💰 Потенциальная экономия: {rec.potential_savings.toFixed(0)} ₽
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ) : null}
            </TabsContent>

            <TabsContent value="anomalies" className="mt-6 space-y-4">
              {loading ? (
                <div className="text-center py-8">
                  <div className="animate-spin inline-block">
                    <Sparkles className="w-6 h-6 text-indigo-600" />
                  </div>
                  <p className="mt-2 text-sm text-gray-600">Проверяем аномалии...</p>
                </div>
              ) : error ? (
                <div className="text-center py-6 text-red-600">{error}</div>
              ) : data?.anomalies && data.anomalies.length > 0 ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-2 mb-4">
                    <AlertTriangle className="w-4 h-4 text-red-500" />
                    <span className="text-sm font-medium text-red-700">
                      Уровень риска: {data.risk_level}
                    </span>
                  </div>
                  {data.anomalies?.map((anomaly, idx) => (
                    <div key={idx} className="bg-red-50 rounded-lg p-4 border border-red-100">
                      <div className="flex justify-between items-start">
                        <div>
                          <h4 className="font-semibold text-gray-800">{anomaly.category}</h4>
                          <p className="text-sm text-gray-600 mt-1">{anomaly.deviation}</p>
                          <p className="text-xs text-red-600 mt-2">🔍 {anomaly.recommendation}</p>
                        </div>
                        <span className="text-lg font-bold text-red-600">
                          {anomaly.amount.toFixed(0)} ₽
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-6 text-gray-600">
                  ✓ Аномалии не обнаружены. Ваши траты в норме!
                </div>
              )}
            </TabsContent>
          </Tabs>

          {!data && !loading && (
            <div className="text-center py-6">
              <Button
                onClick={() => analyzeData(activeTab)}
                className="bg-indigo-600 hover:bg-indigo-700"
              >
                <Sparkles className="w-4 h-4 mr-2" />
                Начать анализ
              </Button>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
}