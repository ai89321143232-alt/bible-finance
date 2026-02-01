import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
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
import { Plus, Trash2, Edit2, BookOpen, Heart, DollarSign, FileText } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

const categoryConfig = {
  verse: { icon: BookOpen, color: 'bg-blue-100 dark:bg-blue-900', textColor: 'text-blue-700 dark:text-blue-300', label: 'Стихи' },
  personal: { icon: Heart, color: 'bg-pink-100 dark:bg-pink-900', textColor: 'text-pink-700 dark:text-pink-300', label: 'Личные' },
  financial: { icon: DollarSign, color: 'bg-emerald-100 dark:bg-emerald-900', textColor: 'text-emerald-700 dark:text-emerald-300', label: 'Финансовые' },
  other: { icon: FileText, color: 'bg-slate-100 dark:bg-slate-900', textColor: 'text-slate-700 dark:text-slate-300', label: 'Другое' }
};

export default function Notes() {
  const queryClient = useQueryClient();
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState(null);
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [formData, setFormData] = useState({ title: '', content: '', category: 'personal' });

  const { data: notes = [] } = useQuery({
    queryKey: ['notes'],
    queryFn: () => base44.entities.Note.list('-created_date')
  });

  const createNoteMutation = useMutation({
    mutationFn: (data) => base44.entities.Note.create(data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setFormData({ title: '', content: '', category: 'personal' });
      setShowModal(false);
      toast.success('Заметка создана!');
    }
  });

  const updateNoteMutation = useMutation({
    mutationFn: ({ id, data }) => base44.entities.Note.update(id, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      setFormData({ title: '', content: '', category: 'personal' });
      setEditingNote(null);
      setShowModal(false);
      toast.success('Заметка обновлена!');
    }
  });

  const deleteNoteMutation = useMutation({
    mutationFn: (id) => base44.entities.Note.delete(id),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notes'] });
      toast.success('Заметка удалена!');
    }
  });

  const handleSave = () => {
    if (!formData.title.trim()) {
      toast.error('Введите название заметки');
      return;
    }

    if (editingNote) {
      updateNoteMutation.mutate({ id: editingNote.id, data: formData });
    } else {
      createNoteMutation.mutate(formData);
    }
  };

  const openModal = (note = null) => {
    if (note) {
      setEditingNote(note);
      setFormData({ title: note.title, content: note.content, category: note.category });
    } else {
      setEditingNote(null);
      setFormData({ title: '', content: '', category: 'personal' });
    }
    setShowModal(true);
  };

  const filteredNotes = selectedCategory === 'all' 
    ? notes 
    : notes.filter(note => note.category === selectedCategory);

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 dark:from-slate-950 dark:to-slate-900 p-4 md:p-8">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between mb-2">
            <h1 className="text-4xl font-bold text-slate-900 dark:text-white">
              Заметки
            </h1>
            <Button
              onClick={() => openModal()}
              className="bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-700 hover:to-indigo-700 gap-2"
            >
              <Plus className="w-5 h-5" />
              Новая заметка
            </Button>
          </div>
          <p className="text-slate-600 dark:text-slate-400">
            Сохраняйте важные идеи, цитаты и финансовые заметки
          </p>
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="mb-6"
        >
          <Select value={selectedCategory} onValueChange={setSelectedCategory}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Все категории</SelectItem>
              <SelectItem value="verse">Стихи</SelectItem>
              <SelectItem value="personal">Личные</SelectItem>
              <SelectItem value="financial">Финансовые</SelectItem>
              <SelectItem value="other">Другое</SelectItem>
            </SelectContent>
          </Select>
        </motion.div>

        {/* Notes Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredNotes.length === 0 ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="col-span-full text-center py-12"
            >
              <FileText className="w-16 h-16 text-slate-300 dark:text-slate-700 mx-auto mb-4" />
              <p className="text-slate-600 dark:text-slate-400">Заметок нет</p>
            </motion.div>
          ) : (
            filteredNotes.map((note, index) => {
              const cat = categoryConfig[note.category];
              const IconComponent = cat.icon;
              return (
                <motion.div
                  key={note.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: index * 0.05 }}
                >
                  <Card className="h-full hover:shadow-lg transition-shadow overflow-hidden">
                    <div className={`p-4 ${cat.color}`}>
                      <div className="flex items-center gap-2">
                        <IconComponent className={`w-5 h-5 ${cat.textColor}`} />
                        <span className={`text-sm font-semibold ${cat.textColor}`}>
                          {cat.label}
                        </span>
                      </div>
                    </div>
                    <CardContent className="p-4">
                      <h3 className="font-semibold text-slate-900 dark:text-white mb-2 line-clamp-2">
                        {note.title}
                      </h3>
                      <p className="text-sm text-slate-600 dark:text-slate-400 mb-4 line-clamp-3">
                        {note.content}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openModal(note)}
                          className="flex-1 gap-2"
                        >
                          <Edit2 className="w-4 h-4" />
                          Редактировать
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => deleteNoteMutation.mutate(note.id)}
                          className="flex-1 gap-2 text-rose-600 hover:text-rose-700"
                        >
                          <Trash2 className="w-4 h-4" />
                          Удалить
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              );
            })
          )}
        </div>
      </div>

      {/* Modal */}
      <Dialog open={showModal} onOpenChange={setShowModal}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>
              {editingNote ? 'Редактировать заметку' : 'Новая заметка'}
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-white">Название</label>
              <Input
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Введите название"
                className="mt-1"
              />
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-white">Категория</label>
              <Select value={formData.category} onValueChange={(val) => setFormData({ ...formData, category: val })}>
                <SelectTrigger className="mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="verse">Стихи</SelectItem>
                  <SelectItem value="personal">Личные</SelectItem>
                  <SelectItem value="financial">Финансовые</SelectItem>
                  <SelectItem value="other">Другое</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <label className="text-sm font-medium text-slate-900 dark:text-white">Содержание</label>
              <Textarea
                value={formData.content}
                onChange={(e) => setFormData({ ...formData, content: e.target.value })}
                placeholder="Введите текст заметки"
                className="mt-1 h-32"
              />
            </div>
            <div className="flex gap-2 pt-4">
              <Button
                variant="outline"
                onClick={() => setShowModal(false)}
                className="flex-1"
              >
                Отмена
              </Button>
              <Button
                onClick={handleSave}
                disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                className="flex-1 bg-gradient-to-r from-violet-600 to-indigo-600"
              >
                {editingNote ? 'Сохранить' : 'Создать'}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}