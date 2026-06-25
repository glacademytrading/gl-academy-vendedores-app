import React, { useEffect, useMemo, useState } from "react";
import api, { formatApiError } from "@/lib/api";
import { smartPt } from "@/lib/utils";
import { toast } from "sonner";
import DecisionBuilder, {
  evaluateDecision,
  getDecisionFields,
  getDecisionMode,
  inferDecisionExpected,
  isDecisionComplete,
} from "@/components/DecisionBuilder";
import { CheckCircle2, AlertTriangle, RefreshCcw, Lock } from "lucide-react";

const MAX_ATTEMPTS = 3;
const SCORE_BY_ATTEMPT = { 1: 100, 2: 70, 3: 40 };

function plural(count, singular, pluralText) {
  return `${count} ${count === 1 ? singular : pluralText}`;
}

function getAttemptDiagnostics(attempt, question) {
  if (!attempt || !question) return null;

  const correctIds = attempt.correct_option_ids || question.correct_option_ids || [];
  const selectedIds = attempt.selected_option_ids || [];
  const correct = new Set(correctIds);
  const selected = new Set(selectedIds);
  const correctSelectedIds =
    attempt.correct_selected_option_ids || selectedIds.filter((id) => correct.has(id));
  const missingCorrectIds =
    attempt.missing_correct_option_ids || correctIds.filter((id) => !selected.has(id));
  const extraOptionIds =
    attempt.extra_option_ids || selectedIds.filter((id) => !correct.has(id));

  const correctCount = attempt.correct_count ?? correctIds.length;
  const selectedCount = attempt.selected_count ?? selectedIds.length;
  const correctSelectedCount = attempt.correct_selected_count ?? correctSelectedIds.length;
  const missingCount = missingCorrectIds.length;
  const extraCount = extraOptionIds.length;

  let headline = "A leitura ainda não encaixou.";
  let guidance = "Revise a aula e recomece pelo checklist do que foi ensinado neste modulo.";

  if (attempt.is_correct) {
    headline = `Acerto na tentativa ${attempt.attempt_number} (+${attempt.score} pts)`;
    guidance = "Leitura completa: as alternativas escolhidas sustentam a tese sem excesso.";
  } else if (correctSelectedCount > 0 && missingCount > 0 && extraCount === 0) {
    headline = `Quase: você marcou ${correctSelectedCount}/${correctCount}, mas faltou ${plural(missingCount, "leitura obrigatória", "leituras obrigatórias")}.`;
    guidance = "Voce mandou bem na direcao. Releia a pagina de apoio procurando qual ponto da aula ainda nao entrou na resposta.";
  } else if (correctSelectedCount > 0 && extraCount > 0) {
    headline = `Parte da tese está certa, mas entrou ${plural(extraCount, "alternativa que não sustenta", "alternativas que não sustentam")} o plano.`;
    guidance = "Separe o que confirma a tese do que parece atraente, mas não passa pelo filtro de risco e contexto.";
  } else if (missingCount === 0 && extraCount > 0) {
    headline = `A base está certa, mas sobrou ${plural(extraCount, "alternativa", "alternativas")} fora do plano.`;
    guidance = "Corte o excesso: resposta boa também precisa recusar o que não faz parte da tese.";
  } else if (selectedCount < correctCount) {
    headline = `Faltou completar a leitura: marque exatamente ${correctCount} alternativas.`;
    guidance = "Use o checklist acima para achar o ponto da aula que ainda faltou.";
  } else if (selectedCount > correctCount) {
    headline = `Tem escolhas demais para esta tese: refine até ${correctCount} alternativas.`;
    guidance = "Quando tudo parece importante, volte para a pergunta central e mantenha só o que decide a operação.";
  }

  return {
    correctSelectedIds,
    missingCorrectIds,
    extraOptionIds,
    correctSelectedCount,
    missingCount,
    extraCount,
    correctCount,
    selectedCount,
    headline,
    guidance,
  };
}

/**
 * Quiz multi-select component.
 * Props:
 *   question: { id, prompt, options:[{id,text}], correct_option_ids, feedback_correct, feedback_incorrect }
 *   moduleId: module id
 *   scope: 'module' | 'challenge' | 'knowledge'
 *   requireDecision: bool (default true for module)
 *   onResolved: callback when correct OR exhausted
 *   onReplayRequested: optional callback when the parent wants to highlight the lesson before retrying
 */
export default function Quiz({
  question,
  moduleId,
  module,
  scope = "module",
  requireDecision = true,
  onResolved,
  onReplayRequested,
}) {
  const [attempts, setAttempts] = useState([]);
  const [selected, setSelected] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [decision, setDecision] = useState({});
  const [needReplay, setNeedReplay] = useState(false);

  const correctCount = useMemo(() => question?.correct_option_ids?.length || 0, [question]);
  const requireAllCorrect = !!module?.require_all_correct;
  const maxAttempts = requireAllCorrect ? null : MAX_ATTEMPTS;

  const loadAttempts = async () => {
    try {
      const { data } = await api.get(`/attempts/by-question/${question.id}`, {
        params: { module_id: moduleId, scope },
      });
      setAttempts(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    if (question?.id) {
      loadAttempts();
      setSelected([]);
      setNeedReplay(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [question?.id, moduleId, scope]);

  const lastAttempt = attempts[attempts.length - 1];
  const resolved = !!(lastAttempt?.is_correct) || (!!maxAttempts && attempts.length >= maxAttempts);
  const attemptsLeft = maxAttempts ? Math.max(0, maxAttempts - attempts.length) : null;
  const nextAttemptNumber = attempts.length + 1;
  const lastDiagnostics = useMemo(() => getAttemptDiagnostics(lastAttempt, question), [lastAttempt, question]);
  const decisionMode = useMemo(() => getDecisionMode(module), [module]);
  const decisionFields = useMemo(() => getDecisionFields(module), [module]);
  const decisionRequired = requireDecision && decisionFields.length > 0;
  const expectedDecision = useMemo(
    () => inferDecisionExpected(question, module, decisionFields),
    [question, module, decisionFields]
  );
  const decisionReview = useMemo(
    () => evaluateDecision(decision, expectedDecision, decisionFields),
    [decision, expectedDecision, decisionFields]
  );

  const toggleOption = (id) => {
    if (resolved || needReplay) return;
    setSelected((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  };

  const decisionOk = !decisionRequired || isDecisionComplete(decision, decisionFields);

  const submit = async () => {
    if (!decisionOk) {
      toast.warning("Preencha o checklist antes do quiz.");
      return;
    }
    if (decisionRequired && decisionReview.status === "warn") {
      toast.warning("Seu checklist tem camadas divergentes. O quiz ainda vai corrigir a leitura final.");
    }
    if (selected.length === 0) {
      toast.warning("Selecione ao menos uma alternativa.");
      return;
    }
    setSubmitting(true);
    try {
      const { data } = await api.post("/attempts", {
        question_id: question.id,
        module_id: moduleId,
        scope,
        selected_option_ids: selected,
        decision_input: decisionRequired ? decision : null,
      });
      setAttempts((prev) => [...prev, data]);
      setSelected([]);
      if (data.is_correct) {
        toast.success(`Acerto +${data.score} pts`);
        if (onResolved) onResolved({ correct: true, score: data.score });
      } else {
        const diagnostics = getAttemptDiagnostics(data, question);
        if (maxAttempts && attempts.length + 1 >= maxAttempts) {
          toast.error("Tentativas esgotadas. Veja o diagnóstico e siga para revisão.");
          if (onResolved) onResolved({ correct: false, score: 0 });
        } else {
          const retryMessage = diagnostics?.headline || "Resposta incompleta. Revise a aula antes de tentar de novo.";
          if ((diagnostics?.correctSelectedCount || 0) > 0) toast.warning(retryMessage);
          else toast.error(retryMessage);
          setNeedReplay(true);
          if (onReplayRequested) onReplayRequested(question.checkpoint_seconds || 0);
        }
      }
    } catch (e) {
      toast.error(formatApiError(e));
    } finally {
      setSubmitting(false);
    }
  };

  if (!question) return null;

  return (
    <div className="gl-panel p-5 lg:p-6 gl-fade-in" data-testid={`quiz-${question.id}`}>
      <div className="flex items-start justify-between gap-3 flex-wrap mb-2">
        <div>
          <span className="gl-eyebrow">
            {scope === "challenge" ? "Desafio prático" : scope === "knowledge" ? "Pergunta de fechamento" : "Teste prático"}
          </span>
          <h3 className="text-lg lg:text-xl mt-1">Quiz multi-resposta</h3>
        </div>
        <div className="flex items-center gap-2">
          <span className="gl-tag">{`${correctCount} corretas · ${question.options?.length || 0} opções`}</span>
          <span className="gl-tag gl-tag-gold">
            {maxAttempts
              ? `Tentativa ${Math.min(nextAttemptNumber, maxAttempts)}/${maxAttempts}`
              : `Tentativa ${nextAttemptNumber} · acerte para concluir`}
          </span>
        </div>
      </div>

      <p className="gl-text-muted text-[15px] my-3">{smartPt(question.prompt)}</p>

      {decisionRequired && !resolved && (
        <div className="my-4">
          <DecisionBuilder
            value={decision}
            onChange={setDecision}
            locked={submitting}
            hint="obrigatório"
            expected={expectedDecision}
            fields={decisionFields}
            mode={decisionMode}
          />
        </div>
      )}

      <div className="grid gap-2 my-4">
        {question.options?.map((opt) => {
          const isSelected = selected.includes(opt.id);
          const wasLastSelected = lastAttempt?.selected_option_ids?.includes(opt.id);
          const isCorrect = question.correct_option_ids?.includes(opt.id);
          let cls = "";
          if (resolved) {
            if (isCorrect) cls = "correct";
            else if (wasLastSelected && !isCorrect) cls = "incorrect";
          } else if (needReplay && wasLastSelected) {
            cls = isCorrect ? "partial" : "incorrect";
          } else if (isSelected) cls = "selected";
          const checked = resolved ? isCorrect : needReplay ? !!wasLastSelected : isSelected;
          return (
            <label
              key={opt.id}
              className={`gl-option ${cls}`}
              data-testid={`quiz-option-${opt.id}`}
            >
              <input
                type="checkbox"
                checked={checked}
                disabled={resolved || needReplay}
                onChange={() => toggleOption(opt.id)}
              />
              <div>
                <strong className="block text-sm leading-snug">{smartPt(opt.text)}</strong>
                {resolved && isCorrect && <span className="gl-text-green text-xs mt-1 inline-block">resposta correta</span>}
                {!resolved && needReplay && wasLastSelected && isCorrect && (
                  <span className="gl-text-green text-xs mt-1 inline-block">boa leitura marcada</span>
                )}
                {!resolved && needReplay && wasLastSelected && !isCorrect && (
                  <span className="gl-text-red text-xs mt-1 inline-block">não sustenta esta tese</span>
                )}
              </div>
            </label>
          );
        })}
      </div>

      {!resolved && !needReplay && (
        <div className="gl-selection-meter" data-testid="quiz-selection-meter">
          <span>
            {selected.length === correctCount
              ? "Quantidade certa. Agora confira a qualidade das escolhas."
              : `Marque exatamente ${correctCount} alternativas.`}
          </span>
          <strong>{selected.length}/{correctCount} selecionadas</strong>
        </div>
      )}

      {/* feedback for last attempt */}
      {lastAttempt && (
        <div
          className={`gl-feedback ${lastAttempt.is_correct ? "good" : lastDiagnostics?.correctSelectedCount > 0 ? "warn" : "bad"}`}
          data-testid="quiz-feedback"
        >
          <div className="flex items-center gap-2 mb-1">
            {lastAttempt.is_correct ? <CheckCircle2 size={16} /> : <AlertTriangle size={16} />}
            <strong>
              {lastAttempt.is_correct
                ? `Acerto na tentativa ${lastAttempt.attempt_number} (+${lastAttempt.score} pts)`
                : lastDiagnostics?.headline || `Tentativa ${lastAttempt.attempt_number} incompleta`}
            </strong>
          </div>
          {!lastAttempt.is_correct && lastDiagnostics && (
            <div className="gl-quiz-diagnostics" data-testid="quiz-diagnostics">
              <span>Boas: {lastDiagnostics.correctSelectedCount}/{lastDiagnostics.correctCount}</span>
              <span>Faltaram: {lastDiagnostics.missingCount}</span>
              <span>Sobraram: {lastDiagnostics.extraCount}</span>
            </div>
          )}
          <span>{smartPt(lastAttempt.feedback)}</span>
          {!lastAttempt.is_correct && lastDiagnostics?.guidance && (
            <span className="block mt-2 font-semibold">{lastDiagnostics.guidance}</span>
          )}
        </div>
      )}

      {needReplay && !resolved && (
        <div className="gl-feedback warn mt-3" data-testid="quiz-need-replay">
          <div className="flex items-center gap-2 mb-1">
            <RefreshCcw size={16} />
            <strong>Revise o diagnóstico antes de tentar novamente</strong>
          </div>
          <span>
            Releia a pagina de apoio e ajuste seu checklist com base no que faltou ou sobrou. Tentativa {attempts.length + 1} valera {SCORE_BY_ATTEMPT[Math.min(attempts.length + 1, 3)]} pts.
          </span>
          <div className="mt-3">
            <button
              data-testid="quiz-confirm-replay"
              className="gl-ghost-btn"
              onClick={() => setNeedReplay(false)}
            >
              Revisar e tentar novamente
            </button>
          </div>
        </div>
      )}

      <div className="mt-4 flex flex-wrap gap-2 items-center">
        {!resolved && (
          <button
            type="button"
            data-testid="quiz-submit"
            className="gl-primary-btn"
            disabled={submitting || needReplay || (decisionRequired && !decisionOk) || selected.length === 0}
            onClick={submit}
          >
            {submitting ? "Avaliando…" : "Responder"}
          </button>
        )}
        {resolved && (
          <div className="flex items-center gap-2 gl-text-muted text-sm">
            {lastAttempt?.is_correct ? (
              <span className="gl-tag gl-tag-green">resolvido</span>
            ) : (
              <span className="gl-tag gl-tag-red flex items-center gap-1">
                <Lock size={12} /> tentativas esgotadas
              </span>
            )}
            <span>Acertos: {attempts.filter((a) => a.is_correct).length} · Tentativas: {attempts.length}</span>
          </div>
        )}
        {!resolved && maxAttempts && attemptsLeft < maxAttempts && (
          <span className="gl-text-soft text-xs">{attemptsLeft} tentativa(s) restante(s)</span>
        )}
        {!resolved && !maxAttempts && (
          <span className="gl-text-soft text-xs">Você pode revisar e tentar novamente até acertar.</span>
        )}
      </div>
    </div>
  );
}
