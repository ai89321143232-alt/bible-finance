import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, Crown, Shield, CheckCircle, XCircle, Edit2, Search, Filter, LayoutDashboard
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { toast } from "sonner";

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [editUser, setEditUser] = useState(null);
  const [subscription, setSubscription] = useState('');
  const [dashboardBlocks, setDashboardBlocks] = useState({
    balance: true,
    quickStats: true,
    spendingChart: true,
    transactions: true,
    budgets: true,
    goals: true
  });
  const queryClient = useQueryClient();

  useEffect(() => {
    checkAdmin();
  }, []);

  const checkAdmin = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
    if (user.role !== 'admin') {
      window.location.href = '/';
    }
  };

  const { data: users = [] } = useQuery({
    queryKey: ['all-users'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  const updateUserMutation = useMutation({
    mutationFn: async ({ userId, data }) => {
      return base44.entities.User.update(userId, data);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['all-users'] });
      toast.success('Пользователь обновлен');
      setEditUser(null);
    },
    onError: () => {
      toast.error('Ошибка при обновлении');
    }
  });

  const handleUpdateSubscription = () => {
    if (!editUser || !subscription) return;
    updateUserMutation.mutate({
      userId: editUser.id,
      data: {
        ...editUser.data,
        subscription: subscription,
        visible_dashboard_blocks: dashboardBlocks
      }
    });
  };

  const filteredUsers = users.filter(u => 
    u.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    u.full_name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const stats = {
    total: users.length,
    premium: users.filter(u => u.data?.subscription === 'premium' || u.data?.subscription === 'family').length,
    free: users.filter(u => !u.data?.subscription || u.data?.subscription === 'free').length
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <p className="text-slate-500">Загрузка...</p>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-6"
        >
          <div className="flex items-center gap-3 mb-2">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-amber-500 to-orange-600 flex items-center justify-center">
              <Shield className="w-6 h-6 text-white" />
            </div>
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
                Панель администратора
              </h1>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Управление пользователями и подписками
              </p>
            </div>
          </div>
        </motion.div>

        {/* Stats */}
        <div className="grid sm:grid-cols-3 gap-4 mb-6">
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Всего пользователей</p>
                  <p className="text-3xl font-bold text-slate-900 dark:text-white">{stats.total}</p>
                </div>
                <Users className="w-10 h-10 text-slate-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Premium подписки</p>
                  <p className="text-3xl font-bold text-violet-600">{stats.premium}</p>
                </div>
                <Crown className="w-10 h-10 text-violet-300" />
              </div>
            </CardContent>
          </Card>

          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-5">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500 dark:text-slate-400">Бесплатные</p>
                  <p className="text-3xl font-bold text-slate-400">{stats.free}</p>
                </div>
                <CheckCircle className="w-10 h-10 text-slate-300" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Search */}
        <div className="mb-6">
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
            <Input
              placeholder="Поиск по email или имени..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-12 rounded-xl h-12 border-slate-200 dark:border-slate-700"
            />
          </div>
        </div>

        {/* Users List */}
        <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              Пользователи ({filteredUsers.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {filteredUsers.map((user) => (
                <div
                  key={user.id}
                  className="flex items-center justify-between p-4 rounded-xl border border-slate-100 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                >
                  <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white font-bold">
                      {user.full_name?.[0] || user.email?.[0] || '?'}
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900 dark:text-white">
                        {user.full_name || 'Пользователь'}
                      </p>
                      <p className="text-sm text-slate-500 dark:text-slate-400">{user.email}</p>
                      <div className="flex items-center gap-2 mt-1">
                        {user.role === 'admin' && (
                          <Badge className="bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-300">
                            <Crown className="w-3 h-3 mr-1" />
                            Админ
                          </Badge>
                        )}
                        {user.data?.subscription === 'premium' && (
                          <Badge className="bg-violet-100 text-violet-700 dark:bg-violet-900/30 dark:text-violet-300">
                            Premium
                          </Badge>
                        )}
                        {user.data?.subscription === 'family' && (
                          <Badge className="bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-300">
                            Family
                          </Badge>
                        )}
                        {(!user.data?.subscription || user.data?.subscription === 'free') && (
                          <Badge variant="outline">Бесплатный</Badge>
                        )}
                      </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => {
                      setEditUser(user);
                      setSubscription(user.data?.subscription || 'free');
                      setDashboardBlocks(user.data?.visible_dashboard_blocks || {
                        balance: true,
                        quickStats: true,
                        spendingChart: true,
                        transactions: true,
                        budgets: true,
                        goals: true
                      });
                    }}
                    className="rounded-xl"
                  >
                    <Edit2 className="w-4 h-4 mr-2" />
                    Изменить
                  </Button>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Edit User Modal */}
      <Dialog open={!!editUser} onOpenChange={() => setEditUser(null)}>
        <DialogContent className="rounded-2xl max-w-md max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>Редактировать пользователя</DialogTitle>
          </DialogHeader>
          <div className="space-y-6">
            <div>
              <p className="font-semibold text-slate-900 dark:text-white">
                {editUser?.full_name || 'Пользователь'}
              </p>
              <p className="text-sm text-slate-500">{editUser?.email}</p>
            </div>
            
            <div>
              <Label>Тип подписки</Label>
              <Select value={subscription} onValueChange={setSubscription}>
                <SelectTrigger className="rounded-xl mt-2">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="free">Бесплатный</SelectItem>
                  <SelectItem value="premium">Premium</SelectItem>
                  <SelectItem value="family">Family</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="flex items-center gap-2 mb-3">
                <LayoutDashboard className="w-4 h-4" />
                Блоки на главной странице
              </Label>
              <div className="space-y-3 p-4 bg-slate-50 dark:bg-slate-800 rounded-xl">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Карта баланса</span>
                  <Switch
                    checked={dashboardBlocks.balance}
                    onCheckedChange={(v) => setDashboardBlocks({...dashboardBlocks, balance: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Быстрая статистика</span>
                  <Switch
                    checked={dashboardBlocks.quickStats}
                    onCheckedChange={(v) => setDashboardBlocks({...dashboardBlocks, quickStats: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">График расходов</span>
                  <Switch
                    checked={dashboardBlocks.spendingChart}
                    onCheckedChange={(v) => setDashboardBlocks({...dashboardBlocks, spendingChart: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Последние транзакции</span>
                  <Switch
                    checked={dashboardBlocks.transactions}
                    onCheckedChange={(v) => setDashboardBlocks({...dashboardBlocks, transactions: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Бюджеты</span>
                  <Switch
                    checked={dashboardBlocks.budgets}
                    onCheckedChange={(v) => setDashboardBlocks({...dashboardBlocks, budgets: v})}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm text-slate-700 dark:text-slate-300">Цели</span>
                  <Switch
                    checked={dashboardBlocks.goals}
                    onCheckedChange={(v) => setDashboardBlocks({...dashboardBlocks, goals: v})}
                  />
                </div>
              </div>
            </div>

            <Button
              onClick={handleUpdateSubscription}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
              disabled={updateUserMutation.isPending}
            >
              {updateUserMutation.isPending ? 'Сохранение...' : 'Сохранить'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}