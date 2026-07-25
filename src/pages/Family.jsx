import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Users, UserPlus, Copy, Check, Crown, Mail, Shield, Trash2, 
  Link as LinkIcon, Settings, X, LogOut, Pencil
} from 'lucide-react';
import MemberAvatar from '@/components/family/MemberAvatar';
import EditMemberModal from '@/components/family/EditMemberModal';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { getSubscriptionStatus } from '@/components/SubscriptionManager';

export default function Family() {
  const queryClient = useQueryClient();
  const [currentUser, setCurrentUser] = useState(null);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showJoinModal, setShowJoinModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState('editor');
  const [familyName, setFamilyName] = useState('');
  const [joinCode, setJoinCode] = useState('');
  const [copied, setCopied] = useState(false);
  const [showDeleteFamilyModal, setShowDeleteFamilyModal] = useState(false);
  const [editingMember, setEditingMember] = useState(null);

  useEffect(() => {
    loadCurrentUser();
    checkInviteCode();
  }, []);

  const loadCurrentUser = async () => {
    const user = await base44.auth.me();
    setCurrentUser(user);
  };

  const checkInviteCode = () => {
    const urlParams = new URLSearchParams(window.location.search);
    const code = urlParams.get('invite');
    if (code) {
      setJoinCode(code.replace(/\s/g, '').toUpperCase());
      setShowJoinModal(true);
    }
  };

  const { data: families = [] } = useQuery({
    queryKey: ['families'],
    queryFn: () => base44.entities.Family.list()
  });

  const createFamilyMutation = useMutation({
    mutationFn: async (data) => {
      const family = await base44.entities.Family.create(data);
      // Сохраняем family_id в профиле пользователя
      await base44.auth.updateMe({
        family_id: family.id
      });
      return family;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      setShowCreateModal(false);
      setFamilyName('');
      toast.success('Семья создана!');
    }
  });

  const inviteMemberMutation = useMutation({
    mutationFn: async ({ email, role }) => {
      // Invite user to the platform
      await base44.users.inviteUser(email, role === 'admin' ? 'admin' : 'user');
      // Also send family invite link via email using SendEmail integration
      if (myFamily?.invite_code) {
        const inviteUrl = `${window.location.origin}${window.location.pathname.replace(/\/[^/]*$/, '/Family')}?invite=${myFamily.invite_code}`;
        await base44.integrations.Core.SendEmail({
          to: email,
          subject: `Приглашение в семью "${myFamily.name}"`,
          body: `Вас пригласили присоединиться к семье "${myFamily.name}" в FinanceApp.\n\nДля вступления:\n1. Зарегистрируйтесь на сайте (если ещё не зарегистрированы)\n2. Перейдите по ссылке: ${inviteUrl}\n\nИли введите код приглашения вручную: ${myFamily.invite_code}\n\nПосле входа перейдите в раздел "Семья" и введите код.`
        });
      }
    },
    onSuccess: () => {
      setShowInviteModal(false);
      setInviteEmail('');
      toast.success('Приглашение отправлено на email!');
    },
    onError: (err) => {
      toast.error(err.message || 'Ошибка при отправке приглашения');
    }
  });

  const joinFamilyMutation = useMutation({
    mutationFn: async (code) => {
      const res = await base44.functions.invoke('joinFamilyByCode', { code });
      if (res.data?.error) {
        throw new Error(res.data.error);
      }
      return res.data.family;
    },
    onSuccess: (family) => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      setShowJoinModal(false);
      setJoinCode('');
      toast.success(`Вы присоединились к семье "${family.name}"!`);
      // Очищаем URL от параметра invite
      const url = new URL(window.location);
      url.searchParams.delete('invite');
      window.history.replaceState({}, '', url);
    },
    onError: (error) => {
      toast.error(error?.response?.data?.error || error.message || 'Не удалось присоединиться к семье');
    }
  });

  const handleCreateFamily = () => {
    if (!familyName || !currentUser) return;

    const inviteCode = Math.random().toString(36).substring(2, 10).toUpperCase();

    const familyData = {
      name: familyName,
      owner_id: currentUser.id,
      currency: 'RUB',
      members: [{
        user_id: currentUser.id,
        name: currentUser.full_name || currentUser.email,
        role: 'admin',
        avatar_color: '#8B5CF6'
      }],
      invite_code: inviteCode,
      subscription_tier: 'free'
    };

    createFamilyMutation.mutate(familyData);
  };

  const handleInvite = () => {
    if (!inviteEmail) return;
    inviteMemberMutation.mutate({ email: inviteEmail, role: inviteRole });
  };

  const copyInviteCode = (code) => {
    const inviteUrl = `${window.location.origin}${window.location.pathname}?invite=${code}`;
    navigator.clipboard.writeText(inviteUrl);
    setCopied(true);
    toast.success('Ссылка скопирована!');
    setTimeout(() => setCopied(false), 2000);
  };

  const handleJoinFamily = () => {
    if (!joinCode) return;
    joinFamilyMutation.mutate(joinCode);
  };

  const leaveFamilyMutation = useMutation({
    mutationFn: async () => {
      if (!myFamily || !currentUser) return;
      if (myFamily.owner_id === currentUser.id) {
        throw new Error('Владелец не может покинуть семью. Удалите семью или передайте права.');
      }
      const updatedMembers = (myFamily.members || []).filter(m => m.user_id !== currentUser.id);
      await base44.entities.Family.update(myFamily.id, { members: updatedMembers });
      await base44.auth.updateMe({ family_id: null });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Вы вышли из семьи');
    },
    onError: (err) => toast.error(err.message || 'Ошибка выхода')
  });

  const removeMemberMutation = useMutation({
    mutationFn: async (memberId) => {
      if (!myFamily) return;
      const res = await base44.functions.invoke('removeFamilyMember', { familyId: myFamily.id, memberId });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      toast.success('Участник удалён');
    },
    onError: (err) => toast.error(err.message || 'Ошибка удаления участника')
  });

  const deleteFamilyMutation = useMutation({
    mutationFn: async () => {
      if (!myFamily) return;
      const res = await base44.functions.invoke('deleteFamily', { familyId: myFamily.id });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      setShowDeleteFamilyModal(false);
      toast.success('Семья удалена');
    },
    onError: (err) => toast.error(err.message || 'Ошибка удаления семьи')
  });

  const updateMemberProfileMutation = useMutation({
    mutationFn: async ({ memberId, display_name, avatar_url }) => {
      const res = await base44.functions.invoke('updateFamilyMemberProfile', {
        familyId: myFamily.id, memberId, display_name, avatar_url
      });
      if (res.data?.error) throw new Error(res.data.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['families'] });
      setEditingMember(null);
      toast.success('Профиль обновлён');
    },
    onError: (err) => toast.error(err.message || 'Ошибка обновления профиля')
  });

  const myFamily = families.find(f => 
    f.owner_id === currentUser?.id || 
    f.members?.some(m => m.user_id === currentUser?.id)
  );
  
  const isOwner = myFamily?.owner_id === currentUser?.id;
  const subscriptionStatus = getSubscriptionStatus(currentUser);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
              Семья
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Управление семейным бюджетом
            </p>
          </div>
          {myFamily ? (
            <Button
              onClick={() => setShowInviteModal(true)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
            >
              <UserPlus className="w-5 h-5 mr-2" />
              Пригласить
            </Button>
          ) : (
            <div className="flex gap-2">
              <Button
                onClick={() => setShowJoinModal(true)}
                variant="outline"
                className="rounded-xl"
              >
                <LinkIcon className="w-5 h-5 mr-2" />
                Присоединиться
              </Button>
              <Button
                onClick={() => setShowCreateModal(true)}
                className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
              >
                <Users className="w-5 h-5 mr-2" />
                Создать
              </Button>
            </div>
          )}
        </motion.div>

        {myFamily ? (
          <>
            {/* Family Info Card */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mb-6"
            >
              <Card className="border-0 shadow-lg bg-gradient-to-br from-violet-600 to-indigo-700 text-white overflow-hidden">
                <CardContent className="p-6">
                  <div className="flex items-center justify-between mb-4">
                    <div>
                      <h2 className="text-2xl font-bold">{myFamily.name}</h2>
                      <p className="text-violet-200 text-sm mt-1">
                        {myFamily.members?.length || 1} {myFamily.members?.length === 1 ? 'участник' : 'участников'}
                      </p>
                    </div>
                    <div className="p-3 bg-white/20 rounded-xl">
                      <Users className="w-6 h-6" />
                    </div>
                  </div>

                  {/* Invite Code */}
                  <div className="bg-white/10 backdrop-blur-sm rounded-xl p-4">
                    <p className="text-violet-200 text-xs mb-2">Пригласительная ссылка:</p>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 font-mono text-sm bg-white/10 px-3 py-2 rounded-lg truncate">
                        {window.location.origin}/Family?invite={myFamily.invite_code}
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => copyInviteCode(myFamily.invite_code)}
                        className="text-white hover:bg-white/20 flex-shrink-0"
                      >
                        {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      </Button>
                    </div>
                    <p className="text-violet-200 text-xs mt-2">
                      Код: <span className="font-bold">{myFamily.invite_code}</span>
                    </p>
                  </div>
                </CardContent>
              </Card>
            </motion.div>

            {/* Members List */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1 }}
            >
              <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-lg">Участники</CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  {myFamily.members?.map((member, index) => {
                    const isMemberOwner = member.user_id === myFamily.owner_id;
                    const isMe = member.user_id === currentUser?.id;
                    const canEdit = isMe || isOwner;
                    
                    return (
                      <div 
                        key={index}
                        className="flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors"
                      >
                        <MemberAvatar member={member} />
                        <div className="flex-1 min-w-0">
                          <p className="font-medium text-slate-900 dark:text-white truncate">
                            {member.display_name || member.name} {isMe && <span className="text-violet-500 text-xs">(вы)</span>}
                          </p>
                          <p className="text-sm text-slate-500 dark:text-slate-400">
                            {isMemberOwner ? 'Владелец' : member.role === 'admin' ? 'Администратор' : member.role === 'editor' ? 'Редактор' : 'Просмотр'}
                          </p>
                        </div>
                        {isMemberOwner && (
                          <Badge variant="secondary" className="bg-amber-100 text-amber-700 flex-shrink-0">
                            <Crown className="w-3 h-3 mr-1" />
                            Владелец
                          </Badge>
                        )}
                        {canEdit && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setEditingMember(member)}
                            className="text-slate-400 hover:text-violet-600 hover:bg-violet-50 flex-shrink-0"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                        )}
                        {isOwner && !isMemberOwner && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => removeMemberMutation.mutate(member.user_id)}
                            className="text-rose-400 hover:text-rose-600 hover:bg-rose-50 flex-shrink-0"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        )}
                      </div>
                    );
                  })}
                </CardContent>
              </Card>
            </motion.div>

            {/* Leave Family Button (non-owners) */}
            {!isOwner && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => leaveFamilyMutation.mutate()}
                  disabled={leaveFamilyMutation.isPending}
                  className="w-full rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  Покинуть семью
                </Button>
              </motion.div>
            )}

            {/* Delete Family Button (owner only) */}
            {isOwner && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="mt-4">
                <Button
                  variant="outline"
                  onClick={() => setShowDeleteFamilyModal(true)}
                  className="w-full rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
                >
                  <Trash2 className="w-4 h-4 mr-2" />
                  Удалить семью
                </Button>
              </motion.div>
            )}

            {/* Info Cards */}
            <div className="grid sm:grid-cols-2 gap-4 mt-6">
              <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-violet-100 dark:bg-violet-900/30">
                      <Shield className="w-5 h-5 text-violet-600" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">План подписки</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {subscriptionStatus.displayName}
                  </p>
                  {subscriptionStatus.isTrial && subscriptionStatus.daysLeft > 0 && (
                    <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                      Осталось {subscriptionStatus.daysLeft} дн.
                    </p>
                  )}
                </CardContent>
              </Card>

              <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm">
                <CardContent className="p-5">
                  <div className="flex items-center gap-3 mb-2">
                    <div className="p-2 rounded-xl bg-emerald-100 dark:bg-emerald-900/30">
                      <LinkIcon className="w-5 h-5 text-emerald-600" />
                    </div>
                    <span className="font-medium text-slate-900 dark:text-white">Основная валюта</span>
                  </div>
                  <p className="text-2xl font-bold text-slate-900 dark:text-white">
                    {myFamily.currency || 'RUB'}
                  </p>
                </CardContent>
              </Card>
            </div>
          </>
        ) : (
          // No Family State
          <div className="text-center py-16">
            <div className="w-20 h-20 bg-gradient-to-br from-violet-100 to-indigo-100 dark:from-violet-900/30 dark:to-indigo-900/30 rounded-full flex items-center justify-center mx-auto mb-4">
              <Users className="w-10 h-10 text-violet-600" />
            </div>
            <h3 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
              У вас пока нет семьи
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-6 max-w-md mx-auto">
              Создайте семью, чтобы управлять бюджетом вместе с близкими. Синхронизируйте счета, делитесь расходами и достигайте целей вместе!
            </p>
            <Button
              onClick={() => setShowCreateModal(true)}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 rounded-xl"
            >
              <Users className="w-5 h-5 mr-2" />
              Создать семью
            </Button>
          </div>
        )}
      </div>

      {/* Create Family Modal */}
      <Dialog open={showCreateModal} onOpenChange={setShowCreateModal}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Создать семью</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название семьи</Label>
              <Input
                value={familyName}
                onChange={(e) => setFamilyName(e.target.value)}
                placeholder="Например: Семья Ивановых"
                className="rounded-xl mt-1"
              />
            </div>
            <p className="text-sm text-slate-500">
              После создания вы сможете пригласить членов семьи по специальному коду или email.
            </p>
            <Button
              onClick={handleCreateFamily}
              disabled={!familyName || createFamilyMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Check className="w-4 h-4 mr-2" />
              Создать
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Invite Member Modal */}
      <Dialog open={showInviteModal} onOpenChange={setShowInviteModal}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Пригласить участника</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Email</Label>
              <Input
                type="email"
                value={inviteEmail}
                onChange={(e) => setInviteEmail(e.target.value)}
                placeholder="email@example.com"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Роль</Label>
              <Select value={inviteRole} onValueChange={setInviteRole}>
                <SelectTrigger className="rounded-xl mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Администратор (полный доступ)</SelectItem>
                  <SelectItem value="editor">Редактор (может добавлять операции)</SelectItem>
                  <SelectItem value="viewer">Просмотр (только чтение)</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button
              onClick={handleInvite}
              disabled={!inviteEmail || inviteMemberMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Mail className="w-4 h-4 mr-2" />
              Отправить приглашение
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Family Confirmation */}
      <AlertDialog open={showDeleteFamilyModal} onOpenChange={setShowDeleteFamilyModal}>
        <AlertDialogContent className="rounded-2xl max-w-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-rose-600">Удалить семью?</AlertDialogTitle>
            <AlertDialogDescription>
              Семья "{myFamily?.name}" будет удалена безвозвратно, а все участники потеряют доступ к общим данным. Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl" disabled={deleteFamilyMutation.isPending}>Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteFamilyMutation.mutate()}
              disabled={deleteFamilyMutation.isPending}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              {deleteFamilyMutation.isPending ? 'Удаление...' : 'Удалить навсегда'}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Edit Member Modal */}
      <EditMemberModal
        member={editingMember}
        open={!!editingMember}
        onClose={() => setEditingMember(null)}
        saving={updateMemberProfileMutation.isPending}
        onSave={(data) => updateMemberProfileMutation.mutate({ memberId: editingMember.user_id, ...data })}
      />

      {/* Join Family Modal */}
      <Dialog open={showJoinModal} onOpenChange={setShowJoinModal}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>Присоединиться к семье</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Код приглашения</Label>
              <Input
                value={joinCode}
                onChange={(e) => setJoinCode(e.target.value.replace(/\s/g, '').toUpperCase())}
                placeholder="Введите код"
                className="rounded-xl mt-1 font-mono uppercase"
                maxLength={8}
              />
              <p className="text-xs text-slate-500 mt-1">
                Введите код из приглашения или перейдите по ссылке
              </p>
            </div>
            <Button
              onClick={handleJoinFamily}
              disabled={!joinCode || joinFamilyMutation.isPending}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              {joinFamilyMutation.isPending ? (
                'Присоединение...'
              ) : (
                <>
                  <UserPlus className="w-4 h-4 mr-2" />
                  Присоединиться
                </>
              )}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}