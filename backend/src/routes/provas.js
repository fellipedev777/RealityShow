const express = require('express');
const supabase = require('../config/database');
const { auth, adminOnly } = require('../middleware/auth');

const router = express.Router();

// GET /api/provas/active - Get active prova
router.get('/active', auth, async (req, res) => {
  try {
    const { data: prova, error } = await supabase
      .from('provas')
      .select(`
        *,
        questions(id, question_text, option_a, option_b, option_c, option_d, order_index),
        prova_scores(user_id, score, correct_count, users(name, photo_url))
      `)
      .in('status', ['waiting', 'active'])
      .order('created_at', { ascending: false })
      .limit(1)
      .single();

    if (error || !prova) return res.json({ prova: null });
    return res.json({ prova });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/provas/create - Admin creates a prova
router.post('/create', auth, adminOnly, async (req, res) => {
  try {
    const { type, title } = req.body;

    // Get 10 random questions from bank
    const { data: bankQuestions } = await supabase
      .from('question_bank')
      .select('*')
      .limit(100);

    const shuffled = (bankQuestions || []).sort(() => Math.random() - 0.5).slice(0, 10);

    const { data: prova, error } = await supabase
      .from('provas')
      .insert({ type, title, status: 'waiting', time_per_question: 15 })
      .select()
      .single();

    if (error) return res.status(500).json({ error: 'Erro ao criar prova' });

    const questionsToInsert = shuffled.map((q, i) => ({
      prova_id: prova.id,
      question_text: q.question_text,
      option_a: q.option_a,
      option_b: q.option_b,
      option_c: q.option_c,
      option_d: q.option_d,
      correct_answer: q.correct_answer,
      order_index: i
    }));

    await supabase.from('questions').insert(questionsToInsert);

    return res.status(201).json({ prova });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// POST /api/provas/:id/answer - Submit an answer
router.post('/:id/answer', auth, async (req, res) => {
  try {
    const { question_id, answer } = req.body;
    const { id: prova_id } = req.params;

    const { data: question } = await supabase
      .from('questions')
      .select('correct_answer')
      .eq('id', question_id)
      .single();

    if (!question) return res.status(404).json({ error: 'Pergunta não encontrada' });

    const is_correct = question.correct_answer === answer?.toUpperCase();

    const { error: answerError } = await supabase
      .from('prova_answers')
      .upsert({
        prova_id,
        question_id,
        user_id: req.user.id,
        answer: answer?.toUpperCase(),
        is_correct
      });

    if (answerError) return res.status(500).json({ error: 'Erro ao salvar resposta' });

    // Update score
    const { data: existingScore } = await supabase
      .from('prova_scores')
      .select('*')
      .eq('prova_id', prova_id)
      .eq('user_id', req.user.id)
      .single();

    if (existingScore) {
      await supabase.from('prova_scores').update({
        score: existingScore.score + (is_correct ? 10 : 0),
        answers_count: existingScore.answers_count + 1,
        correct_count: existingScore.correct_count + (is_correct ? 1 : 0),
        updated_at: new Date().toISOString()
      }).eq('id', existingScore.id);
    } else {
      await supabase.from('prova_scores').insert({
        prova_id,
        user_id: req.user.id,
        score: is_correct ? 10 : 0,
        answers_count: 1,
        correct_count: is_correct ? 1 : 0
      });
    }

    return res.json({ is_correct, correct_answer: question.correct_answer });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

// GET /api/provas/:id/scores - Get live scores
router.get('/:id/scores', auth, async (req, res) => {
  try {
    const { data: scores, error } = await supabase
      .from('prova_scores')
      .select('*, users(id, name, photo_url)')
      .eq('prova_id', req.params.id)
      .order('score', { ascending: false });

    if (error) return res.status(500).json({ error: 'Erro ao buscar pontuações' });
    return res.json({ scores });
  } catch (err) {
    return res.status(500).json({ error: 'Erro interno' });
  }
});

module.exports = router;
