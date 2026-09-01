import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion } from 'framer-motion';
import {
  Plus, Edit2, Trash2, Check, X, Tag, ChevronRight, Link2, AlertCircle
} from 'lucide-react';
import BulkBudgetLinkModal from '@/components/categories/BulkBudgetLinkModal';
import { useSubmitGuard } from '@/hooks/useSubmitGuard';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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

const AVAILABLE_ICONS = [
  // Еда и напитки
  '🍔', '🍕', '🍜', '🍣', '🍱', '🍛', '🍙', '🍚', '🍝', '🍞',
  '🥐', '🥖', '🧀', '🥩', '🍗', '🍖', '🍟', '🌭', '🥪', '🌮',
  '🌯', '🥗', '🥘', '🍲', '🥙', '🍳', '🥞', '🧇', '🍩', '🍪',
  '🎂', '🍰', '🧁', '🥧', '🍫', '🍬', '🍭', '🍮', '🍯', '☕',
  '🍵', '🥤', '🍺', '🍷', '🍸', '🍹', '🥃', '🍾', '🥛', '🧃',
  // Транспорт
  '🚗', '🚕', '🚙', '🚌', '🚎', '🏎️', '🚓', '🚑', '🚒', '🚐',
  '🚚', '🚛', '🚜', '🛵', '🏍️', '🚲', '🛴', '🚁', '✈️', '🛩️',
  '🚀', '🛸', '⛽', '🚂', '🚆', '🚊', '🚉', '🚇', '🚢', '⛴️',
  '⛵', '🚤', '🛥️', '🛳️',
  // Дом и быт
  '🏠', '🏡', '🏘️', '🔑', '🚪', '🛏️', '🛋️', '🪑', '🚿', '🛁',
  '🚽', '🧻', '🧼', '🧽', '🧴', '🧹', '🧺', '🛎️', '🪔', '🕯️',
  // Развлечения и хобби
  '🎮', '🎯', '🎲', '🎰', '🎳', '🎭', '🎪', '🎫', '🎬', '🎥',
  '📺', '📻', '📼', '🎨', '🖌️', '🖍️', '🎸', '🎹', '🎺', '🎻',
  '🥁', '🎤', '🎧', '🎵', '🎶', '🎼', '🎷', '🪕', '🪗',
  // Спорт
  '⚽', '🏀', '🏈', '⚾', '🎾', '🏐', '🏉', '🎱', '🏓', '🏸',
  '🥅', '🏒', '🏑', '🥍', '🏏', '⛳', '🏹', '🎣', '🥊', '🥋',
  '🎽', '🎿', '🛷', '🥌', '🛹', '⛸️', '🏂', '🏋️', '🤸', '🤺',
  '🤿', '🧗', '🏇', '🚴', '🚵', '🏄', '🏊', '🤽',
  // Здоровье
  '💊', '💉', '🩺', '🏥', '👨‍⚕️', '👩‍⚕️', '🧬', '🦠', '🧫', '🧪',
  '⚕️', '🩸', '🦷', '🦴', '🩹', '🧠', '🫀', '🫁', '👁️', '🦻',
  // Покупки и финансы
  '🛒', '🛍️', '🏷️', '💳', '💵', '💴', '💶', '💷', '💸', '💰',
  '🧾', '💎', '⚖️', '📈', '📉', '📊', '💱', '💲', '🏦', '🏧',
  '🤑',
  // Образование и работа
  '📚', '📖', '📕', '📗', '📘', '📙', '📓', '📔', '📒', '📃',
  '📄', '📋', '📁', '📂', '🗂️', '📆', '📅', '📇', '📌', '📍',
  '📎', '🖇️', '📏', '📐', '✂️', '✏️', '✒️', '🖊️', '🖋️', '📝',
  '💼', '🖥️', '⌨️', '🖱️', '🖨️', '📞', '☎️', '📟', '📠', '📡',
  // Технологии
  '💻', '🖥️', '📱', '📲', '⌚', '📷', '📸', '📹', '🎥', '🎬',
  '🔋', '🔌', '💡', '🔦', '🔍', '🔬', '🔭', '🛰️', '⚙️', '🔧',
  '🔨', '🛠️', '⛏️', '🔩', '🧰', '🧲',
  // Природа и животные
  '🌳', '🌲', '🌴', '🌵', '🌷', '🌹', '🌺', '🌸', '🌼', '🌻',
  '🌞', '⭐', '🌟', '✨', '⚡', '☄️', '💥', '🔥', '🌪️', '🌈',
  '☀️', '⛅', '☁️', '🌧️', '⛈️', '🌨️', '❄️', '☃️', '⛄', '🌬️',
  '💧', '💦', '☔', '☂️', '🌊', '🌍', '🌎', '🌏', '🪐', '🌙',
  '🐶', '🐱', '🐭', '🐹', '🐰', '🦊', '🐻', '🐼', '🐨', '🐯',
  '🦁', '🐮', '🐷', '🐸', '🐵', '🐔', '🐧', '🐦', '🦅', '🦉',
  '🦇', '🐺', '🐗', '🐴', '🦄', '🐝', '🐛', '🦋', '🐌', '🐞',
  '🐜', '🦟', '🦗', '🕷️', '🐍', '🦎', '🦖', '🦕', '🐙', '🦑',
  '🦐', '🦞', '🦀', '🐠', '🐟', '🐡', '🐬', '🐳', '🐋', '🦈',
  // Путешествия
  '✈️', '🛫', '🛬', '🗺️', '🧭', '🏔️', '🏕️', '🏖️', '🏝️', '🏜️',
  '🌋', '🗻', '🏨', '🧳', '🗿', '🗽', '🗼', '🏰', '🏯', '🏟️',
  '🎡', '🎢', '🎠', '⛲', '⛱️',
  // Люди
  '👶', '👧', '👦', '👨', '👩', '👴', '👵', '👮', '👷', '💂',
  '🕵️', '👩‍⚕️', '👨‍⚕️', '👩‍🍳', '👨‍🍳', '👩‍🎓', '👨‍🎓', '👩‍🏫', '👨‍🏫', '👩‍💻',
  '👨‍💻', '👩‍💼', '👨‍💼', '👩‍🔬', '👨‍🔬', '👩‍🎨', '👨‍🎨', '🥷', '👰', '🤵',
  '👸', '🤴', '🦸', '🦹', '🎅', '🤶', '🧙', '🧚',
  // Одежда и аксессуары
  '👕', '👖', '👔', '👗', '👙', '👘', '👠', '👟', '🥾', '🥿',
  '👞', '👢', '👒', '🎩', '🎓', '🧢', '⛑️', '📿', '💍',
  // Символы и эмоции
  '❤️', '🧡', '💛', '💚', '💙', '💜', '🖤', '🤍', '🤎', '💔',
  '❣️', '💕', '💞', '💓', '💗', '💖', '💘', '💝', '☮️', '✝️',
  '☪️', '🕉️', '☸️', '✡️', '🔯', '🕎', '☯️', '🛐', '♻️', '✅',
  '❌', '⭕', '🛑', '⛔', '💯', '💢', '♨️', '❗', '❓', '‼️',
  '⁉️', '⚠️', '🔱', '⚜️', '🔰', '💟', '🌐', '💠', '🌀', '💤',
];

const LUCIDE_ICON_MAP = {
  'Utensils': '🍔',
  'Car': '🚗',
  'Home': '🏠',
  'Gamepad2': '🎮',
  'Heart': '💊',
  'Shirt': '👕',
  'CreditCard': '💳',
  'BookOpen': '📚',
  'Wallet': '💰',
  'Laptop': '💻',
  'TrendingUp': '📈',
  'Gift': '🎁',
  'ShoppingCart': '🛒',
  'Plane': '✈️',
  'Film': '🎬',
  'Dumbbell': '🏋️',
  'Coffee': '☕',
  'Pizza': '🍕',
  'PartyPopper': '🎉',
  'GraduationCap': '🎓',
  'Smartphone': '📱',
  'Sparkles': '✨',
  'Briefcase': '💼',
  'DollarSign': '💵'
};

export default function Categories() {
  const queryClient = useQueryClient();
  const [activeTab, setActiveTab] = useState('expense');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editCategory, setEditCategory] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const [selectedCategories, setSelectedCategories] = useState([]);
  const [showBulkLink, setShowBulkLink] = useState(false);

  const [formData, setFormData] = useState({
    name: '',
    type: 'expense',
    icon: '📦',
    color: '#8B5CF6',
    budget_ids: []
  });

  const { data: categories = [], isLoading } = useQuery({
    queryKey: ['categories'],
    queryFn: () => base44.entities.Category.list()
  });

  const { data: budgets = [] } = useQuery({
    queryKey: ['budgets-for-categories'],
    queryFn: () => base44.entities.Budget.filter({ is_active: true })
  });

  // Привязывает/отвязывает категорию (по имени) от выбранных бюджетов
  const syncBudgetCategories = async (categoryName, budgetIds) => {
    for (const budget of budgets) {
      const current = budget.categories || (budget.category ? [budget.category] : []);
      const shouldInclude = budgetIds.includes(budget.id);
      const has = current.includes(categoryName);
      if (shouldInclude && !has) {
        await base44.entities.Budget.update(budget.id, { categories: [...current, categoryName] });
      } else if (!shouldInclude && has) {
        await base44.entities.Budget.update(budget.id, { categories: current.filter(c => c !== categoryName) });
      }
    }
    queryClient.invalidateQueries({ queryKey: ['budgets-for-categories'] });
    queryClient.invalidateQueries({ queryKey: ['my-budgets'] });
    queryClient.invalidateQueries({ queryKey: ['shared-budgets'] });
  };

  const { data: transactions = [] } = useQuery({
    queryKey: ['transactions'],
    queryFn: () => base44.entities.Transaction.list('-date', 100)
  });

  const { isSubmitting, lock: lockSubmit, release: releaseSubmit } = useSubmitGuard();

  const createMutation = useMutation({
    mutationFn: (data) => base44.entities.Category.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
    },
    onError: (err) => {
      alert(err?.message || 'Ошибка сохранения');
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Category.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      resetForm();
    },
    onError: (err) => {
      alert(err?.message || 'Ошибка сохранения');
    }
  });

  const deleteMutation = useMutation({
    mutationFn: async (id) => {
      // Проверяем, есть ли транзакции с этой категорией
      const category = categories.find(c => c.id === id);
      if (!category) return;

      const hasTransactions = transactions.some(t => t.category === category.name);
      if (hasTransactions) {
        throw new Error('Невозможно удалить категорию, так как существуют связанные с ней транзакции');
      }

      return base44.entities.Category.delete(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['categories'] });
      setDeleteId(null);
    },
    onError: (error) => {
      alert(error.message);
      setDeleteId(null);
    }
  });

  const handleBulkDelete = async () => {
    const errors = [];
    
    for (const categoryId of selectedCategories) {
      const category = categories.find(c => c.id === categoryId);
      if (!category) continue;

      const hasTransactions = transactions.some(t => t.category === category.name);
      if (hasTransactions) {
        errors.push(category.name);
        continue;
      }

      try {
        await base44.entities.Category.delete(categoryId);
      } catch (error) {
        errors.push(category.name);
      }
    }

    queryClient.invalidateQueries({ queryKey: ['categories'] });
    setSelectedCategories([]);

    if (errors.length > 0) {
      alert(`Не удалось удалить категории с транзакциями: ${errors.join(', ')}`);
    }
  };

  const toggleCategory = (id) => {
    setSelectedCategories(prev => 
      prev.includes(id) ? prev.filter(cid => cid !== id) : [...prev, id]
    );
  };

  const selectAll = () => {
    const ids = filteredCategories.map(c => c.id);
    setSelectedCategories(ids);
  };

  const deselectAll = () => {
    setSelectedCategories([]);
  };

  const resetForm = () => {
    setFormData({
      name: '',
      type: 'expense',
      icon: '📦',
      color: '#8B5CF6',
      budget_ids: []
    });
    setShowAddModal(false);
    setEditCategory(null);
  };

  const handleEdit = (category) => {
    setEditCategory(category);
    
    // Convert Lucide icon name to emoji
    const iconEmoji = LUCIDE_ICON_MAP[category.icon] || category.icon || '📦';

    // Бюджеты, в категории которых уже включено имя этой категории
    const linkedBudgetIds = budgets
      .filter(b => (b.categories || (b.category ? [b.category] : [])).includes(category.name))
      .map(b => b.id);
    
    setFormData({
      name: category.name,
      type: category.type,
      icon: iconEmoji,
      color: category.color || '#8B5CF6',
      budget_ids: linkedBudgetIds
    });
    setShowAddModal(true);
  };

  const handleSubmit = async () => {
    if (!formData.name) return;

    const trimmedName = formData.name.trim();

    // Защита от дубликатов: проверяем, существует ли уже категория с таким же именем
    const existing = categories.find(c => c.name.trim().toLowerCase() === trimmedName.toLowerCase() && c.type === formData.type);
    if (existing && !editCategory) {
      alert('Категория с таким названием уже существует');
      return;
    }

    const data = {
      name: trimmedName,
      type: formData.type,
      icon: formData.icon,
      color: formData.color,
      is_system: editCategory?.is_system || false
    };

    if (!lockSubmit()) return;
    try {
      if (editCategory) {
        await updateMutation.mutateAsync({ id: editCategory.id, data });
      } else {
        await createMutation.mutateAsync(data);
      }

      if (formData.type === 'expense') {
        await syncBudgetCategories(formData.name, formData.budget_ids);
      }
    } catch {
      // ошибка уже показана в onError
    } finally {
      releaseSubmit();
    }
  };

  const filteredCategories = categories.filter(c => c.type === activeTab);

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
              Категории
            </h1>
            <p className="text-slate-500 dark:text-slate-400 mt-1">
              Управление категориями доходов и расходов
            </p>
          </div>
          <div className="flex gap-2">
            {selectedCategories.length > 0 && (
              <Button
                onClick={handleBulkDelete}
                variant="outline"
                className="rounded-xl border-rose-200 text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="w-4 h-4 mr-2" />
                Удалить ({selectedCategories.length})
              </Button>
            )}
            <Button
              variant="outline"
              onClick={() => setShowBulkLink(true)}
              className="rounded-xl"
            >
              <Link2 className="w-4 h-4 mr-2" />
              Привязать к бюджетам
            </Button>
            <Button
              onClick={() => {
                setFormData({ ...formData, type: activeTab });
                setShowAddModal(true);
              }}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 text-white shadow-lg shadow-violet-500/25 rounded-xl"
            >
              <Plus className="w-5 h-5 mr-2" />
              Добавить
            </Button>
          </div>
        </motion.div>

        {/* Tabs */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
          <TabsList className="w-full">
            <TabsTrigger value="expense" className="flex-1">
              Расходы ({categories.filter(c => c.type === 'expense').length})
            </TabsTrigger>
            <TabsTrigger value="income" className="flex-1">
              Доходы ({categories.filter(c => c.type === 'income').length})
            </TabsTrigger>
          </TabsList>
        </Tabs>

        {/* Selection Controls */}
        {filteredCategories.length > 0 && (
          <div className="flex gap-2 mb-4">
            <Button
              variant="outline"
              size="sm"
              onClick={selectAll}
              className="rounded-xl"
            >
              Выбрать все
            </Button>
            {selectedCategories.length > 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={deselectAll}
                className="rounded-xl"
              >
                Снять выбор
              </Button>
            )}
          </div>
        )}

        {/* Categories Grid */}
        {filteredCategories.length > 0 ? (
          <div className="grid sm:grid-cols-2 gap-4">
            {filteredCategories.map((category, index) => {
              const iconEmoji = LUCIDE_ICON_MAP[category.icon] || category.icon || '📦';
              const isLinked = category.type === 'expense'
                ? budgets.some(b => (b.categories || (b.category ? [b.category] : [])).includes(category.name))
                : true;
              
              return (
                <motion.div
                  key={category.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card 
                    className={`border-0 shadow-sm bg-white/80 dark:bg-slate-800/80 backdrop-blur-sm hover:shadow-md transition-all group cursor-pointer ${
                      selectedCategories.includes(category.id) ? 'ring-2 ring-violet-500' : ''
                    }`}
                    onClick={() => handleEdit(category)}
                  >
                    <CardContent className="p-4">
                      <div className="flex items-center gap-3">
                        <input
                          type="checkbox"
                          checked={selectedCategories.includes(category.id)}
                          onChange={(e) => {
                            e.stopPropagation();
                            toggleCategory(category.id);
                          }}
                          onClick={(e) => e.stopPropagation()}
                          className="w-4 h-4 rounded border-slate-300 text-violet-600 focus:ring-violet-500"
                        />
                        <div 
                          className="w-12 h-12 rounded-xl flex items-center justify-center text-2xl flex-shrink-0"
                          style={{ backgroundColor: `${category.color}20` }}
                        >
                          {iconEmoji}
                        </div>
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-slate-900 dark:text-white truncate">
                            {category.name}
                          </h3>
                          <div className="flex items-center gap-2">
                            <p className="text-sm text-slate-500 dark:text-slate-400">
                              {category.type === 'expense' ? 'Расход' : 'Доход'}
                            </p>
                            {category.type === 'expense' && (
                              <span className={`inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full ${
                                isLinked
                                  ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400'
                                  : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
                              }`}>
                                {isLinked
                                  ? <><Check className="w-3 h-3" /> Бюджет</>
                                  : <><AlertCircle className="w-3 h-3" /> Не привязана</>}
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="flex gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(category);
                            }}
                            className="h-8 w-8"
                          >
                            <Edit2 className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={(e) => {
                              e.stopPropagation();
                              setDeleteId(category.id);
                            }}
                            className="h-8 w-8 text-rose-600"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-slate-100 dark:bg-slate-800 rounded-full flex items-center justify-center mx-auto mb-4">
              <Tag className="w-8 h-8 text-slate-400" />
            </div>
            <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-2">
              Нет категорий
            </h3>
            <p className="text-slate-500 dark:text-slate-400 mb-4">
              Создайте первую категорию {activeTab === 'expense' ? 'расходов' : 'доходов'}
            </p>
            <Button
              onClick={() => setShowAddModal(true)}
              className="rounded-xl"
            >
              <Plus className="w-4 h-4 mr-2" />
              Добавить категорию
            </Button>
          </div>
        )}
      </div>

      {/* Add/Edit Modal */}
      <Dialog open={showAddModal} onOpenChange={() => resetForm()}>
        <DialogContent className="rounded-2xl max-w-md">
          <DialogHeader>
            <DialogTitle>
              {editCategory ? 'Редактировать категорию' : 'Новая категория'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label>Название</Label>
              <Input
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                placeholder="Например: Продукты"
                className="rounded-xl mt-1"
              />
            </div>
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
                  <SelectItem value="expense">Расход</SelectItem>
                  <SelectItem value="income">Доход</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label>Иконка</Label>
              <div className="grid grid-cols-8 gap-2 mt-2">
                {AVAILABLE_ICONS.map((icon) => (
                  <button
                    key={icon}
                    onClick={() => setFormData({ ...formData, icon })}
                    className={`w-10 h-10 rounded-xl flex items-center justify-center text-xl transition-all ${
                      formData.icon === icon 
                        ? 'bg-violet-100 dark:bg-violet-900/30 ring-2 ring-violet-500' 
                        : 'bg-slate-100 dark:bg-slate-700 hover:bg-slate-200'
                    }`}
                  >
                    {icon}
                  </button>
                ))}
              </div>
            </div>
            <div>
              <Label>Цвет</Label>
              <div className="flex gap-2 mt-2 flex-wrap">
                {['#8B5CF6', '#EC4899', '#F59E0B', '#10B981', '#3B82F6', '#EF4444', '#14B8A6', '#6366F1'].map((color) => (
                  <button
                    key={color}
                    onClick={() => setFormData({ ...formData, color })}
                    className={`w-10 h-10 rounded-full transition-transform ${
                      formData.color === color ? 'ring-2 ring-offset-2 ring-slate-400 scale-110' : ''
                    }`}
                    style={{ backgroundColor: color }}
                  />
                ))}
              </div>
            </div>
            {formData.type === 'expense' && (
              <div>
                <Label>Привязать к бюджетам</Label>
                {budgets.length > 0 ? (
                  <div className="mt-2 space-y-2 max-h-40 overflow-y-auto">
                    {budgets.map(budget => (
                      <label key={budget.id} className="flex items-center gap-2 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={formData.budget_ids.includes(budget.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData({ ...formData, budget_ids: [...formData.budget_ids, budget.id] });
                            } else {
                              setFormData({ ...formData, budget_ids: formData.budget_ids.filter(id => id !== budget.id) });
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-sm text-slate-700 dark:text-slate-300">{budget.name}</span>
                      </label>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-slate-400 mt-1">Нет доступных бюджетов</p>
                )}
              </div>
            )}
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || isSubmitting}
              className="w-full rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600"
            >
              <Check className="w-4 h-4 mr-2" />
              {editCategory ? 'Сохранить' : 'Создать'}
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Bulk Budget Link Modal */}
      <BulkBudgetLinkModal
        open={showBulkLink}
        onClose={() => setShowBulkLink(false)}
        categories={categories}
        budgets={budgets}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-2xl">
          <AlertDialogHeader>
            <AlertDialogTitle>Удалить категорию?</AlertDialogTitle>
            <AlertDialogDescription>
              Это действие нельзя отменить. Операции с этой категорией останутся в системе.
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