import React, { useState } from 'react';
import { Link, useParams, Navigate, useNavigate } from 'react-router-dom';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeft, Lock, CheckCircle2, ChevronRight, ChevronLeft, BookOpen, PlayCircle, ClipboardList, Video, Quote, Lightbulb, Image as ImageIcon, FileText } from 'lucide-react';
import { EDUCATION_MODULES, getEducationModule } from '@/data/educationTopics';
import { useEducationProgress } from '@/hooks/useEducationProgress';

// ============================================================
// EducationLesson.jsx — страница модуля обучения
// URL: /Education/:moduleId
// Показывает уроки модуля + тест для прохождения
// ============================================================
export default function EducationLesson() {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const module = getEducationModule(lessonId);
  const [expandedLesson, setExpandedLesson] = useState(null);
  const [testAnswers, setTestAnswers] = useState({});
  const [testSubmitted, setTestSubmitted] = useState(false);
  const [marking, setMarking] = useState(false);

  const moduleIndex = EDUCATION_MODULES.findIndex(m => m.id === lessonId);
  const prevModule = moduleIndex > 0 ? EDUCATION_MODULES[moduleIndex - 1] : null;
  const nextModule = moduleIndex < EDUCATION_MODULES.length - 1 ? EDUCATION_MODULES[moduleIndex + 1] : null;

  const {
    loading,
    isModuleUnlocked,
    isModuleCompleted,
    completeModule,
  } = useEducationProgress();

  if (!module) {
    return <Navigate to="/Education" replace />;
  }

  const unlocked = loading ? false : isModuleUnlocked(moduleIndex);
  const completed = isModuleCompleted(module.id);
  const Icon = module.icon;

  // Заблокированный модуль
  if (!loading && !unlocked) {
    return (
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
        <Link
          to="/Education"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Все модули
        </Link>

        <Card className="p-8 flex flex-col items-center text-center gap-4">
          <div className="w-16 h-16 rounded-2xl bg-muted flex items-center justify-center">
            <Lock className="w-7 h-7 text-muted-foreground" />
          </div>
          <h1 className="text-xl font-bold text-foreground">Модуль заблокирован</h1>
          <p className="text-sm text-muted-foreground max-w-md">
            Чтобы открыть модуль «{module.title}», сначала пройдите предыдущий модуль
            {prevModule ? ` «${prevModule.title}»` : ''}.
          </p>
          {prevModule && (
            <Button onClick={() => navigate(`/Education/${prevModule.id}`)} className="mt-2">
              Перейти к модулю «{prevModule.title}»
            </Button>
          )}
        </Card>
      </div>
    );
  }

  // Проверка теста
  const allQuestionsAnswered = module.test.questions.every((_, i) => testAnswers[i] !== undefined);
  const correctCount = module.test.questions.filter((q, i) => testAnswers[i] === q.correctIndex).length;
  const testPassed = testSubmitted && correctCount === module.test.questions.length;

  const handleAnswer = (questionIndex, optionIndex) => {
    setTestAnswers({ ...testAnswers, [questionIndex]: optionIndex });
  };

  const handleSubmitTest = () => {
    setTestSubmitted(true);
  };

  const handleCompleteModule = async () => {
    setMarking(true);
    await completeModule(module.id);
    setMarking(false);
    if (nextModule) {
      navigate(`/Education/${nextModule.id}`);
    } else {
      navigate('/Education');
    }
  };

  return (
    <div className="max-w-3xl mx-auto px-4 sm:px-6 py-8 pb-24 lg:pb-8">
      <Link
        to="/Education"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-6 transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Все модули
      </Link>

      {/* Заголовок модуля */}
      <div className="p-5 sm:p-6 rounded-2xl bg-card/90 backdrop-blur-sm border border-border shadow-sm">
        <div className="flex items-center gap-4">
          <div
            className="w-12 h-12 rounded-xl flex items-center justify-center flex-shrink-0"
            style={{ backgroundColor: `${module.color}1A` }}
          >
            <Icon className="w-6 h-6" style={{ color: module.color }} />
          </div>
          <div className="flex-1">
            <div className="flex items-center gap-2">
              <span className="text-xs font-medium text-muted-foreground">
                Модуль {module.number} из {EDUCATION_MODULES.length}
              </span>
              {completed && (
                <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" />
                  Пройден
                </span>
              )}
            </div>
            <h1 className="text-xl sm:text-2xl font-bold text-foreground">{module.title}</h1>
            <div className="text-sm text-muted-foreground">{module.description}</div>
          </div>
        </div>

        {/* Навигация между модулями */}
        <div className="mt-4 flex items-center gap-2 text-xs">
          {prevModule && (
            <Link to={`/Education/${prevModule.id}`} className="flex items-center gap-1 text-muted-foreground hover:text-foreground transition-colors">
              <ChevronLeft className="w-3.5 h-3.5" />
              {prevModule.title}
            </Link>
          )}
          {prevModule && nextModule && <span className="text-muted-foreground/40">·</span>}
          {nextModule && (
            <span className="flex items-center gap-1 text-muted-foreground ml-auto">
              {nextModule.title}
              <ChevronRight className="w-3.5 h-3.5" />
            </span>
          )}
        </div>
      </div>

      {/* Видеоконцепт */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <Video className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Видео-урок: {module.video.title}</h2>
          <span className="text-xs text-muted-foreground">· {module.video.duration}</span>
        </div>
        <Card className="p-0 overflow-hidden">
          {/* Слот для видео — будет заполнен позже */}
          <div className="aspect-video flex flex-col items-center justify-center gap-3 bg-muted/50">
            <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center">
              <PlayCircle className="w-7 h-7 text-muted-foreground" />
            </div>
            <span className="text-sm text-muted-foreground">Видео скоро будет добавлено</span>
          </div>
          <div className="p-4 border-t border-border">
            <div className="text-xs font-medium text-muted-foreground mb-1">Концепт видео</div>
            <p className="text-sm text-muted-foreground leading-relaxed">{module.video.concept}</p>
          </div>
        </Card>
      </div>

      {/* Уроки */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <BookOpen className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Уроки ({module.lessons.length})</h2>
        </div>
        <div className="space-y-2">
          {module.lessons.map((lesson, index) => {
            const isExpanded = expandedLesson === lesson.id;
            return (
              <Card key={lesson.id} className="overflow-hidden">
                <button
                  className="w-full flex items-center gap-3 p-4 text-left hover:bg-accent/50 transition-colors"
                  onClick={() => setExpandedLesson(isExpanded ? null : lesson.id)}
                >
                  <div
                    className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 text-sm font-semibold"
                    style={{ backgroundColor: `${module.color}1A`, color: module.color }}
                  >
                    {index + 1}
                  </div>
                  <span className="font-medium text-foreground text-sm flex-1">{lesson.title}</span>
                  <ChevronRight className={`w-4 h-4 text-muted-foreground transition-transform ${isExpanded ? 'rotate-90' : ''}`} />
                </button>

                {isExpanded && (
                  <div className="px-4 pb-4 pt-0 space-y-4">
                    {/* Теория */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <FileText className="w-3.5 h-3.5 text-muted-foreground" />
                        <span className="text-xs font-semibold text-muted-foreground">Теория урока</span>
                      </div>
                      <p className="text-sm text-foreground leading-relaxed">{lesson.theory}</p>
                    </div>

                    {/* Российская адаптация */}
                    <div>
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <Lightbulb className="w-3.5 h-3.5 text-amber-500" />
                        <span className="text-xs font-semibold text-muted-foreground">Российская адаптация</span>
                      </div>
                      <p className="text-sm text-muted-foreground leading-relaxed">{lesson.adaptation}</p>
                    </div>

                    {/* Библейское основание */}
                    <div className="p-3 rounded-lg bg-primary/5 border border-primary/10">
                      <div className="flex items-center gap-1.5 mb-1">
                        <Quote className="w-3.5 h-3.5 text-primary" />
                        <span className="text-xs font-semibold text-primary">Библейское основание</span>
                      </div>
                      <p className="text-sm text-foreground italic leading-relaxed">{lesson.verse}</p>
                    </div>

                    {/* Реальный кейс */}
                    {lesson.case && (
                      <div>
                        <div className="flex items-center gap-1.5 mb-1.5">
                          <BookOpen className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Реальный кейс</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{lesson.case}</p>
                      </div>
                    )}

                    {/* Описание слайда */}
                    {lesson.slide && (
                      <div className="p-3 rounded-lg bg-muted/30 border border-border">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ImageIcon className="w-3.5 h-3.5 text-muted-foreground" />
                          <span className="text-xs font-semibold text-muted-foreground">Описание слайда</span>
                        </div>
                        <p className="text-sm text-muted-foreground leading-relaxed">{lesson.slide}</p>
                      </div>
                    )}

                    {/* Практическое задание */}
                    {lesson.task && (
                      <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/20 border border-amber-200 dark:border-amber-900">
                        <div className="flex items-center gap-1.5 mb-1">
                          <ClipboardList className="w-3.5 h-3.5 text-amber-600 dark:text-amber-500" />
                          <span className="text-xs font-semibold text-amber-800 dark:text-amber-400">Практическое задание</span>
                        </div>
                        <p className="text-sm text-amber-900 dark:text-amber-300 leading-relaxed">{lesson.task}</p>
                      </div>
                    )}
                  </div>
                )}
              </Card>
            );
          })}
        </div>
      </div>

      {/* Проверочный тест */}
      <div className="mt-6">
        <div className="flex items-center gap-2 mb-3">
          <ClipboardList className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">Проверочный тест</h2>
        </div>
        <Card className="p-5 space-y-5">
          {module.test.questions.map((q, qIndex) => (
            <div key={qIndex}>
              <p className="text-sm font-medium text-foreground mb-3">
                {qIndex + 1}. {q.question}
              </p>
              <div className="space-y-2">
                {q.options.map((option, oIndex) => {
                  const isSelected = testAnswers[qIndex] === oIndex;
                  const isCorrect = q.correctIndex === oIndex;
                  const showResult = testSubmitted;

                  return (
                    <button
                      key={oIndex}
                      onClick={() => !testSubmitted && handleAnswer(qIndex, oIndex)}
                      disabled={testSubmitted}
                      className={`w-full flex items-center gap-3 p-3 rounded-lg border text-left text-sm transition-all ${
                        showResult && isCorrect
                          ? 'border-emerald-500 bg-emerald-500/5 text-emerald-700 dark:text-emerald-400'
                          : showResult && isSelected && !isCorrect
                          ? 'border-red-500 bg-red-500/5 text-red-700 dark:text-red-400'
                          : isSelected
                          ? 'border-primary bg-primary/5 text-foreground'
                          : 'border-border text-muted-foreground hover:bg-accent/50'
                      } ${testSubmitted ? 'cursor-default' : 'cursor-pointer'}`}
                    >
                      <span className={`w-5 h-5 rounded-full border flex items-center justify-center text-xs font-medium flex-shrink-0 ${
                        showResult && isCorrect
                          ? 'border-emerald-500 bg-emerald-500 text-white'
                          : showResult && isSelected && !isCorrect
                          ? 'border-red-500 bg-red-500 text-white'
                          : isSelected
                          ? 'border-primary bg-primary text-primary-foreground'
                          : 'border-border'
                      }`}>
                        {String.fromCharCode(1040 + oIndex)}
                      </span>
                      <span className="flex-1">{option}</span>
                      {showResult && isCorrect && <CheckCircle2 className="w-4 h-4 text-emerald-500 flex-shrink-0" />}
                    </button>
                  );
                })}
              </div>
            </div>
          ))}

          {/* Результат теста */}
          {testSubmitted && (
            <div className={`p-4 rounded-lg text-center ${
              testPassed
                ? 'bg-emerald-500/10 border border-emerald-500/20'
                : 'bg-red-500/10 border border-red-500/20'
            }`}>
              {testPassed ? (
                <>
                  <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto mb-2" />
                  <div className="font-semibold text-foreground">Тест пройден!</div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Все ответы верны. Вы можете завершить модуль.
                  </p>
                </>
              ) : (
                <>
                  <div className="font-semibold text-foreground">
                    Тест не пройден ({correctCount} из {module.test.questions.length})
                  </div>
                  <p className="text-sm text-muted-foreground mt-1">
                    Перепроверьте ответы и попробуйте снова.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => {
                      setTestSubmitted(false);
                      setTestAnswers({});
                    }}
                  >
                    Пройти заново
                  </Button>
                </>
              )}
            </div>
          )}

          {/* Кнопка отправки теста */}
          {!testSubmitted && (
            <Button
              className="w-full"
              disabled={!allQuestionsAnswered}
              onClick={handleSubmitTest}
            >
              Проверить ответы
            </Button>
          )}
          {!allQuestionsAnswered && !testSubmitted && (
            <p className="text-xs text-muted-foreground text-center">
              Ответьте на все вопросы для проверки
            </p>
          )}
        </Card>
      </div>

      {/* Кнопка завершения модуля */}
      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        {completed ? (
          <>
            <Button
              variant="outline"
              className="flex-1"
              onClick={() => navigate('/Education')}
            >
              <CheckCircle2 className="w-4 h-4 mr-2 text-emerald-500" />
              Модуль пройден
            </Button>
            {nextModule && (
              <Button
                className="flex-1"
                onClick={() => navigate(`/Education/${nextModule.id}`)}
              >
                Следующий модуль
                <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            )}
          </>
        ) : (
          <Button
            className="flex-1 h-11"
            disabled={marking || !testPassed}
            onClick={handleCompleteModule}
          >
            {marking ? 'Сохранение…' : (
              <>
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Завершить модуль
              </>
            )}
          </Button>
        )}
      </div>

      {!testPassed && !completed && (
        <p className="mt-2 text-xs text-muted-foreground text-center">
          Пройдите тест, чтобы завершить модуль и открыть следующий
        </p>
      )}

      {/* Финальное сообщение */}
      {completed && !nextModule && (
        <Card className="mt-6 p-6 text-center bg-emerald-500/5 border-emerald-500/20">
          <CheckCircle2 className="w-10 h-10 text-emerald-500 mx-auto mb-2" />
          <div className="font-semibold text-foreground">Поздравляем! Вы прошли весь курс!</div>
          <p className="text-sm text-muted-foreground mt-1">
            Вы изучили все 7 модулей библейских принципов управления финансами. Продолжайте применять их в жизни!
          </p>
        </Card>
      )}
    </div>
  );
}