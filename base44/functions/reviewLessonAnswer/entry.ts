import { createClientFromRequest } from 'npm:@base44/sdk@0.8.52';

const buildPrompt = ({ questionText, scriptureRef, lessonContent, dayContent, answerText }) => {
  const context = [];
  if (dayContent) context.push(`Учебный материал дня:\n${dayContent}`);
  if (lessonContent) context.push(`Материал недели:\n${lessonContent}`);
  if (scriptureRef) context.push(`Место Писания для размышления: ${scriptureRef}`);
  const contextBlock = context.length ? `\n\n${context.join('\n\n')}` : '';
  return `Ты — бережный христианский наставник, помогающий студенту курса «Библейские принципы управления финансами» (Компас) осмыслить домашнее задание. Ты не выставляешь оценок и не судишь духовность студента. Твоя цель — поддержать, ободрить и помочь глубже увидеть связь ответа с библейскими принципами.

Вопрос или задание: ${questionText}${scriptureRef ? `\nОтрывок: ${scriptureRef}` : ''}${contextBlock}

Ответ студента:
${answerText}

Напиши бережную обратную связь (3–5 предложений) на русском языке:
1. Отметь, что студент осмыслил и где его ответ созвучен библейскому принципу.
2. При необходимости мягко задай один уточняющий вопрос или предложи направление для дальнейшего размышления.
3. Не навязывай трактовку как единственно возможную. Не поучай. Не пересказывай весь материал. Не ставь баллов.`;
};

export default async function(req) {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();
    if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 });
    const body = await req.json();
    const { answer_id } = body;
    if (!answer_id) return Response.json({ error: 'answer_id is required' }, { status: 400 });
    const data = base44.asServiceRole;
    let answer = await data.entities.LessonAnswer.get(answer_id);
    if (!answer) return Response.json({ error: 'Answer not found' }, { status: 404 });
    if (answer.user_id !== user.id && user.role !== 'admin') return Response.json({ error: 'Forbidden' }, { status: 403 });

    await data.entities.LessonAnswer.update(answer_id, { feedback_status: 'processing' });

    // If audio answer, transcribe first
    if (answer.answer_format === 'audio' && answer.audio_uri && !answer.answer_text) {
      const signedRes = await data.integrations.Core.CreateFileSignedUrl({ file_uri: answer.audio_uri, expires_in: 300 });
      const audioUrl = signedRes.signed_url;
      const transcription = await data.integrations.Core.TranscribeAudio({ audio_url: audioUrl });
      await data.entities.LessonAnswer.update(answer_id, { answer_text: transcription || '' });
      answer = { ...answer, answer_text: transcription || '' };
    }

    if (!answer.answer_text || answer.answer_text.trim().length < 2) {
      await data.entities.LessonAnswer.update(answer_id, { feedback_status: 'error' });
      return Response.json({ error: 'Ответ слишком короткий для комментария' }, { status: 400 });
    }

    const lesson = await data.entities.LearningLesson.get(answer.lesson_id);
    const day = lesson?.days?.[answer.day_index];
    const question = day?.questions?.[answer.question_index];
    const prompt = buildPrompt({
      questionText: answer.question_text || question?.text || '',
      scriptureRef: question?.scripture_ref || day?.scripture_ref || '',
      lessonContent: lesson?.content,
      dayContent: day?.content,
      answerText: answer.answer_text,
    });

    const llmRes = await data.integrations.Core.InvokeLLM({
      prompt,
      response_json_schema: {
        type: 'object',
        properties: { feedback: { type: 'string' } },
        required: ['feedback'],
      },
    });
    const feedback = typeof llmRes === 'string' ? llmRes : llmRes?.feedback || '';
    await data.entities.LessonAnswer.update(answer_id, {
      ai_feedback: feedback,
      feedback_status: 'done',
      feedback_at: new Date().toISOString(),
    });
    return Response.json({ feedback, status: 'done' });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
}