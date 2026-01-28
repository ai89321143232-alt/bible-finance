import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { format, isToday, isTomorrow, isPast, addDays } from 'date-fns';
import { ru } from 'date-fns/locale';
import {
  Plus, CheckCircle2, Circle, Calendar, Clock, Edit2, Trash2,
  Flag, X, Check, Coins, ListTodo, AlertCircle
} from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Calendar as CalendarComponent } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
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
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

const TASK_TYPES = [
  { value: 'personal', label: 'Личная', icon: '📝', color: '#6366F1' },
  { value: 'financial', label: 'Финансовая', icon: '💰', color: '#10B981' },
  { value: 'family', label: 'Семейная', icon: '👨‍👩‍👧‍👦', color: '#EC4899' },
];

const PRIORITIES = [
  { value: 'low', label: 'Низкий', color: '#64748B' },
  { value: 'medium', label: 'Средний', color: '#F59E0B' },
  { value: 'high', label: 'Высокий', color: '#EF4444' },
];

export default function Tasks() {
  const queryClient = useQueryClient();
  const [showAddModal, setShowAddModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [activeTab, setActiveTab] = useState('all');

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'personal',
    due_date: null,
    priority: 'medium',
    amount: ''
  });

  const { data: tasks = [], isLoading } = useQuery({
    queryKey: ['tasks'],
    queryFn: () => base44.entities.Task.list('-created_date')
  });

  const { data: goals = [] } = useQuery({
    queryKey: ['goals'],
    queryFn: () => base44.entities.Goal.filter({ status: 'active' })
  });

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Task.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetForm();
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Task.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      resetForm();
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => base44.entities.Task.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['tasks'] });
      setDeleteId(null);
    }
  });

  const resetForm = () => {
    setFormData({
      title: '',
      description: '',
      type: 'personal',
      due_date: null,
      priority: 'medium',
      amount: ''
    });
    setShowAddModal(false);
    setEditTask(null);
  };

  const handleEdit = (task) => {
    setEditTask(task);
    setFormData({
      title: task.title,
      description: task.description || '',
      type: task.type || 'personal',
      due_date: task.due_date ? new Date(task.due_date) : null,
      priority: task.priority || 'medium',
      amount: task.amount?.toString() || ''
    });
    setShowAddModal(true);
  };

  const handleSubmit = () => {
    const data = {
      ...formData,
      due_date: formData.due_date ? formData.due_date.toISOString() : null,
      amount: formData.amount ? parseFloat(formData.amount) : null,
      status: editTask?.status || 'pending'
    };

    if (editTask) {
      updateMutation.mutate({ id: editTask.id, data });
    } else {
      createMutation.mutate(data);
    }
  };

  const toggleTaskStatus = (task) => {
    const newStatus = task.status === 'completed' ? 'pending' : 'completed';
    updateMutation.mutate({ 
      id: task.id, 
      data: { ...task, status: newStatus }
    });
  };

  const getDateLabel = (dateStr) => {
    if (!dateStr) return null;
    const date = new Date(dateStr);
    if (isToday(date)) return 'Сегодня';
    if (isTomorrow(date)) return 'Завтра';
    return format(date, 'd MMM', { locale: ru });
  };

  const isOverdue = (dateStr) => {
    if (!dateStr) return false;
    return isPast(new Date(dateStr)) && !isToday(new Date(dateStr));
  };

  // Filter tasks
  const filteredTasks = tasks.filter(task => {
    if (activeTab === 'all') return task.status !== 'completed';
    if (activeTab === 'completed') return task.status === 'completed';
    if (activeTab === 'today') {
      return task.due_date && isToday(new Date(task.due_date)) && task.status !== 'completed';
    }
    if (activeTab === 'financial') return task.type === 'financial' && task.status !== 'completed';
    return true;
  });

  // Group tasks
  const todayTasks = filteredTasks.filter(t => t.due_date && isToday(new Date(t.due_date)));
  const overdueTasks = filteredTasks.filter(t => t.due_date && isOverdue(t.due_date));
  const upcomingTasks = filteredTasks.filter(t => !t.due_date || (!isToday(new Date(t.due_date)) && !isOverdue(t.due_date)));

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('ru-RU', { 
      style: 'currency', 
      currency: 'RUB',
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950">
      <div className="max-w-3xl mx-auto px-4 sm:px-6 py-6 pb-24 sm:pb-6">
        {/* Header */}
        <motion.div 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center justify-between mb-6"
        >
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 dark:text-white">
            Задачи
          </h1>
          <Button
            onClick={() => setShowAddModal(true)}
            className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
          >
            <Plus className="w-5 h-5 mr-2" />
            Добавить
          </Button>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm p-1 rounded-xl">
            <TabsTrigger value="all" className="rounded-lg">Все</TabsTrigger>
            <TabsTrigger value="today" className="rounded-lg">Сегодня</TabsTrigger>
            <TabsTrigger value="financial" className="rounded-lg">💰 Финансы</TabsTrigger>
            <TabsTrigger value="completed" className="rounded-lg">Готово</TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Overdue Tasks */}
        {overdueTasks.length > 0 && activeTab !== 'completed' && (
          <div className="mb-6">
            <div className="flex items-center gap-2 mb-3">
              <AlertCircle className="w-4 h-4 text-rose-500" />
              <h2 className="text-sm font-semibold text-rose-600">Просрочено</h2>
            </div>
            <TaskList 
              tasks={overdueTasks} 
              onToggle={toggleTaskStatus}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              getDateLabel={getDateLabel}
              isOverdue={isOverdue}
              formatCurrency={formatCurrency}
            />
          </div>
        )}

        {/* Today's Tasks */}
        {todayTasks.length > 0 && activeTab !== 'completed' && activeTab !== 'today' && (
          <div className="mb-6">
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
              Сегодня
            </h2>
            <TaskList 
              tasks={todayTasks} 
              onToggle={toggleTaskStatus}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              getDateLabel={getDateLabel}
              isOverdue={isOverdue}
              formatCurrency={formatCurrency}
            />
          </div>
        )}

        {/* All/Upcoming Tasks */}
        <div>
          {activeTab !== 'completed' && activeTab !== 'today' && upcomingTasks.length > 0 && (
            <h2 className="text-sm font-semibold text-slate-500 dark:text-slate-400 mb-3">
              {activeTab === 'financial' ? 'Финансовые задачи' : 'Предстоящие'}
            </h2>
          )}
          {activeTab === 'today' && todayTasks.length > 0 && (
            <TaskList 
              tasks={todayTasks} 
              onToggle={toggleTaskStatus}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              getDateLabel={getDateLabel}
              isOverdue={isOverdue}
              formatCurrency={formatCurrency}
            />
          )}
          {(activeTab === 'all' || activeTab === 'financial') && (
            <TaskList 
              tasks={upcomingTasks} 
              onToggle={toggleTaskStatus}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              getDateLabel={getDateLabel}
              isOverdue={isOverdue}
              formatCurrency={formatCurrency}
            />
          )}
          {activeTab === 'completed' && (
            <TaskList 
              tasks={filteredTasks} 
              onToggle={toggleTaskStatus}
              onEdit={handleEdit}
              onDelete={setDeleteId}
              getDateLabel={getDateLabel}
              isOverdue={isOverdue}
              formatCurrency={formatCurrency}
            />
          )}
        </div>

        {/* Empty State */}
        {filteredTasks.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <ListTodo className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              {activeTab === 'completed' ? 'Нет выполненных задач' : 'Нет задач'}
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              {activeTab === 'completed' 
                ? 'Выполненные задачи появятся здесь' 
                : 'Создайте первую задачу'}
            </p>
            {activeTab !== 'completed' && (
              <Button
                onClick={() => setShowAddModal(true)}
                className="rounded-xl"
              >
                <Plus className="w-4 h-4 mr-2" />
                Добавить задачу
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={() => resetForm()}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editTask ? 'Редактировать задачу' : 'Новая задача'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Что нужно сделать?"
                className="rounded-xl mt-1"
              />
            </div>
            <div>
              <Label>Описание</Label>
              <Textarea
                value={formData.description}
                onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                placeholder="Подробности..."
                className="rounded-xl mt-1 resize-none"
                rows={2}
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Тип</Label>
                <Select 
                  value={formData.type} 
                  onValueChange={(v) => setFormData({ ...formData, type: v })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TASK_TYPES.map(type => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.icon} {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label>Приоритет</Label>
                <Select 
                  value={formData.priority} 
                  onValueChange={(v) => setFormData({ ...formData, priority: v })}
                >
                  <SelectTrigger className="rounded-xl mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {PRIORITIES.map(p => (
                      <SelectItem key={p.value} value={p.value}>
                        <div className="flex items-center gap-2">
                          <div 
                            className="w-2 h-2 rounded-full"
                            style={{ backgroundColor: p.color }}
                          />
                          {p.label}
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div>
              <Label>Срок</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className="w-full justify-start text-left font-normal rounded-xl mt-1"
                  >
                    <Calendar className="mr-2 h-4 w-4" />
                    {formData.due_date 
                      ? format(formData.due_date, 'dd.MM.yyyy')
                      : 'Выберите дату'
                    }
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0">
                  <CalendarComponent
                    mode="single"
                    selected={formData.due_date}
                    onSelect={(d) => setFormData({ ...formData, due_date: d })}
                  />
                </PopoverContent>
              </Popover>
            </div>
            {formData.type === 'financial' && (
              <div>
                <Label>Сумма</Label>
                <div className="relative mt-1">
                  <Input
                    type="number"
                    value={formData.amount}
                    onChange={(e) => setFormData({ ...formData, amount: e.target.value })}
                    placeholder="0"
                    className="rounded-xl pr-8"
                  />
                  <span className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">₽</span>
                </div>
              </div>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!formData.title}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Check className="w-4 h-4 mr-2" />
              {editTask ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить задачу?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-xl">Отмена</AlertDialogCancel>
            <AlertDialogAction
              onClick={() => deleteMutation.mutate(deleteId)}
              className="bg-rose-600 hover:bg-rose-700 rounded-xl"
            >
              Удалить
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

function TaskList({ tasks, onToggle, onEdit, onDelete, getDateLabel, isOverdue, formatCurrency }) {
  return (
    <Card className="border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm overflow-hidden">
      <CardContent className="p-0">
        {tasks.map((task, index) => {
          const typeInfo = TASK_TYPES.find(t => t.value === task.type) || TASK_TYPES[0];
          const priorityInfo = PRIORITIES.find(p => p.value === task.priority) || PRIORITIES[1];
          const dateLabel = getDateLabel(task.due_date);
          const overdue = isOverdue(task.due_date);

          return (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.03 }}
              className={`flex items-start gap-3 p-4 border-b border-slate-100 dark:border-slate-700 last:border-0 group hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors ${
                task.status === 'completed' ? 'opacity-60' : ''
              }`}
            >
              <button
                onClick={() => onToggle(task)}
                className="mt-0.5 flex-shrink-0"
              >
                {task.status === 'completed' ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                ) : (
                  <Circle className="w-5 h-5 text-slate-300 hover:text-violet-500 transition-colors" />
                )}
              </button>

              <div className="flex-1 min-w-0">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className={`font-medium text-slate-900 dark:text-white ${
                      task.status === 'completed' ? 'line-through' : ''
                    }`}>
                      {task.title}
                    </p>
                    {task.description && (
                      <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5 line-clamp-1">
                        {task.description}
                      </p>
                    )}
                    <div className="flex items-center flex-wrap gap-2 mt-2">
                      <Badge 
                        variant="secondary" 
                        className="text-xs"
                        style={{ backgroundColor: `${typeInfo.color}20`, color: typeInfo.color }}
                      >
                        {typeInfo.icon} {typeInfo.label}
                      </Badge>
                      {dateLabel && (
                        <Badge 
                          variant="secondary" 
                          className={`text-xs ${overdue ? 'bg-rose-100 text-rose-700' : 'bg-slate-100 text-slate-600'}`}
                        >
                          <Clock className="w-3 h-3 mr-1" />
                          {dateLabel}
                        </Badge>
                      )}
                      {task.amount && (
                        <Badge variant="secondary" className="text-xs bg-emerald-100 text-emerald-700">
                          <Coins className="w-3 h-3 mr-1" />
                          {formatCurrency(task.amount)}
                        </Badge>
                      )}
                      {task.priority === 'high' && (
                        <Flag className="w-3.5 h-3.5 text-rose-500" />
                      )}
                    </div>
                  </div>
                  <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(task)}
                      className="h-8 w-8"
                    >
                      <Edit2 className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDelete(task.id)}
                      className="h-8 w-8 text-rose-600"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </CardContent>
    </Card>
  );
}