import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { motion } from 'framer-motion';
import { X, Save, BookOpen } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const BIBLE_VERSES = [
  {
    text: "Любящий деньги не насытится деньгами; и любящий богатство не насытится доходом.",
    book: "Екклесиаст 5:10",
    theme: "О жадности"
  },
  {
    text: "Корень всех зол — любовь к деньгам; те, которые стремятся к ней, отступают от веры и мучат себя многими скорбями.",
    book: "1 Тимофею 6:10",
    theme: "О правильном отношении к деньгам"
  },
  {
    text: "Щедрый благословляется, потому что он делится своим хлебом с бедным.",
    book: "Притчи 22:9",
    theme: "О щедрости"
  },
  {
    text: "Кто любит серебро, никогда не насытится серебром; и кто любит богатство, никогда не насытится доходом.",
    book: "Екклесиаст 5:10",
    theme: "О материальных благах"
  },
  {
    text: "Не заботьтесь о завтрашнем дне, потому что завтрашний день сам будет заботиться о себе.",
    book: "Матфей 6:34",
    theme: "О тревогах и доверии"
  },
  {
    text: "Лучше мало с правдой, чем много с беззаконием.",
    book: "Притчи 16:8",
    theme: "О честности в бизнесе"
  },
  {
    text: "Честный труд приносит изобилие, а торопливость приводит к бедности.",
    book: "Притчи 21:5",
    theme: "О трудолюбии"
  },
  {
    text: "Богатство и честь со мною; драгоценные богатства и правда.",
    book: "Притчи 8:18",
    theme: "О истинном богатстве"
  }
];

export default function BibleVerse() {
  const [showModal, setShowModal] = useState(false);
  const [todayVerse, setTodayVerse] = useState(null);
  const [saveNoteTitle, setSaveNoteTitle] = useState('');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    checkAndShowVerse();
  }, []);

  const checkAndShowVerse = () => {
    try {
      const cached = localStorage.getItem('bible_verse_cache');
      if (!cached) {
        showTodayVerse();
        return;
      }

      const { date, verse } = JSON.parse(cached);
      const today = new Date().toDateString();
      const cacheDate = new Date(date).toDateString();

      if (today !== cacheDate) {
        showTodayVerse();
      } else {
        setTodayVerse(verse);
        // Show modal only once per day on first app open
        setShowModal(true);
      }
    } catch {
      showTodayVerse();
    }
  };

  const showTodayVerse = () => {
    const verse = BIBLE_VERSES[Math.floor(Math.random() * BIBLE_VERSES.length)];
    setTodayVerse(verse);
    
    try {
      localStorage.setItem('bible_verse_cache', JSON.stringify({
        verse,
        date: new Date().toISOString()
      }));
    } catch {
      console.error('Failed to cache verse');
    }

    setShowModal(true);
  };

  const handleSaveNote = async () => {
    if (!saveNoteTitle.trim() || !todayVerse) return;

    setSaving(true);
    try {
      await base44.entities.Note.create({
        title: saveNoteTitle,
        content: todayVerse.text,
        source: todayVerse.book,
        category: 'verse'
      });
      setShowModal(false);
      setSaveNoteTitle('');
    } catch (error) {
      console.error('Failed to save note:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={showModal} onOpenChange={setShowModal}>
      <DialogContent className="rounded-2xl max-w-md border-0 bg-gradient-to-br from-amber-50 to-orange-50 dark:from-amber-900/20 dark:to-orange-900/20">
        {todayVerse && (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2 text-amber-900 dark:text-amber-200">
                <BookOpen className="w-5 h-5" />
                Библейский стих дня
              </DialogTitle>
            </DialogHeader>

            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.2 }}
              className="space-y-6"
            >
              {/* Verse Display */}
              <div className="space-y-4">
                <div className="space-y-3 p-4 rounded-xl bg-white/60 dark:bg-slate-800/60">
                  <p className="text-base italic text-amber-950 dark:text-amber-100 leading-relaxed">
                    "{todayVerse.text}"
                  </p>
                  <p className="text-sm font-semibold text-amber-800 dark:text-amber-300">
                    — {todayVerse.book}
                  </p>
                  <p className="text-xs text-amber-700 dark:text-amber-400">
                    {todayVerse.theme}
                  </p>
                </div>
              </div>

              {/* Save Section */}
              <div className="space-y-3 border-t border-amber-200 dark:border-amber-800 pt-4">
                <Label className="text-sm text-amber-900 dark:text-amber-200">
                  Сохранить в заметки
                </Label>
                <Input
                  value={saveNoteTitle}
                  onChange={(e) => setSaveNoteTitle(e.target.value)}
                  placeholder="Название заметки"
                  className="rounded-lg border-amber-200 dark:border-amber-700 dark:bg-slate-800/50"
                  onKeyPress={(e) => e.key === 'Enter' && handleSaveNote()}
                />
                <Button
                  onClick={handleSaveNote}
                  disabled={!saveNoteTitle.trim() || saving}
                  className="w-full bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-700 hover:to-orange-700 text-white rounded-lg"
                >
                  <Save className="w-4 h-4 mr-2" />
                  {saving ? 'Сохранение...' : 'Сохранить'}
                </Button>
              </div>

              {/* Close Button */}
              <Button
                onClick={() => setShowModal(false)}
                variant="ghost"
                className="w-full text-amber-700 dark:text-amber-300 hover:bg-amber-100/50 dark:hover:bg-amber-900/20 rounded-lg"
              >
                Понял, спасибо
              </Button>
            </motion.div>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}