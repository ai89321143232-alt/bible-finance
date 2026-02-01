import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import {
  Users, Crown, Search, Filter, ArrowLeft, Mail, Calendar, Shield
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
  DialogDescription,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { format } from 'date-fns';
import { ru } from 'date-fns/locale';

const SUBSCRIPTION_PLANS = {
  free: { name: 'Бесплатный', color: 'bg-slate-100 text-slate-700' },
  premium: { name: 'Premium', color: 'bg-violet-100 text-violet-700' },
  family: { name: 'Family', color: 'bg-indigo-100 text-indigo-700' }
};

export default function Admin() {
  const [currentUser, setCurrentUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterPlan, setFilterPlan] = useState('all');
  const [selectedUser, setSelectedUser] = useState(null);
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [inviteModalOpen, setInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('user');

  const queryClient = useQueryClient();

  useEffect(() => {
    loadCurrentUser();
  }, []);

  const loadCurrentUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
    
    if (user.role !== 'admin') {
      window.location.href = createPageUrl('Settings');
    }
  };

  // Загрузка списка пользователей
  const { data: users = [], isLoading } = useQuery({
    queryKey: ['users'],
    queryFn: () => base44.entities.User.list(),
    enabled: currentUser?.role === 'admin'
  });

  // Мутация для обновления подписки
  const updateSubscriptionMutation = useMutation({
    mutationFn: async ({ userId, plan }) => {
      const updateData = {
        subscription_plan: plan,
        is_trial_active: false
      };
      
      if (plan !== 'free') {
        updateData.subscription_start_date = new Date().toISOString();
      }
      
      return base44.entities.User.update(userId, updateData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setEditModalOpen(false);
      setSelectedUser(null);
    }
  });

  // Мутация для приглашения пользователя
  const inviteUserMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      return base44.users.inviteUser(email, role);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users'] });
      setInviteModalOpen(false);
      setInviteEmail('');
      setInviteRole('user');
    }
  });

  // Фильтрация пользователей
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.email?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                         user.full_name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesPlan = filterPlan === 'all' || user.subscription_plan === filterPlan;
    return matchesSearch && matchesPlan;
  });

  const handleEditSubscription = (user) => {
    setSelectedUser(user);
    setEditModalOpen(true);
  };

  const handleUpdateSubscription = (plan) => {
    if (selectedUser) {
      updateSubscriptionMutation.mutate({
        userId: selectedUser.id,
        plan
      });
    }
  };

  const handleInviteUser = () => {
    if (inviteEmail) {
      inviteUserMutation.mutate({
        email: inviteEmail,
        role: inviteRole
      });
    }
  };

  const getUserStatus = (user) => {
    if (user.is_trial_active && user.trial_end_date) {
      const trialEnd = new Date(user.trial_end_date);
      const now = new Date();
      const daysLeft = Math.ceil((trialEnd - now) / (1000 * 60 * 60 * 24));
      
      if (daysLeft > 0) {
        return { text: `Демо (${daysLeft} дн.)`, color: 'bg-amber-100 text-amber-700' };
      }
    }
    
    const plan = user.subscription_plan || 'free';
    return SUBSCRIPTION_PLANS[plan];
  };

  if (!currentUser || currentUser.role !== 'admin') {
    return null;
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
          <Link to={createPageUrl('Settings')}>
            <Button variant="ghost" className="mb-4 -ml-2">
              <ArrowLeft className="w-4 h-4 mr-2" />
              Назад к настройкам
            </Button>
          </Link>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white flex items-center gap-3">
                <Shield className="w-8 h-8 text-amber-600" />
                Панель администратора
              </h1>
              <p className="text-slate-500 mt-1">Управление пользователями и подписками</p>
            </div>
            <Button 
              onClick={() => setInviteModalOpen(true)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl"
            >
              <Mail className="w-4 h-4 mr-2" />
              Пригласить
            </Button>
          </div>
        </motion.div>

        {/* Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6"
        >
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Всего пользователей</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">{users.length}</p>
                </div>
                <Users className="w-8 h-8 text-violet-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Premium</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {users.filter(u => u.subscription_plan === 'premium').length}
                  </p>
                </div>
                <Crown className="w-8 h-8 text-violet-600" />
              </div>
            </CardContent>
          </Card>
          
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-slate-500">Family</p>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {users.filter(u => u.subscription_plan === 'family').length}
                  </p>
                </div>
                <Users className="w-8 h-8 text-indigo-600" />
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="mb-6"
        >
          <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
            <CardContent className="p-4">
              <div className="flex flex-col sm:flex-row gap-3">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-400" />
                  <Input
                    placeholder="Поиск по email или имени..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-10 rounded-xl"
                  />
                </div>
                <Select value={filterPlan} onValueChange={setFilterPlan}>
                  <SelectTrigger className="w-full sm:w-48 rounded-xl">
                    <Filter className="w-4 h-4 mr-2" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Все планы</SelectItem>
                    <SelectItem value="free">Бесплатный</SelectItem>
                    <SelectItem value="premium">Premium</SelectItem>
                    <SelectItem value="family">Family</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Users List */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-3"
        >
          {isLoading ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">Загрузка...</p>
              </CardContent>
            </Card>
          ) : filteredUsers.length === 0 ? (
            <Card className="border-0 shadow-sm">
              <CardContent className="p-8 text-center">
                <p className="text-slate-500">Пользователи не найдены</p>
              </CardContent>
            </Card>
          ) : (
            filteredUsers.map((user, index) => {
              const status = getUserStatus(user);
              return (
                <motion.div
                  key={user.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between gap-4">
                        <div className="flex items-center gap-3 flex-1 min-w-0">
                          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold flex-shrink-0">
                            {user.full_name?.[0] || user.email?.[0] || '?'}
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                                {user.full_name || 'Без имени'}
                              </h3>
                              {user.role === 'admin' && (
                                <Badge className="bg-amber-100 text-amber-700 text-xs">
                                  Администратор
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-slate-500 truncate">{user.email}</p>
                            <div className="flex items-center gap-2 mt-1">
                              <Badge className={`${status.color} text-xs`}>
                                {status.text}
                              </Badge>
                              {user.created_date && (
                                <span className="text-xs text-slate-400">
                                  <Calendar className="w-3 h-3 inline mr-1" />
                                  {format(new Date(user.created_date), 'd MMM yyyy', { locale: ru })}
                                </span>
                              )}
                            </div>
                          </div>
                        </div>
                        <Button
                          onClick={() => handleEditSubscription(user)}
                          variant="outline"
                          size="sm"
                          className="rounded-xl flex-shrink-0"
                        >
                          <Crown className="w-4 h-4 mr-2" />
                          Изменить план
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </motion.div>
      </div>

      {/* Edit Subscription Modal */}
      <Dialog open={editModalOpen} onOpenChange={setEditModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Изменить подписку</DialogTitle>
            <DialogDescription>
              Пользователь: {selectedUser?.email}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div className="grid grid-cols-1 gap-3">
              <Button
                onClick={() => handleUpdateSubscription('free')}
                variant={selectedUser?.subscription_plan === 'free' ? 'default' : 'outline'}
                className="justify-start h-auto p-4 rounded-xl"
                disabled={updateSubscriptionMutation.isPending}
              >
                <div className="text-left">
                  <p className="font-semibold">Бесплатный</p>
                  <p className="text-xs opacity-70">Базовый функционал</p>
                </div>
              </Button>
              
              <Button
                onClick={() => handleUpdateSubscription('premium')}
                variant={selectedUser?.subscription_plan === 'premium' ? 'default' : 'outline'}
                className="justify-start h-auto p-4 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 text-white border-0 hover:from-violet-700 hover:to-indigo-700"
                disabled={updateSubscriptionMutation.isPending}
              >
                <div className="text-left">
                  <p className="font-semibold">Premium</p>
                  <p className="text-xs opacity-90">Расширенный функционал + AI</p>
                </div>
              </Button>
              
              <Button
                onClick={() => handleUpdateSubscription('family')}
                variant={selectedUser?.subscription_plan === 'family' ? 'default' : 'outline'}
                className="justify-start h-auto p-4 rounded-xl"
                disabled={updateSubscriptionMutation.isPending}
              >
                <div className="text-left">
                  <p className="font-semibold">Family</p>
                  <p className="text-xs opacity-70">Для всей семьи (до 5 человек)</p>
                </div>
              </Button>
            </div>
            
            {updateSubscriptionMutation.isPending && (
              <p className="text-sm text-center text-slate-500">Обновление...</p>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite User Modal */}
      <Dialog open={inviteModalOpen} onOpenChange={setInviteModalOpen}>
        <DialogContent className="rounded-2xl">
          <DialogHeader>
            <DialogTitle>Пригласить пользователя</DialogTitle>
            <DialogDescription>
              Отправить приглашение по email
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 mt-4">
            <div>
              <Label htmlFor="invite-email">Email</Label>
              <Input
                id="invite-email"
                type="email"
                placeholder="user@example.com"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                className="rounded-xl mt-1"
              />
            </div>
            
            <div>
              <Label htmlFor="invite-role">Роль</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="user">Пользователь</SelectItem>
                  <SelectItem value="admin">Администратор</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <Button
              onClick={handleInviteUser}
              disabled={!inviteEmail || inviteUserMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700"
            >
              {inviteUserMutation.isPending ? 'Отправка...' : 'Отправить приглашение'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}