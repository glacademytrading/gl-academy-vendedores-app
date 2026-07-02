"""GL Model Academy — Backend (FastAPI + MongoDB)."""
from dotenv import load_dotenv
from pathlib import Path

ROOT_DIR = Path(__file__).parent
load_dotenv(ROOT_DIR / ".env")

import os
import logging
import hashlib
import secrets
import smtplib
import json
import unicodedata
from email.message import EmailMessage
from datetime import datetime, timezone
from typing import List, Optional, Dict, Any

from fastapi import FastAPI, APIRouter, HTTPException, Request, Response, Depends
from starlette.middleware.cors import CORSMiddleware
from motor.motor_asyncio import AsyncIOMotorClient

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    create_refresh_token,
    set_auth_cookies,
    clear_auth_cookies,
    get_current_user,
    require_admin,
    check_brute_force,
    record_failed_login,
    clear_login_attempts,
    get_jwt_secret,
)
import jwt as pyjwt
from models import (
    UserRegister,
    UserLogin,
    PasswordResetRequest,
    PasswordResetConfirm,
    UserPublic,
    OnboardingData,
    AttemptCreate,
    DecisionInput,
    JournalCreate,
    LessonDoneInput,
    ModuleUpdate,
    QuestionUpdate,
    UpsellUpdate,
    NewsUpdateCreate,
    MarketReportCreate,
    EmailTestRequest,
    AccessCodeCreate,
    AccessCodeUpdate,
    StudentAdminAction,
    CommissionCreate,
    CommissionAdminAction,
    new_id,
    utc_now_iso,
)
from seed_loader import seed_admin, seed_content, ensure_indexes

try:
    from pywebpush import WebPushException, webpush
except Exception:  # optional in local builds
    WebPushException = Exception
    webpush = None

# === MongoDB ===
mongo_url = os.environ["MONGO_URL"]
client = AsyncIOMotorClient(mongo_url)
db = client[os.environ["DB_NAME"]]

# === FastAPI ===
app = FastAPI(title="GL Academy Sales Training API")
api = APIRouter(prefix="/api")


@app.on_event("startup")
async def on_startup() -> None:
    await ensure_indexes(db)
    await seed_admin(db)
    await seed_content(db)
    logging.info("Startup complete: admin seeded, content seeded.")


@app.on_event("shutdown")
async def on_shutdown() -> None:
    client.close()


def _sanitize(doc: Optional[dict]) -> Optional[dict]:
    if not doc:
        return doc
    doc.pop("_id", None)
    return doc


def _public_user(user: dict) -> dict:
    return {
        "id": user["id"],
        "email": user["email"],
        "name": user.get("name", ""),
        "role": user.get("role", "student"),
        "account_status": user.get("account_status", "active"),
        "has_onboarded": user.get("has_onboarded", False),
        "onboarding": user.get("onboarding"),
        "created_at": user.get("created_at"),
        "last_login_at": user.get("last_login_at"),
        "login_count": user.get("login_count", 0),
        "entitlements": user.get("entitlements", []),
    }


def _client_meta(request: Request) -> dict:
    forwarded_for = request.headers.get("x-forwarded-for", "")
    ip = forwarded_for.split(",")[0].strip() if forwarded_for else (request.client.host if request.client else "unknown")
    return {
        "ip": ip,
        "user_agent": request.headers.get("user-agent", ""),
    }


async def _record_access_event(
    event_type: str,
    request: Request,
    user_id: Optional[str] = None,
    email: Optional[str] = None,
    success: bool = True,
    reason: str = "",
    metadata: Optional[Dict[str, Any]] = None,
) -> None:
    meta = _client_meta(request)
    await db.access_events.insert_one({
        "id": new_id(),
        "event_type": event_type,
        "user_id": user_id,
        "email": (email or "").lower().strip(),
        "success": success,
        "reason": reason,
        "ip": meta["ip"],
        "user_agent": meta["user_agent"],
        "metadata": metadata or {},
        "created_at": utc_now_iso(),
    })


def _normalize_access_code(code: Optional[str]) -> str:
    return (code or "").strip().upper()


def _registration_requires_approval() -> bool:
    return os.environ.get("REGISTRATION_REQUIRE_APPROVAL", "true").strip().lower() != "false"


def _parse_iso_datetime(value: Optional[str]) -> Optional[datetime]:
    if not value:
        return None
    try:
        if value.endswith("Z"):
            value = value[:-1] + "+00:00"
        dt = datetime.fromisoformat(value)
        if dt.tzinfo is None:
            dt = dt.replace(tzinfo=timezone.utc)
        return dt
    except Exception:
        return None


def _access_code_public(doc: dict) -> dict:
    now = datetime.now(timezone.utc)
    expires_at = _parse_iso_datetime(doc.get("expires_at"))
    max_uses = doc.get("max_uses")
    uses_count = doc.get("uses_count", 0)
    expired = bool(expires_at and expires_at < now)
    exhausted = bool(max_uses and uses_count >= max_uses)
    return {
        "id": doc.get("id"),
        "code": doc.get("code"),
        "label": doc.get("label", ""),
        "code_type": doc.get("code_type", "turma"),
        "max_uses": max_uses,
        "uses_count": uses_count,
        "remaining_uses": max(0, max_uses - uses_count) if max_uses else None,
        "expires_at": doc.get("expires_at"),
        "active": doc.get("active", True),
        "auto_approve": doc.get("auto_approve", False),
        "entitlement": doc.get("entitlement", ""),
        "notes": doc.get("notes", ""),
        "created_at": doc.get("created_at"),
        "last_used_at": doc.get("last_used_at"),
        "expired": expired,
        "exhausted": exhausted,
        "usable": bool(doc.get("active", True) and not expired and not exhausted),
    }


async def _resolve_access_code(payload_code: Optional[str]) -> Optional[dict]:
    code = _normalize_access_code(payload_code)
    required = "VIVERDEGLACADEMY"
    if code == required:
        return {
            "id": None,
            "code": code,
            "label": "Codigo da equipe GL Academy",
            "code_type": "equipe",
            "auto_approve": False,
            "entitlement": "",
            "legacy": True,
        }
    raise HTTPException(status_code=403, detail="Codigo de acesso invalido. Peca o codigo da equipe a gestao.")


def _has_entitlement(user: dict, entitlement: str) -> bool:
    if user.get("role") == "admin":
        return True
    return bool(entitlement and entitlement in (user.get("entitlements") or []))


def _module_allowed(user: dict, module: dict) -> bool:
    if not module.get("locked"):
        return True
    return _has_entitlement(user, module.get("required_entitlement", ""))


def _module_release_locked(user: dict, module: dict) -> bool:
    if user.get("role") == "admin" or module.get("locked"):
        return False
    status = (module.get("release_status") or "available").strip().lower()
    if status not in {"recording", "coming_soon", "draft"}:
        return False
    return not bool((module.get("lesson") or {}).get("video_url"))


def _normalize_shared_value(value: Any) -> str:
    text = unicodedata.normalize("NFKD", str(value or ""))
    text = "".join(ch for ch in text if not unicodedata.combining(ch))
    return " ".join(text.lower().split())


def _module_shared_key(module: dict) -> str:
    explicit = module.get("shared_lesson_key") or module.get("equivalence_key")
    if explicit:
        return f"shared:{_normalize_shared_value(explicit)}"
    video_url = ((module.get("lesson") or {}).get("video_url") or "").strip().lower()
    if video_url:
        return f"video:{video_url}"
    return f"module:{module.get('id')}"


def _option_text_by_id(question: dict) -> dict:
    return {
        option.get("id"): _normalize_shared_value(option.get("text") or option.get("label") or option.get("body"))
        for option in question.get("options", [])
    }


def _question_shared_key(question: dict) -> str:
    explicit = question.get("shared_question_key") or question.get("equivalence_key")
    if explicit:
        return f"shared:{_normalize_shared_value(explicit)}"
    prompt = _normalize_shared_value(question.get("prompt") or question.get("title") or question.get("body"))
    if not prompt:
        return f"question:{question.get('id')}"
    options = _option_text_by_id(question)
    correct_texts = sorted(options.get(option_id, _normalize_shared_value(option_id)) for option_id in question.get("correct_option_ids", []))
    return f"prompt:{prompt}|correct:{'|'.join(correct_texts)}"


def _equivalent_modules(module: dict, all_modules: Optional[list] = None) -> list:
    modules = all_modules or [module]
    key = _module_shared_key(module)
    matches = [candidate for candidate in modules if _module_shared_key(candidate) == key]
    return matches or [module]


def _equivalent_module_ids(module: dict, all_modules: Optional[list] = None) -> set:
    return {candidate.get("id") for candidate in _equivalent_modules(module, all_modules) if candidate.get("id")}


def _equivalent_question_refs(module: dict, question: dict, all_modules: Optional[list] = None) -> list:
    question_key = _question_shared_key(question)
    refs = []
    seen = set()
    for candidate in _equivalent_modules(module, all_modules):
        for candidate_question in candidate.get("questions", []):
            if _question_shared_key(candidate_question) != question_key:
                continue
            key = (candidate.get("id"), candidate_question.get("id"))
            if key in seen:
                continue
            seen.add(key)
            refs.append((candidate, candidate_question))
    return refs or [(module, question)]


def _attempt_sort_key(attempt: dict) -> tuple:
    return (str(attempt.get("created_at") or ""), int(attempt.get("attempt_number") or 0))


def _map_option_ids_between_questions(option_ids: list, source_question: dict, target_question: dict) -> list:
    if source_question.get("id") == target_question.get("id"):
        return option_ids
    source_options = _option_text_by_id(source_question)
    target_options = {text: option_id for option_id, text in _option_text_by_id(target_question).items() if text}
    mapped = []
    for option_id in option_ids or []:
        mapped.append(target_options.get(source_options.get(option_id), option_id))
    return mapped


def _project_attempt_for_question(attempt: dict, source_question: dict, target_module: dict, target_question: dict) -> dict:
    projected = dict(attempt)
    selected = _map_option_ids_between_questions(projected.get("selected_option_ids", []), source_question, target_question)
    projected["source_module_id"] = attempt.get("module_id")
    projected["source_question_id"] = attempt.get("question_id")
    projected["module_id"] = target_module.get("id")
    projected["question_id"] = target_question.get("id")
    projected["selected_option_ids"] = selected
    projected["correct_option_ids"] = target_question.get("correct_option_ids", [])
    projected["feedback"] = target_question.get("feedback_correct") if projected.get("is_correct") else target_question.get("feedback_incorrect")
    projected.update(_attempt_diagnostics(target_question, selected))
    return projected


def _module_progress_from_attempts(module: dict, attempts: list, lesson_progress: list, all_modules: Optional[list] = None) -> dict:
    questions = module.get("questions", [])
    require_all_correct = bool(module.get("require_all_correct"))
    resolved = 0
    for question in questions:
        refs = {
            (candidate.get("id"), candidate_question.get("id"))
            for candidate, candidate_question in _equivalent_question_refs(module, question, all_modules)
        }
        q_atts = [
            a
            for a in attempts
            if a.get("scope") == "module"
            and (a.get("module_id"), a.get("question_id")) in refs
        ]
        if not q_atts:
            continue
        last = max(q_atts, key=_attempt_sort_key)
        if last.get("is_correct") or (not require_all_correct and len(q_atts) >= 3):
            resolved += 1
    equivalent_ids = _equivalent_module_ids(module, all_modules)
    lesson_done = any(lp.get("module_id") in equivalent_ids for lp in lesson_progress)
    percent = round((resolved / len(questions)) * 100) if questions else (100 if lesson_done else 0)
    return {
        "total_questions": len(questions),
        "resolved": resolved,
        "percent": percent,
        "lesson_done": lesson_done,
    }


def _module_completed(progress: dict) -> bool:
    if not progress.get("lesson_done"):
        return False
    total_questions = progress.get("total_questions") or 0
    if total_questions == 0:
        return True
    return (progress.get("percent") or 0) >= 100


async def _module_sequence_status(user: dict, module: dict) -> dict:
    if user.get("role") == "admin" or (module.get("order") or 0) <= 1:
        return {"allowed": True}
    sequence_group = module.get("sequence_group") or module.get("track") or ""
    previous_query = {"order": {"$lt": module.get("order", 0)}}
    if sequence_group:
        previous_query["sequence_group"] = sequence_group
    previous = await db.modules.find_one(previous_query, {"_id": 0}, sort=[("order", -1)])
    if not previous or previous.get("locked"):
        return {"allowed": True}
    attempts = await db.attempts.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    lesson_progress = await db.lesson_progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    all_modules = await db.modules.find({}, {"_id": 0}).to_list(200)
    progress = _module_progress_from_attempts(previous, attempts, lesson_progress, all_modules)
    if _module_completed(progress):
        return {"allowed": True}
    return {
        "allowed": False,
        "required_module_id": previous.get("id"),
        "required_module_title": previous.get("title"),
        "required_module_order": previous.get("order"),
    }


async def _module_unlock_status(user: dict, module: dict) -> dict:
    requirements = module.get("unlock_requirements") or {}
    if not requirements:
        return {"allowed": True}

    required_modules = requirements.get("completed_module_ids") or []
    min_accuracy = requirements.get("min_overall_accuracy")
    attempts = await db.attempts.find({"user_id": user["id"], "scope": "module"}, {"_id": 0}).to_list(5000)
    lesson_progress = await db.lesson_progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(500)
    all_modules = await db.modules.find({}, {"_id": 0}).to_list(200)
    module_by_id = {m["id"]: m for m in all_modules}

    missing = []
    for module_id in required_modules:
        required_module = module_by_id.get(module_id)
        if not required_module:
            missing.append(module_id)
            continue
        progress = _module_progress_from_attempts(required_module, attempts, lesson_progress, all_modules)
        if not _module_completed(progress):
            missing.append(module_id)

    metrics = await _compute_user_metrics(user["id"])
    current_accuracy = metrics.get("overall_accuracy", 0)
    accuracy_ok = min_accuracy is None or current_accuracy >= min_accuracy
    allowed = not missing and accuracy_ok
    return {
        "allowed": allowed,
        "required_modules": required_modules,
        "missing_modules": sorted(set(missing)),
        "min_overall_accuracy": min_accuracy,
        "current_accuracy": current_accuracy,
        "accuracy_ok": accuracy_ok,
    }


def _module_preview(module: dict, reason: str = "premium", unlock_status: Optional[dict] = None) -> dict:
    preview = dict(module)
    preview["questions"] = []
    if reason == "release":
        preview["locked"] = False
        preview["release_locked"] = True
        preview["release_status"] = preview.get("release_status") or "recording"
        preview["lesson"] = {
            **preview.get("lesson", {}),
            "video_url": "",
            "text": preview.get("release_message")
            or "Aula em gravacao. Ela ficara disponivel assim que o video oficial entrar na plataforma.",
        }
        preview["lesson_page"] = {
            "headline": preview.get("release_label") or "Aula em gravacao",
            "sections": [
                {
                    "title": "Conteudo em preparacao",
                    "body": preview.get("release_message")
                    or "Esta aula ja esta planejada na jornada, mas fica bloqueada ate o video oficial ser publicado.",
                    "bullets": [
                        "Continue revisando as aulas ja liberadas.",
                        "Use o diario disciplinar para consolidar sua leitura.",
                        "Volte a trilha quando o mentor publicar a proxima aula.",
                    ],
                }
            ],
            "checklist": ["Revisar a aula anterior.", "Refazer checkpoints fracos.", "Aguardar a liberacao oficial."],
            "mission": "Enquanto esta aula nao abre, registre uma leitura real no Diario Disciplinar usando o que voce ja estudou.",
        }
        preview["practical"] = {
            "title": "Proximo conteudo em gravacao",
            "context": "A jornada foi montada para crescer junto com a mentoria completa.",
            "goal": "Evitar que o aluno pule para uma aula sem video ou sem fechamento oficial.",
            "lens": ["em gravacao", "trilha", "mentoria completa"],
        }
    elif reason == "sequence":
        required_title = (unlock_status or {}).get("required_module_title") or "a aula anterior"
        required_order = (unlock_status or {}).get("required_module_order")
        label = f"Aula {str(required_order).zfill(2)}" if required_order else "Aula anterior"
        preview["locked"] = False
        preview["sequence_locked"] = True
        preview["progress_locked"] = True
        preview["unlock_status"] = unlock_status or {}
        preview["lesson"] = {
            **preview.get("lesson", {}),
            "video_url": "",
            "text": f"Conclua {label}: {required_title} antes de avancar para esta aula.",
        }
        preview["lesson_page"] = {
            "headline": "Aula bloqueada pela sequencia da trilha",
            "sections": [
                {
                    "title": "Como liberar",
                    "body": "A GL Model Academy foi organizada como uma jornada guiada. Para abrir esta aula, conclua a etapa anterior primeiro.",
                    "bullets": [
                        "Assista a aula anterior.",
                        "Marque a aula como estudada.",
                        "Quando houver teste, resolva todos os checkpoints praticos.",
                    ],
                }
            ],
            "checklist": [f"Concluir {label}: {required_title}.", "Voltar para esta aula quando o app liberar."],
            "mission": "Volte para a trilha e complete a etapa anterior antes de avancar.",
        }
        preview["practical"] = {
            "title": "Sequencia protegida",
            "context": "O aluno evolui melhor quando nao pula fundamento.",
            "goal": "Manter a ordem da mentoria e evitar lacunas no raciocinio operacional.",
            "lens": ["sequencia", "fundamento", "disciplina"],
        }
    elif reason == "progress":
        preview["locked"] = False
        preview["progress_locked"] = True
        preview["unlock_status"] = unlock_status or {}
        preview["lesson"] = {
            **preview.get("lesson", {}),
            "video_url": "",
            "text": "Aprofundamento bloqueado por evolucao. Conclua os modulos exigidos e mantenha o aproveitamento minimo para liberar.",
        }
        preview["lesson_page"] = {
            "headline": "Aprofundamento liberado por evolucao",
            "sections": [
                {
                    "title": "Como liberar",
                    "body": "Este conteudo faz parte da mentoria completa. Ele abre quando o aluno conclui os modulos base indicados e atinge o aproveitamento minimo.",
                    "bullets": [
                        "Assista aos modulos exigidos.",
                        "Resolva os checkpoints com acerto.",
                        "Use o relatorio para revisar tags fracas.",
                    ],
                }
            ],
            "checklist": [
                "Concluir os modulos exigidos.",
                "Atingir o aproveitamento minimo.",
                "Revisar pontos fracos antes de tentar acelerar.",
            ],
            "mission": "Volte ao plano de 7 dias do relatorio e fortaleza a base antes de abrir este aprofundamento.",
        }
        preview["practical"] = {
            "title": "Proximo passo por desempenho",
            "context": "O app libera aulas robustas quando a leitura base estiver consistente.",
            "goal": "Evitar que o aluno pule para assunto avancado antes de dominar a micromentoria.",
            "lens": ["evolucao", "relatorio", "mentoria completa"],
        }
    else:
        preview["lesson"] = {
            **preview.get("lesson", {}),
            "video_url": "",
            "text": "Conteudo premium do GL Risk Auto. Assista ao workshop para entender a disciplina de risco.",
        }
        preview["lesson_page"] = {}
        preview["practical"] = {
            "title": "Modulo premium GL Risk Auto",
            "context": "Gerenciamento de risco para passar e sobreviver em mesa proprietaria.",
            "goal": "Entender folga, drawdown, tamanho, pausa e rotina antes de operar uma avaliacao.",
            "lens": ["risco", "drawdown", "prop firm", "GL Risk Auto"],
        }
        preview["premium_preview"] = True
    return preview


RISK_PREMIUM_TAGS = {"prop_firm_risk", "risk_auto", "risk_presets", "drawdown", "mes_micro"}


def _knowledge_allowed(user: dict, page: dict) -> bool:
    if not page.get("locked") and not any(tag in RISK_PREMIUM_TAGS for tag in page.get("tags", [])):
        return True
    return _has_entitlement(user, page.get("required_entitlement", "gl_risk_auto"))


def _knowledge_preview(page: dict) -> dict:
    preview = dict(page)
    preview["cards"] = [
        {
            "title": "Conteudo premium GL Risk Auto",
            "body": "Esta pagina faz parte do treinamento de gerenciamento de risco para passar e sobreviver em mesa proprietaria.",
            "cue": "Assista ao workshop para entender o proximo passo.",
        }
    ]
    preview["practice"] = "Assista ao GL Risk Auto Workshop antes de estudar folga, drawdown, MES, presets e finalizacao.";
    preview["questions"] = []
    preview["premium_preview"] = True
    return preview


NEWS_UPDATES = [
    {
        "id": "news-welcome-2026-07-02",
        "tag": "Bem-vindos",
        "title": "Bem-vindos ao app da equipe GL Academy",
        "body": "Sejam bem-vindos ao ambiente interno da equipe. Aqui voces acompanham os comunicados oficiais, acessam as trilhas da sua funcao e enviam seus relatorios para aprovacao.",
        "created_at": "2026-07-02T09:00:00-03:00",
        "action_url": "",
    },
]

LEGACY_NEWS_IDS = {
    "news-prod-ready",
    "news-risk-workshop",
    "news-kickoff-sales",
    "news-record-commission",
    "news-market-payroll",
}


MARKET_REPORTS = [
    {
        "id": "market-modelo-01",
        "period": "Modelo diario",
        "title": "S&P 500 e Nasdaq: roteiro de leitura antes da abertura",
        "tone": "neutro",
        "created_at": "2026-05-25T08:30:00-03:00",
        "bullets": [
            "Marcar maxima, minima, VWAP, POC, VAH e VAL do dia anterior.",
            "Separar se o indice abre dentro do valor, acima do valor ou abaixo do valor.",
            "Observar se tecnologia/Nasdaq esta liderando ou divergindo do S&P 500.",
            "Definir o que invalida compra, venda ou pausa antes do primeiro trade.",
        ],
        "watchlist": ["ES", "NQ", "SPY", "QQQ", "VIX", "DXY"],
    },
    {
        "id": "market-modelo-02",
        "period": "3x por semana",
        "title": "Mapa macro para aluno GL",
        "tone": "cautela",
        "created_at": "2026-05-25T12:00:00-03:00",
        "bullets": [
            "Checar calendario economico antes de qualquer decisao intraday.",
            "Comparar juros, dolar, VIX e setores lideres antes de assumir direcao.",
            "Em dia de noticia forte, reduzir tamanho, esperar leilao abrir e evitar operar por ansiedade.",
        ],
        "watchlist": ["Calendario", "VIX", "DXY", "Treasuries", "Setores"],
    },
]


# Password reset helpers
def _hash_reset_token(token: str) -> str:
    return hashlib.sha256(token.encode("utf-8")).hexdigest()


async def _send_password_reset_email(email: str, link: str) -> bool:
    host = os.environ.get("SMTP_HOST", "").strip()
    if not host:
        return False

    port = int(os.environ.get("SMTP_PORT", "587"))
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM", user or "no-reply@glacademy.local")

    msg = EmailMessage()
    msg["Subject"] = "Recuperacao de senha - GL Academy Sales Training"
    msg["From"] = sender
    msg["To"] = email
    msg.set_content(
        "Recebemos um pedido para redefinir sua senha no GL Academy Sales Training.\n\n"
        f"Acesse este link em ate 30 minutos:\n{link}\n\n"
        "Se voce nao pediu isso, ignore este e-mail."
    )

    try:
        smtp_class = smtplib.SMTP_SSL if port == 465 else smtplib.SMTP
        with smtp_class(host, port, timeout=15) as smtp:
            if port != 465:
                smtp.starttls()
            if user:
                smtp.login(user, password)
            smtp.send_message(msg)
        return True
    except Exception:
        logging.exception("Falha ao enviar e-mail de recuperacao de senha")
        return False


def _smtp_status() -> dict:
    host = os.environ.get("SMTP_HOST", "").strip()
    user = os.environ.get("SMTP_USER", "").strip()
    password = os.environ.get("SMTP_PASSWORD", "")
    sender = os.environ.get("SMTP_FROM", "").strip()
    allows_no_auth = os.environ.get("SMTP_ALLOW_NO_AUTH", "false").lower() == "true"
    return {
        "configured": bool(host and (sender or user) and ((user and password) or allows_no_auth)),
        "has_host": bool(host),
        "has_user": bool(user),
        "has_password": bool(password),
        "has_sender": bool(sender or user),
        "allows_no_auth": allows_no_auth,
    }


async def _broadcast_push(title: str, body: str, url: str = "/novidades", user_id: Optional[str] = None) -> dict:
    vapid_private = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    vapid_email = os.environ.get("VAPID_CLAIM_EMAIL", "mailto:contato@glacademy.com.br").strip()
    if not webpush or not vapid_private:
        return {"ok": False, "sent": 0, "failed": 0, "reason": "Configure pywebpush e VAPID_PRIVATE_KEY no backend."}

    query = {"user_id": user_id} if user_id else {}
    subs = await db.push_subscriptions.find(query, {"_id": 0}).to_list(5000)
    sent = 0
    failed = 0
    payload = json.dumps({"title": title, "body": body, "url": url or "/novidades"})
    for sub in subs:
        try:
            webpush(
                subscription_info=sub["subscription"],
                data=payload,
                vapid_private_key=vapid_private,
                vapid_claims={"sub": vapid_email},
            )
            sent += 1
        except WebPushException:
            failed += 1
            logging.exception("Falha ao enviar push")
    return {"ok": sent > 0, "sent": sent, "failed": failed, "subscribers": len(subs)}


# ====================
# AUTH
# ====================
@api.post("/auth/register")
async def register(payload: UserRegister, request: Request, response: Response):
    email = payload.email.lower().strip()
    allowed_team_roles = {"recrutador", "recrutador_tecnico", "ativo", "tecnico"}
    team_roles = list(dict.fromkeys(role for role in payload.team_roles if role in allowed_team_roles))
    if not team_roles and payload.team_role in allowed_team_roles:
        team_roles = [payload.team_role]
    team_role = team_roles[0] if team_roles else ""
    onboarding_complete = bool(
        team_roles
        and (payload.experience or "").strip()
        and (payload.goal or "").strip()
        and (payload.challenge or "").strip()
    )
    if not onboarding_complete:
        raise HTTPException(
            status_code=422,
            detail="Responda todas as quatro perguntas antes de enviar o cadastro para aprovação.",
        )
    try:
        access_code = await _resolve_access_code(payload.access_code)
    except HTTPException as exc:
        await _record_access_event("register_denied", request, email=email, success=False, reason=str(exc.detail))
        raise
    existing = await db.users.find_one({"email": email})
    if existing:
        raise HTTPException(status_code=409, detail="E-mail já cadastrado")
    user_id = new_id()
    now = utc_now_iso()
    code_entitlement = (access_code or {}).get("entitlement") or ""
    entitlements = [code_entitlement] if code_entitlement else []
    auto_approve = bool((access_code or {}).get("auto_approve"))
    account_status = "active" if auto_approve or not _registration_requires_approval() else "pending"
    doc = {
        "id": user_id,
        "email": email,
        "password_hash": hash_password(payload.password),
        "name": payload.name.strip(),
        "role": "student",
        "account_status": account_status,
        "entitlements": entitlements,
        "has_onboarded": onboarding_complete,
        "onboarding": {
            "role": team_role,
            "roles": team_roles,
            "experience": (payload.experience or "").strip(),
            "goal": (payload.goal or "").strip(),
            "challenge": (payload.challenge or "").strip(),
        } if team_role or onboarding_complete else None,
        "last_login_at": None,
        "login_count": 0,
        "registration_code": (access_code or {}).get("code", _normalize_access_code(payload.access_code)),
        "registration_code_id": (access_code or {}).get("id"),
        "registration_code_label": (access_code or {}).get("label", ""),
        "registration_code_type": (access_code or {}).get("code_type", ""),
        "registration_ip": _client_meta(request)["ip"],
        "registration_user_agent": _client_meta(request)["user_agent"],
        "approval_required": account_status == "pending",
        "approved_at": now if account_status == "active" else None,
        "approved_by": "auto" if account_status == "active" else None,
        "created_at": now,
    }
    await db.users.insert_one(doc)
    if access_code and access_code.get("id"):
        await db.access_codes.update_one(
            {"id": access_code["id"]},
            {"$inc": {"uses_count": 1}, "$set": {"last_used_at": now}},
        )
    await _record_access_event(
        "register",
        request,
        user_id=user_id,
        email=email,
        reason=account_status,
        metadata={
            "registration_code_id": (access_code or {}).get("id"),
            "registration_code_label": (access_code or {}).get("label", ""),
            "registration_code_type": (access_code or {}).get("code_type", ""),
        },
    )
    if account_status != "active":
        return {**_public_user(doc), "approval_required": True}
    access = create_access_token(user_id, email, "student")
    refresh = create_refresh_token(user_id)
    set_auth_cookies(response, access, refresh)
    return {**_public_user(doc), "access_token": access, "refresh_token": refresh}


@api.post("/auth/login")
async def login(payload: UserLogin, request: Request, response: Response):
    email = payload.email.lower().strip()
    ip = _client_meta(request)["ip"]
    identifier = f"{ip}:{email}"
    await check_brute_force(db, identifier)

    user = await db.users.find_one({"email": email})
    if not user or not verify_password(payload.password, user.get("password_hash", "")):
        await record_failed_login(db, identifier)
        await _record_access_event("login_failed", request, email=email, success=False, reason="invalid_credentials")
        raise HTTPException(status_code=401, detail="E-mail ou senha incorretos")
    if user.get("role") != "admin" and user.get("account_status", "active") != "active":
        status = user.get("account_status", "pending")
        await _record_access_event("login_blocked", request, user_id=user.get("id"), email=email, success=False, reason=status)
        if status == "blocked":
            raise HTTPException(status_code=403, detail="Acesso bloqueado. Fale com a equipe GL Academy.")
        raise HTTPException(status_code=403, detail="Cadastro aguardando aprovacao da equipe GL Academy.")

    await clear_login_attempts(db, identifier)
    login_at = utc_now_iso()
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": {"last_login_at": login_at}, "$inc": {"login_count": 1}},
    )
    user["last_login_at"] = login_at
    user["login_count"] = user.get("login_count", 0) + 1
    await _record_access_event("login_success", request, user_id=user["id"], email=email)
    access = create_access_token(user["id"], user["email"], user.get("role", "student"))
    refresh = create_refresh_token(user["id"])
    set_auth_cookies(response, access, refresh)
    return {**_public_user(user), "access_token": access, "refresh_token": refresh}


@api.post("/auth/logout")
async def logout(request: Request, response: Response):
    try:
        user = await get_current_user(request, db)
        await _record_access_event("logout", request, user_id=user["id"], email=user.get("email"))
    except Exception:
        pass
    clear_auth_cookies(response)
    return {"ok": True}


@api.get("/auth/me")
async def me(request: Request):
    user = await get_current_user(request, db)
    return _public_user(user)


@api.post("/auth/refresh")
async def refresh(request: Request, response: Response):
    token = request.cookies.get("refresh_token")
    if not token:
        raise HTTPException(status_code=401, detail="No refresh token")
    try:
        payload = pyjwt.decode(token, get_jwt_secret(), algorithms=["HS256"])
        if payload.get("type") != "refresh":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("role") != "admin" and user.get("account_status", "active") != "active":
            raise HTTPException(status_code=403, detail="Cadastro aguardando aprovacao ou bloqueado.")
        access = create_access_token(user["id"], user["email"], user.get("role", "student"))
        new_refresh = create_refresh_token(user["id"])
        set_auth_cookies(response, access, new_refresh)
        return {"ok": True}
    except pyjwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Refresh token expired")
    except pyjwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid refresh token")


@api.post("/auth/password-reset/request")
async def password_reset_request(payload: PasswordResetRequest, request: Request):
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    expose = os.environ.get("PASSWORD_RESET_EXPOSE_TOKEN", "false").lower() == "true"

    if not user:
        await _record_access_event("password_reset_request_unknown", request, email=email, success=True)
        return {"ok": True, "email_configured": bool(os.environ.get("SMTP_HOST"))}

    token = secrets.token_urlsafe(40)
    expires_at = datetime.now(timezone.utc).timestamp() + 30 * 60
    await db.password_reset_tokens.delete_many({"user_id": user["id"]})
    await db.password_reset_tokens.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "email": email,
        "token_hash": _hash_reset_token(token),
        "expires_at": expires_at,
        "used_at": None,
        "created_at": utc_now_iso(),
    })

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    link = f"{frontend_url}/reset-password?token={token}"
    sent = await _send_password_reset_email(email, link)
    await _record_access_event("password_reset_request", request, user_id=user["id"], email=email, success=sent)

    result = {"ok": True, "email_configured": sent}
    if expose:
        result["reset_token"] = token
        result["reset_link"] = link
    return result


@api.post("/auth/password-reset/confirm")
async def password_reset_confirm(payload: PasswordResetConfirm, request: Request):
    token_hash = _hash_reset_token(payload.token)
    rec = await db.password_reset_tokens.find_one({"token_hash": token_hash, "used_at": None})
    if not rec or rec.get("expires_at", 0) < datetime.now(timezone.utc).timestamp():
        raise HTTPException(status_code=400, detail="Link de recuperacao invalido ou expirado")

    await db.users.update_one(
        {"id": rec["user_id"]},
        {"$set": {"password_hash": hash_password(payload.password)}},
    )
    await db.password_reset_tokens.update_one(
        {"id": rec["id"]},
        {"$set": {"used_at": utc_now_iso()}},
    )
    await _record_access_event("password_reset_confirm", request, user_id=rec["user_id"], email=rec.get("email"), success=True)
    return {"ok": True}


# ====================
# NOTIFICATIONS
# ====================
@api.get("/notifications/config")
async def notifications_config(request: Request):
    await get_current_user(request, db)
    public_key = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
    private_key = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    return {
        "enabled": bool(public_key and private_key and webpush),
        "vapid_public_key": public_key,
    }


@api.post("/notifications/subscribe")
async def notifications_subscribe(payload: Dict[str, Any], request: Request):
    user = await get_current_user(request, db)
    endpoint = payload.get("endpoint")
    if not endpoint:
        raise HTTPException(status_code=400, detail="Assinatura push invalida")
    await db.push_subscriptions.update_one(
        {"user_id": user["id"], "endpoint": endpoint},
        {"$set": {"user_id": user["id"], "endpoint": endpoint, "subscription": payload, "created_at": utc_now_iso()}},
        upsert=True,
    )
    return {"ok": True}


@api.post("/notifications/test")
async def notifications_test(request: Request):
    user = await get_current_user(request, db)
    return await _broadcast_push(
        "GL Academy",
        "Notificacao teste ativada com sucesso.",
        "/novidades",
        user_id=user["id"],
    )


# ====================
# USER
# ====================
@api.post("/user/onboarding")
async def save_onboarding(payload: OnboardingData, request: Request):
    user = await get_current_user(request, db)
    allowed_team_roles = {"recrutador", "recrutador_tecnico", "ativo", "tecnico"}
    onboarding = payload.model_dump()
    onboarding["roles"] = list(dict.fromkeys(role for role in onboarding.get("roles", []) if role in allowed_team_roles))
    if not onboarding["roles"] and onboarding.get("role") in allowed_team_roles:
        onboarding["roles"] = [onboarding["role"]]
    onboarding["role"] = onboarding["roles"][0] if onboarding["roles"] else onboarding.get("role", "")
    needs_approval = user.get("role") != "admin" and _registration_requires_approval()
    update = {
        "has_onboarded": True,
        "onboarding": onboarding,
    }
    if needs_approval:
        update.update({
            "account_status": "pending",
            "approval_required": True,
            "approved_at": None,
            "approved_by": None,
        })
    await db.users.update_one(
        {"id": user["id"]},
        {"$set": update},
    )
    updated = await db.users.find_one({"id": user["id"]})
    return {**_public_user(updated), "approval_required": needs_approval}


@api.delete("/user/account")
async def delete_account(request: Request, response: Response):
    user = await get_current_user(request, db)
    if user.get("role") == "admin":
        raise HTTPException(status_code=400, detail="Conta admin nao pode ser excluida por este fluxo")

    user_id = user["id"]
    await db.attempts.delete_many({"user_id": user_id})
    await db.lesson_progress.delete_many({"user_id": user_id})
    await db.user_badges.delete_many({"user_id": user_id})
    await db.journal_entries.delete_many({"user_id": user_id})
    await db.commission_requests.delete_many({"user_id": user_id})
    await db.password_reset_tokens.delete_many({"user_id": user_id})
    await db.access_events.update_many(
        {"user_id": user_id},
        {"$set": {"user_id": None, "email": "deleted-user"}},
    )
    await db.users.delete_one({"id": user_id})
    clear_auth_cookies(response)
    return {"ok": True}


# ====================
# CONTENT (public-ish, but require auth)
# ====================
@api.get("/content/app-info")
async def app_info():
    info = await db.app_info.find_one({"_singleton": True})
    return _sanitize(info) or {}


@api.get("/content/app-config")
async def app_config():
    cfg = await db.app_config.find_one({"_singleton": True})
    return _sanitize(cfg) or {}


@api.get("/content/modules")
async def list_modules(request: Request):
    user = await get_current_user(request, db)
    cursor = db.modules.find({}, {"_id": 0}).sort("order", 1)
    modules = await cursor.to_list(length=200)
    # Attach per-user progress
    attempts = await db.attempts.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    lesson_progress = await db.lesson_progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    completion_by_id = {}
    for idx, m in enumerate(modules):
        release_locked_for_user = _module_release_locked(user, m)
        locked_for_user = not _module_allowed(user, m)
        unlock_status = await _module_unlock_status(user, m)
        progress_locked_for_user = not unlock_status.get("allowed", True)
        m["progress"] = _module_progress_from_attempts(m, attempts, lesson_progress, modules)
        completion_by_id[m["id"]] = _module_completed(m["progress"])
        sequence_group = m.get("sequence_group") or m.get("track") or ""
        previous_candidates = [
            candidate
            for candidate in modules
            if candidate.get("id") != m.get("id")
            and (candidate.get("sequence_group") or candidate.get("track") or "") == sequence_group
            and (candidate.get("order") or 0) < (m.get("order") or 0)
        ]
        previous = max(previous_candidates, key=lambda candidate: candidate.get("order") or 0) if previous_candidates else None
        sequence_status = {"allowed": True}
        if previous and user.get("role") != "admin" and not release_locked_for_user and not locked_for_user:
            if not completion_by_id.get(previous["id"], False):
                sequence_status = {
                    "allowed": False,
                    "required_module_id": previous.get("id"),
                    "required_module_title": previous.get("title"),
                    "required_module_order": previous.get("order"),
                }
        if release_locked_for_user:
            modules[idx] = _module_preview(m, "release")
        elif locked_for_user:
            modules[idx] = _module_preview(m, "premium")
        elif not sequence_status.get("allowed", True):
            modules[idx] = _module_preview(m, "sequence", sequence_status)
        elif progress_locked_for_user:
            modules[idx] = _module_preview(m, "progress", unlock_status)
    return modules


@api.get("/content/modules/{module_id}")
async def get_module(module_id: str, request: Request):
    user = await get_current_user(request, db)
    m = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if not m:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    attempts = await db.attempts.find({"user_id": user["id"]}, {"_id": 0}).to_list(2000)
    lesson_progress = await db.lesson_progress.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    all_modules = await db.modules.find({}, {"_id": 0}).to_list(200)
    m["progress"] = _module_progress_from_attempts(m, attempts, lesson_progress, all_modules)
    if _module_release_locked(user, m):
        return _module_preview(m, "release")
    if not _module_allowed(user, m):
        return _module_preview(m, "premium")
    sequence_status = await _module_sequence_status(user, m)
    if not sequence_status.get("allowed", True):
        return _module_preview(m, "sequence", sequence_status)
    unlock_status = await _module_unlock_status(user, m)
    if not unlock_status.get("allowed", True):
        return _module_preview(m, "progress", unlock_status)
    return m


@api.post("/content/modules/{module_id}/lesson-done")
async def mark_lesson_done(module_id: str, request: Request):
    user = await get_current_user(request, db)
    module = await db.modules.find_one({"id": module_id}, {"_id": 0})
    if module and _module_release_locked(user, module):
        raise HTTPException(status_code=403, detail="Aula em gravacao. Aguarde a liberacao oficial do mentor.")
    if module and not _module_allowed(user, module):
        raise HTTPException(status_code=403, detail="Modulo premium do GL Risk Auto. Libere acesso antes de concluir.")
    if module:
        sequence_status = await _module_sequence_status(user, module)
        if not sequence_status.get("allowed", True):
            raise HTTPException(status_code=403, detail="Conclua a aula anterior antes de avancar nesta etapa.")
    if module:
        unlock_status = await _module_unlock_status(user, module)
        if not unlock_status.get("allowed", True):
            raise HTTPException(status_code=403, detail="Aprofundamento bloqueado por evolucao. Conclua os requisitos antes de marcar como estudado.")
    all_modules = await db.modules.find({}, {"_id": 0}).to_list(200)
    module_ids = sorted(_equivalent_module_ids(module, all_modules)) if module else [module_id]
    completed_at = utc_now_iso()
    for synced_module_id in module_ids:
        await db.lesson_progress.update_one(
            {"user_id": user["id"], "module_id": synced_module_id},
            {"$set": {"user_id": user["id"], "module_id": synced_module_id, "completed_at": completed_at}},
            upsert=True,
        )
    return {"ok": True, "synced_module_ids": module_ids}


@api.get("/content/journey-stages")
async def journey_stages():
    docs = await db.journey_stages.find({}, {"_id": 0}).to_list(50)
    return docs


@api.get("/content/learning-layers")
async def learning_layers():
    docs = await db.learning_layers.find({}, {"_id": 0}).to_list(50)
    return docs


@api.get("/content/core-families")
async def core_families():
    docs = await db.core_families.find({}, {"_id": 0}).to_list(50)
    return docs


@api.get("/content/hud-readings")
async def hud_readings():
    docs = await db.hud_readings.find({}, {"_id": 0}).to_list(50)
    return docs


@api.get("/content/knowledge")
async def knowledge_pages_list(request: Request):
    user = await get_current_user(request, db)
    docs = await db.knowledge_pages.find({}, {"_id": 0}).to_list(100)
    docs = [_knowledge_preview(doc) if not _knowledge_allowed(user, doc) else doc for doc in docs]
    return docs


@api.get("/content/knowledge/{page_id}")
async def knowledge_page_detail(page_id: str, request: Request):
    user = await get_current_user(request, db)
    doc = await db.knowledge_pages.find_one({"id": page_id}, {"_id": 0})
    if not doc:
        raise HTTPException(status_code=404, detail="Página não encontrada")
    if not _knowledge_allowed(user, doc):
        return _knowledge_preview(doc)
    return doc


@api.get("/content/learning-drills")
async def learning_drills():
    docs = await db.learning_drills.find({}, {"_id": 0}).sort("order", 1).to_list(20)
    return docs


@api.get("/content/challenges")
async def challenges_list(request: Request):
    user = await get_current_user(request, db)
    docs = await db.challenges.find({}, {"_id": 0}).to_list(100)
    for doc in docs:
        entitlement = doc.get("required_entitlement", "")
        if entitlement and not _has_entitlement(user, entitlement):
            doc["locked"] = True
    return docs


@api.get("/content/news")
async def news_list(request: Request):
    await get_current_user(request, db)
    docs = await db.news_updates.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    docs = [doc for doc in docs if doc.get("id") not in LEGACY_NEWS_IDS]
    return docs or NEWS_UPDATES


@api.get("/content/market-reports")
async def market_reports_list(request: Request):
    await get_current_user(request, db)
    docs = await db.market_reports.find({}, {"_id": 0}).sort("created_at", -1).to_list(100)
    return docs or MARKET_REPORTS


@api.get("/content/badges")
async def badges_list(request: Request):
    user = await get_current_user(request, db)
    all_badges = await db.badges.find({}, {"_id": 0}).to_list(100)
    earned = await db.user_badges.find({"user_id": user["id"]}, {"_id": 0}).to_list(200)
    earned_ids = {ub["badge_id"] for ub in earned}
    for b in all_badges:
        b["earned"] = b["id"] in earned_ids
    return all_badges


# ====================
# ATTEMPTS (quiz)
# ====================
def _scoring(attempt_number: int, is_correct: bool) -> int:
    if not is_correct:
        return 0
    table = {1: 100, 2: 70, 3: 40}
    return table.get(attempt_number, 40)


def _attempt_diagnostics(question: dict, selected_option_ids: List[str]) -> Dict[str, Any]:
    correct_ids = list(question.get("correct_option_ids", []))
    selected_ids = list(selected_option_ids)
    correct = set(correct_ids)
    selected = set(selected_ids)
    correct_selected = [oid for oid in selected_ids if oid in correct]
    missing_correct = [oid for oid in correct_ids if oid not in selected]
    extra_options = [oid for oid in selected_ids if oid not in correct]

    return {
        "correct_selected_option_ids": correct_selected,
        "missing_correct_option_ids": missing_correct,
        "extra_option_ids": extra_options,
        "correct_selected_count": len(correct_selected),
        "correct_count": len(correct_ids),
        "selected_count": len(selected_ids),
    }


@api.get("/attempts/by-question/{question_id}")
async def attempts_by_question(
    question_id: str,
    request: Request,
    module_id: Optional[str] = None,
    scope: Optional[str] = None,
):
    user = await get_current_user(request, db)
    if module_id and (scope or "module") == "module":
        module = await db.modules.find_one({"id": module_id}, {"_id": 0})
        question = next((q for q in (module or {}).get("questions", []) if q.get("id") == question_id), None)
        if module and question:
            all_modules = await db.modules.find({}, {"_id": 0}).to_list(200)
            refs = _equivalent_question_refs(module, question, all_modules)
            pairs = [{"module_id": candidate.get("id"), "question_id": candidate_question.get("id")} for candidate, candidate_question in refs]
            docs = await db.attempts.find(
                {
                    "user_id": user["id"],
                    "scope": "module",
                    "$or": pairs,
                },
                {"_id": 0},
            ).to_list(100)
            source_by_pair = {
                (candidate.get("id"), candidate_question.get("id")): candidate_question
                for candidate, candidate_question in refs
            }
            projected = [
                _project_attempt_for_question(
                    doc,
                    source_by_pair.get((doc.get("module_id"), doc.get("question_id")), question),
                    module,
                    question,
                )
                for doc in docs
            ]
            return sorted(projected, key=_attempt_sort_key)
    q = {"user_id": user["id"], "question_id": question_id}
    if module_id:
        q["module_id"] = module_id
    if scope:
        q["scope"] = scope
    docs = await db.attempts.find(q, {"_id": 0}).sort("attempt_number", 1).to_list(20)
    return docs


@api.post("/attempts")
async def create_attempt(payload: AttemptCreate, request: Request):
    user = await get_current_user(request, db)
    # Locate the question. It lives inside modules.questions, knowledge_pages.questions ref, or challenges.question_id
    module = await db.modules.find_one({"id": payload.module_id}, {"_id": 0})
    if not module:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    if _module_release_locked(user, module):
        raise HTTPException(status_code=403, detail="Aula em gravacao. Aguarde a liberacao oficial do mentor.")
    if not _module_allowed(user, module):
        raise HTTPException(status_code=403, detail="Modulo premium do GL Risk Auto. Assista ao workshop para liberar o proximo passo.")
    sequence_status = await _module_sequence_status(user, module)
    if not sequence_status.get("allowed", True):
        raise HTTPException(status_code=403, detail="Conclua a aula anterior antes de responder este teste.")
    unlock_status = await _module_unlock_status(user, module)
    if not unlock_status.get("allowed", True):
        raise HTTPException(status_code=403, detail="Aprofundamento bloqueado por evolucao. Conclua os requisitos antes de responder.")
    all_modules = await db.modules.find({}, {"_id": 0}).to_list(200)
    if (module.get("lesson") or {}).get("require_full_video"):
        watched = await db.lesson_progress.find_one({
            "user_id": user["id"],
            "module_id": {"$in": sorted(_equivalent_module_ids(module, all_modules))},
        })
        if not watched:
            raise HTTPException(status_code=403, detail="Assista ao video completo antes de responder o questionario.")
    question = None
    for q in module.get("questions", []):
        if q["id"] == payload.question_id:
            question = q
            break
    if not question:
        # search all modules (some knowledge/challenge questions may live elsewhere)
        all_mods = all_modules
        for m in all_mods:
            for q in m.get("questions", []):
                if q["id"] == payload.question_id:
                    question = q
                    module = m
                    break
            if question:
                break
    if not question:
        raise HTTPException(status_code=404, detail="Questão não encontrada")

    # count previous attempts for this question, including equivalent lessons/questions
    previous_query = {
        "user_id": user["id"],
        "scope": payload.scope,
    }
    if payload.scope == "module":
        refs = _equivalent_question_refs(module, question, all_modules)
        previous_query["$or"] = [
            {"module_id": candidate.get("id"), "question_id": candidate_question.get("id")}
            for candidate, candidate_question in refs
        ]
    else:
        previous_query.update({
            "question_id": payload.question_id,
            "module_id": payload.module_id,
        })
    prev = await db.attempts.count_documents(previous_query)
    if prev >= 3 and not module.get("require_all_correct"):
        raise HTTPException(status_code=400, detail="Limite de tentativas atingido")

    attempt_number = prev + 1
    correct = set(question["correct_option_ids"])
    chosen = set(payload.selected_option_ids)
    is_correct = correct == chosen
    score = _scoring(attempt_number, is_correct)
    diagnostics = _attempt_diagnostics(question, payload.selected_option_ids)

    doc = {
        "id": new_id(),
        "user_id": user["id"],
        "question_id": payload.question_id,
        "module_id": payload.module_id,
        "scope": payload.scope,
        "selected_option_ids": payload.selected_option_ids,
        "correct_option_ids": question["correct_option_ids"],
        "is_correct": is_correct,
        "score": score,
        "attempt_number": attempt_number,
        "decision_input": payload.decision_input.model_dump() if payload.decision_input else None,
        "feedback": question.get("feedback_correct") if is_correct else question.get("feedback_incorrect"),
        **diagnostics,
        "tags": module.get("tags", []),
        "created_at": utc_now_iso(),
    }
    await db.attempts.insert_one(doc)
    await _check_badges(user["id"])
    doc.pop("_id", None)
    return doc


# ====================
# BADGES — auto-grant logic
# ====================
async def _check_badges(user_id: str) -> None:
    """Grant badges based on simple rules: at least one correct attempt with matching tag."""
    rules = {
        "badge_processo": {"check": "onboarding"},
        "badge_leilao": {"tags": ["fundamentos"], "min_correct": 1},
        "badge_zona": {"tags": ["mapa_valor", "hvn", "lvn", "vah_val", "poc"], "min_correct": 1},
        "badge_edge": {"tags": ["edge_hvn"], "min_correct": 1},
        "badge_abs": {"tags": ["abs_fa"], "min_correct": 1},
        "badge_breakout": {"tags": ["breakout_volume"], "min_correct": 1},
        "badge_reteste": {"tags": ["reteste_pullback"], "min_correct": 1},
        "badge_hud": {"tags": ["hud_8_leituras"], "min_correct": 1},
        "badge_gamma": {"tags": ["gamma"], "min_correct": 1},
        "badge_confluencia": {"tags": ["confluencia_total"], "min_correct": 1},
        "badge_rotina": {"tags": ["rotina_treino", "workbook"], "min_correct": 1},
        "badge_aprofundamento": {"tags": ["aprofundamento_cinematico", "mentoria_completa"], "min_correct": 1},
        "badge_risco": {"tags": ["risco_ev"], "min_correct": 1},
        "badge_risk_auto": {"tags": ["prop_firm_risk", "risk_auto"], "min_correct": 1},
    }
    user = await db.users.find_one({"id": user_id})
    if not user:
        return
    earned = await db.user_badges.find({"user_id": user_id}).to_list(50)
    earned_ids = {ub["badge_id"] for ub in earned}

    attempts = await db.attempts.find({"user_id": user_id, "is_correct": True}).to_list(2000)

    for badge_id, rule in rules.items():
        if badge_id in earned_ids:
            continue
        if rule.get("check") == "onboarding":
            if user.get("has_onboarded"):
                await db.user_badges.update_one(
                    {"user_id": user_id, "badge_id": badge_id},
                    {"$set": {"user_id": user_id, "badge_id": badge_id, "earned_at": utc_now_iso()}},
                    upsert=True,
                )
            continue
        tags = rule.get("tags", [])
        min_correct = rule.get("min_correct", 1)
        count = sum(1 for a in attempts if any(t in tags for t in a.get("tags", [])))
        if count >= min_correct:
            await db.user_badges.update_one(
                {"user_id": user_id, "badge_id": badge_id},
                {"$set": {"user_id": user_id, "badge_id": badge_id, "earned_at": utc_now_iso()}},
                upsert=True,
            )


# ====================
# JOURNAL (Diario Disciplinar)
# ====================
@api.get("/journal")
async def list_journal(request: Request):
    user = await get_current_user(request, db)
    docs = await db.journal_entries.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1).to_list(500)
    return docs


@api.post("/journal")
async def create_journal(payload: JournalCreate, request: Request):
    user = await get_current_user(request, db)
    doc = payload.model_dump()
    doc["id"] = new_id()
    doc["user_id"] = user["id"]
    doc["created_at"] = utc_now_iso()
    await db.journal_entries.insert_one(doc)
    doc.pop("_id", None)
    return doc


@api.get("/journal/export")
async def export_journal(request: Request):
    user = await get_current_user(request, db)
    docs = []
    cursor = db.journal_entries.find({"user_id": user["id"]}, {"_id": 0}).sort("created_at", -1)
    async for doc in cursor:
        docs.append(doc)
    return docs


@api.delete("/journal/{entry_id}")
async def delete_journal(entry_id: str, request: Request):
    user = await get_current_user(request, db)
    result = await db.journal_entries.delete_one({"id": entry_id, "user_id": user["id"]})
    if result.deleted_count == 0:
        raise HTTPException(status_code=404, detail="Entrada não encontrada")
    return {"ok": True}


# ====================
# COMMISSIONS (approval workflow)
# ====================
@api.get("/commissions")
async def list_commissions(request: Request):
    user = await get_current_user(request, db)
    return await db.commission_requests.find(
        {"user_id": user["id"]},
        {"_id": 0},
    ).sort("created_at", -1).to_list(500)


@api.post("/commissions")
async def create_commission(payload: CommissionCreate, request: Request):
    user = await get_current_user(request, db)
    doc = payload.model_dump()
    report_role = (payload.report_role or "").strip()
    lead_name = (payload.lead_name or payload.client_name or "").strip()
    lead_key = " ".join(lead_name.casefold().split())
    existing_chain = None
    if lead_key:
        existing_chain = await db.commission_requests.find_one(
            {
                "lead_key": lead_key,
                "workflow_status": "waiting_technical",
            },
            {"_id": 0, "chain_id": 1},
            sort=[("created_at", -1)],
        )
    chain_id = (existing_chain or {}).get("chain_id") or new_id()
    is_technical = report_role == "tecnico"
    sale_completed = is_technical and payload.sale_outcome == "completed"
    sale_not_completed = is_technical and payload.sale_outcome == "not_completed"
    workflow_status = (
        "sale_completed"
        if sale_completed
        else "sale_not_completed"
        if sale_not_completed
        else (payload.workflow_status or "waiting_technical")
        if report_role in {"recrutador", "ativo"}
        else (payload.workflow_status or "")
    )
    approval_status = (
        "pending"
        if sale_completed
        else "not_eligible"
        if sale_not_completed
        else "waiting_technical"
        if report_role in {"recrutador", "ativo"}
        else "pending"
    )
    technical_name = (
        payload.technical_seller_name
        or (payload.employee_name if is_technical else "")
        or (user.get("name") if is_technical else "")
        or ""
    ).strip()
    doc.update({
        "id": new_id(),
        "chain_id": chain_id,
        "lead_key": lead_key,
        "lead_name": lead_name,
        "user_id": user["id"],
        "user_email": user.get("email", ""),
        "employee_name": (payload.employee_name or user.get("name") or "").strip(),
        "report_role": report_role,
        "workflow_status": workflow_status,
        "approval_status": approval_status,
        "technical_seller_name": technical_name,
        "created_at": utc_now_iso(),
        "approved_at": None,
        "approved_by": None,
        "admin_reason": "",
    })

    if is_technical and lead_key:
        linked_filter = {
            "lead_key": lead_key,
            "report_role": {"$in": ["recrutador", "ativo"]},
            "workflow_status": "waiting_technical",
        }
        linked_update = {
            "chain_id": chain_id,
            "workflow_status": workflow_status,
            "approval_status": approval_status,
            "technical_seller_name": technical_name,
            "sale_outcome": payload.sale_outcome,
            "sale_date": payload.sale_date,
            "sale_value": payload.sale_value,
            "payment_date": payload.payment_date,
            "product_name": payload.product_name,
            "loss_reason": payload.loss_reason,
            "updated_at": utc_now_iso(),
        }
        await db.commission_requests.update_many(linked_filter, {"$set": linked_update})

    await db.commission_requests.insert_one(doc)
    doc.pop("_id", None)
    return doc


# ====================
# PERFORMANCE / REPORT
# ====================
async def _compute_user_metrics(user_id: str) -> Dict[str, Any]:
    attempts = await db.attempts.find({"user_id": user_id}, {"_id": 0}).to_list(5000)
    # latest attempt per (scope, question_id, module_id)
    last_map: Dict[tuple, dict] = {}
    for a in attempts:
        key = (a["scope"], a["question_id"], a["module_id"])
        cur = last_map.get(key)
        if not cur or a.get("attempt_number", 0) > cur.get("attempt_number", 0):
            last_map[key] = a
    latests = list(last_map.values())

    total = len(latests)
    correct = sum(1 for a in latests if a["is_correct"])
    points = sum(a.get("score", 0) for a in attempts)

    # tag stats
    tag_stats: Dict[str, Dict[str, int]] = {}
    for a in latests:
        for tag in a.get("tags", []):
            t = tag_stats.setdefault(tag, {"total": 0, "correct": 0})
            t["total"] += 1
            if a["is_correct"]:
                t["correct"] += 1

    # layer stats — using layer_tags mapping
    cfg = await db.app_config.find_one({"_singleton": True}) or {}
    layer_tags = cfg.get("layer_tags", {})
    layer_stats: Dict[str, Dict[str, int]] = {}
    for layer, tags in layer_tags.items():
        lt = layer_stats.setdefault(layer, {"total": 0, "correct": 0})
        for a in latests:
            if any(t in tags for t in a.get("tags", [])):
                lt["total"] += 1
                if a["is_correct"]:
                    lt["correct"] += 1

    def acc(d: dict) -> Optional[int]:
        return round((d["correct"] / d["total"]) * 100) if d["total"] else None

    tag_accuracy = {k: acc(v) for k, v in tag_stats.items()}
    layer_accuracy = {k: acc(v) for k, v in layer_stats.items()}

    # strong / weak tags (accuracy thresholds, min 2 attempts)
    strong, weak = [], []
    for k, v in tag_stats.items():
        if v["total"] >= 2:
            a = acc(v)
            if a is not None and a >= 75:
                strong.append({"tag": k, "accuracy": a, "attempts": v["total"]})
            if a is not None and a <= 60:
                weak.append({"tag": k, "accuracy": a, "attempts": v["total"]})
    strong.sort(key=lambda x: -x["accuracy"])
    weak.sort(key=lambda x: x["accuracy"])

    # level by points
    level = 1
    if points >= 300:
        level = 2
    if points >= 800:
        level = 3
    if points >= 1500:
        level = 4
    if points >= 2500:
        level = 5

    return {
        "points": points,
        "level": level,
        "total_questions_attempted": total,
        "correct": correct,
        "overall_accuracy": round((correct / total) * 100) if total else 0,
        "tag_stats": tag_stats,
        "tag_accuracy": tag_accuracy,
        "layer_stats": layer_stats,
        "layer_accuracy": layer_accuracy,
        "strong_tags": strong[:5],
        "weak_tags": weak[:5],
    }


@api.get("/user/performance")
async def user_performance(request: Request):
    user = await get_current_user(request, db)
    metrics = await _compute_user_metrics(user["id"])
    # badges
    earned = await db.user_badges.find({"user_id": user["id"]}, {"_id": 0}).to_list(50)
    all_badges = await db.badges.find({}, {"_id": 0}).to_list(50)
    earned_ids = {ub["badge_id"] for ub in earned}
    for b in all_badges:
        b["earned"] = b["id"] in earned_ids
    metrics["badges"] = all_badges
    return metrics


@api.get("/user/report")
async def user_report(request: Request):
    user = await get_current_user(request, db)
    metrics = await _compute_user_metrics(user["id"])

    # 7-day review plan based on weak tags + low-accuracy modules
    weak = metrics["weak_tags"][:]
    cfg = await db.app_config.find_one({"_singleton": True}) or {}
    tag_labels = cfg.get("tag_labels", {})

    # Map weak tags to modules and knowledge pages
    modules = await db.modules.find({}, {"_id": 0}).sort("order", 1).to_list(50)
    knowledge = await db.knowledge_pages.find({}, {"_id": 0}).to_list(50)

    plan = []
    used_modules = set()
    weak_tag_ids = [w["tag"] for w in weak] or ["fundamentos", "edge_hvn", "risco_ev"]
    for day in range(7):
        # pick a weak tag rotation
        tag = weak_tag_ids[day % len(weak_tag_ids)]
        # find a module with this tag
        mod = next(
            (m for m in modules if tag in m.get("tags", []) and m["id"] not in used_modules),
            next((m for m in modules if tag in m.get("tags", [])), modules[day % len(modules)]),
        )
        used_modules.add(mod["id"])
        kp = next((k for k in knowledge if tag in k.get("tags", [])), None)
        plan.append({
            "day": day + 1,
            "tag": tag,
            "tag_label": tag_labels.get(tag, tag),
            "module_id": mod["id"],
            "module_title": mod["title"],
            "knowledge_page_id": kp["id"] if kp else None,
            "knowledge_page_title": kp["title"] if kp else None,
            "focus": f"Revisar {tag_labels.get(tag, tag)}: ler a página, refazer perguntas e marcar prints reais.",
        })

    # Upsell: pick rules where weak tag matches trigger_tag AND accuracy below threshold
    upsells = await db.upsell_rules.find({}, {"_id": 0}).to_list(50)
    suggested = []
    for rule in upsells:
        trig = rule["trigger_tag"]
        stat = metrics["tag_stats"].get(trig)
        if not stat or stat["total"] < rule.get("min_attempts", 3):
            continue
        acc = round((stat["correct"] / stat["total"]) * 100)
        if acc <= rule.get("max_accuracy_percent", 70):
            suggested.append({**rule, "current_accuracy": acc})
    if metrics["total_questions_attempted"] >= 2 and metrics["overall_accuracy"] < 60:
        suggested.insert(0, {
            "id": "upsell_call_diagnostico_baixo_desempenho",
            "trigger_tag": "diagnostico",
            "current_accuracy": metrics["overall_accuracy"],
            "offer_title": "Call de diagnostico ou mentoria particular GL Model",
            "offer_description": "Seu aproveitamento geral indica que vale revisar a base comigo antes de acelerar para os aprofundamentos. A call organiza leilao, mapa, frase de decisao e rotina.",
            "coupon_code": "GLDIAGNOSTICO",
            "payment_url": "https://linktr.ee/glacademytrading",
            "schedule_url": "https://linktr.ee/glacademytrading",
        })

    diagnosis_lines = []
    if metrics["overall_accuracy"] >= 80:
        diagnosis_lines.append("Você está com leitura consistente. Mantenha o diário e suba dificuldade aos poucos.")
    elif metrics["overall_accuracy"] >= 60:
        diagnosis_lines.append("Você tem base, mas ainda escorrega em algumas camadas. Foque o próximo ciclo nas tags fracas.")
    else:
        diagnosis_lines.append("Antes de aumentar volume, volte para a Fundação. Acerto vem de processo, não de palpite.")
    if metrics["overall_accuracy"] < 60 and metrics["total_questions_attempted"] >= 2:
        diagnosis_lines.append("Recomendacao do app: considere uma call comigo ou uma mentoria de 2h para corrigir a base antes de avancar.")
    if metrics["weak_tags"]:
        weak_names = ", ".join(tag_labels.get(w["tag"], w["tag"]) for w in metrics["weak_tags"][:3])
        diagnosis_lines.append(f"Pontos a corrigir agora: {weak_names}.")
    if metrics["strong_tags"]:
        strong_names = ", ".join(tag_labels.get(s["tag"], s["tag"]) for s in metrics["strong_tags"][:3])
        diagnosis_lines.append(f"Forças identificadas: {strong_names}.")

    return {
        "user": _public_user(user),
        "metrics": metrics,
        "diagnosis": diagnosis_lines,
        "review_plan": plan,
        "upsell_suggestions": suggested,
    }


# ====================
# ADMIN / MENTOR
# ====================
async def _delete_student_everywhere(user_id: str) -> None:
    await db.attempts.delete_many({"user_id": user_id})
    await db.lesson_progress.delete_many({"user_id": user_id})
    await db.user_badges.delete_many({"user_id": user_id})
    await db.journal_entries.delete_many({"user_id": user_id})
    await db.commission_requests.delete_many({"user_id": user_id})
    await db.password_reset_tokens.delete_many({"user_id": user_id})
    await db.push_subscriptions.delete_many({"user_id": user_id})
    await db.access_events.update_many(
        {"user_id": user_id},
        {"$set": {"user_id": None, "email": "removed-user"}},
    )
    await db.users.delete_one({"id": user_id})


def _student_admin_public(user: dict) -> dict:
    doc = _public_user(user)
    for key in [
        "registration_code",
        "registration_code_id",
        "registration_code_label",
        "registration_code_type",
        "registration_ip",
        "registration_user_agent",
        "approval_required",
        "approved_at",
        "approved_by",
        "blocked_at",
        "blocked_by",
        "blocked_reason",
    ]:
        doc[key] = user.get(key)
    return doc


def _student_learning_progress(
    user: dict,
    modules: list,
    attempts: list,
    lesson_progress: list,
) -> dict:
    onboarding = user.get("onboarding") or {}
    roles = onboarding.get("roles") or [onboarding.get("role")]
    assigned_tracks = list(dict.fromkeys(role for role in roles if role in {"recrutador", "recrutador_tecnico", "ativo", "tecnico"}))
    lesson_by_module = {item.get("module_id"): item for item in lesson_progress}
    tracks = []
    all_rows = []

    for track in assigned_tracks:
        track_modules = sorted(
            [module for module in modules if module.get("track") == track],
            key=lambda module: module.get("order") or 0,
        )
        rows = []
        for module in track_modules:
            progress = _module_progress_from_attempts(module, attempts, lesson_progress, modules)
            questions = module.get("questions", [])
            equivalent_ids = _equivalent_module_ids(module, modules)
            video_progress = next((lesson_by_module.get(module_id) for module_id in equivalent_ids if lesson_by_module.get(module_id)), None)
            correct_questions = 0
            for question in questions:
                refs = {
                    (candidate.get("id"), candidate_question.get("id"))
                    for candidate, candidate_question in _equivalent_question_refs(module, question, modules)
                }
                question_attempts = [
                    attempt
                    for attempt in attempts
                    if (attempt.get("module_id"), attempt.get("question_id")) in refs
                    and attempt.get("scope") == "module"
                ]
                if question_attempts:
                    last = max(question_attempts, key=_attempt_sort_key)
                    if last.get("is_correct"):
                        correct_questions += 1
            watched = bool(progress.get("lesson_done"))
            completed = _module_completed(progress)
            row = {
                "id": module.get("id"),
                "order": module.get("order"),
                "title": module.get("title"),
                "track": track,
                "video_completed": watched,
                "video_completed_at": (video_progress or {}).get("completed_at"),
                "questions_correct": correct_questions,
                "total_questions": len(questions),
                "quiz_percent": round((correct_questions / len(questions)) * 100) if questions else (100 if watched else 0),
                "completed": completed,
                "status": "completed" if completed else ("quiz_pending" if watched else "video_pending"),
            }
            rows.append(row)
            all_rows.append(row)
        completed_count = len([row for row in rows if row["completed"]])
        tracks.append({
            "track": track,
            "total_modules": len(rows),
            "completed_modules": completed_count,
            "percent": round((completed_count / len(rows)) * 100) if rows else 0,
            "modules": rows,
        })

    completed_total = len([row for row in all_rows if row["completed"]])
    watched_total = len([row for row in all_rows if row["video_completed"]])
    return {
        "assigned_tracks": assigned_tracks,
        "total_modules": len(all_rows),
        "completed_modules": completed_total,
        "videos_completed": watched_total,
        "percent": round((completed_total / len(all_rows)) * 100) if all_rows else 0,
        "tracks": tracks,
    }


@api.get("/admin/registrations")
async def admin_registrations(request: Request):
    await require_admin(request, db)
    users = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).sort("created_at", -1).to_list(3000)
    codes = await db.access_codes.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)
    events = await db.access_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(200)
    normalized_users = [_student_admin_public(u) for u in users]
    stats = {
        "total_students": len(normalized_users),
        "pending": len([u for u in normalized_users if u.get("account_status") == "pending"]),
        "active": len([u for u in normalized_users if u.get("account_status", "active") == "active"]),
        "blocked": len([u for u in normalized_users if u.get("account_status") == "blocked"]),
        "codes": len(codes),
        "usable_codes": len([c for c in codes if _access_code_public(c)["usable"]]),
        "events": len(events),
    }
    return {
        "stats": stats,
        "students": normalized_users,
        "pending_students": [u for u in normalized_users if u.get("account_status") == "pending"],
        "blocked_students": [u for u in normalized_users if u.get("account_status") == "blocked"],
        "codes": [_access_code_public(c) for c in codes],
        "events": events,
        "approval_required_by_default": _registration_requires_approval(),
    }


@api.get("/admin/commissions")
async def admin_commissions(request: Request):
    await require_admin(request, db)
    docs = await db.commission_requests.find({}, {"_id": 0}).sort("created_at", -1).to_list(2000)
    return {
        "requests": docs,
        "stats": {
            "waiting_technical": len([item for item in docs if item.get("approval_status") == "waiting_technical"]),
            "pending": len([item for item in docs if item.get("approval_status") == "pending"]),
            "approved": len([item for item in docs if item.get("approval_status") == "approved"]),
            "not_completed": len([
                item for item in docs
                if item.get("approval_status") in {"not_eligible", "rejected"}
            ]),
        },
    }


def _admin_commission_update(payload: CommissionAdminAction, admin: dict, decision: str, now: str) -> Dict[str, Any]:
    update: Dict[str, Any] = {
        "admin_reason": (payload.reason or "").strip(),
        "reviewed_at": now,
        "reviewed_by": admin.get("email"),
        "updated_at": now,
    }
    for key in ["sale_date", "payment_date", "product_name", "technical_seller_name", "loss_reason"]:
        value = getattr(payload, key, None)
        if value is not None:
            update[key] = str(value).strip()
    for key in ["sale_value"]:
        value = getattr(payload, key, None)
        if value is not None:
            update[key] = value

    normalized = (decision or payload.decision or "").strip().lower()
    if normalized in {"approve", "approved", "sale_completed", "completed"}:
        update.update({
            "approval_status": "approved",
            "workflow_status": "sale_completed",
            "sale_outcome": "completed",
            "approved_at": now,
            "approved_by": admin.get("email"),
        })
    elif normalized in {"not_completed", "sale_not_completed", "not_eligible"}:
        update.update({
            "approval_status": "not_eligible",
            "workflow_status": "sale_not_completed",
            "sale_outcome": "not_completed",
            "commission_value": 0,
        })
        if not update.get("loss_reason") and update.get("admin_reason"):
            update["loss_reason"] = update["admin_reason"]
    elif normalized in {"reject", "rejected"}:
        update.update({
            "approval_status": "rejected",
            "commission_value": 0,
            "rejected_at": now,
            "rejected_by": admin.get("email"),
        })
    elif payload.workflow_status:
        update["workflow_status"] = payload.workflow_status.strip()
    if payload.sale_outcome:
        update["sale_outcome"] = payload.sale_outcome.strip()
    return update


async def _apply_commission_admin_action(
    commission_id: str,
    payload: CommissionAdminAction,
    request: Request,
    decision: str,
):
    admin = await require_admin(request, db)
    now = utc_now_iso()
    commission = await db.commission_requests.find_one({"id": commission_id}, {"_id": 0})
    if not commission:
        raise HTTPException(status_code=404, detail="Solicitacao de comissao nao encontrada.")
    chain_id = commission.get("chain_id")
    target_filter = {"chain_id": chain_id} if chain_id else {"id": commission_id}
    update = _admin_commission_update(payload, admin, decision, now)
    await db.commission_requests.update_many(target_filter, {"$set": update})
    normalized_decision = (decision or payload.decision or "").strip().lower()
    zero_commission = normalized_decision in {"not_completed", "sale_not_completed", "not_eligible", "reject", "rejected"}
    if payload.commission_value is not None and not zero_commission:
        await db.commission_requests.update_one(
            {"id": commission_id},
            {"$set": {
                "commission_value": payload.commission_value,
                "reviewed_at": now,
                "reviewed_by": admin.get("email"),
                "updated_at": now,
            }},
        )
    return await db.commission_requests.find_one({"id": commission_id}, {"_id": 0})


@api.post("/admin/commissions/{commission_id}/review")
async def admin_review_commission(
    commission_id: str,
    payload: CommissionAdminAction,
    request: Request,
):
    return await _apply_commission_admin_action(commission_id, payload, request, payload.decision or "save")


@api.post("/admin/commissions/{commission_id}/approve")
async def admin_approve_commission(
    commission_id: str,
    payload: CommissionAdminAction,
    request: Request,
):
    return await _apply_commission_admin_action(commission_id, payload, request, "approve")


@api.post("/admin/commissions/{commission_id}/reject")
async def admin_reject_commission(
    commission_id: str,
    payload: CommissionAdminAction,
    request: Request,
):
    return await _apply_commission_admin_action(commission_id, payload, request, "reject")


@api.post("/admin/access-codes")
async def admin_create_access_code(payload: AccessCodeCreate, request: Request):
    admin = await require_admin(request, db)
    code = _normalize_access_code(payload.code)
    if not code:
        for _ in range(10):
            code = f"GL-{secrets.token_hex(4).upper()}"
            if not await db.access_codes.find_one({"code": code}):
                break
    if await db.access_codes.find_one({"code": code}):
        raise HTTPException(status_code=409, detail="Codigo ja existe.")
    doc = {
        "id": new_id(),
        "code": code,
        "label": payload.label.strip(),
        "code_type": (payload.code_type or "turma").strip(),
        "max_uses": payload.max_uses,
        "uses_count": 0,
        "expires_at": payload.expires_at,
        "active": payload.active,
        "auto_approve": payload.auto_approve,
        "entitlement": (payload.entitlement or "").strip(),
        "notes": (payload.notes or "").strip(),
        "created_at": utc_now_iso(),
        "created_by": admin.get("email"),
        "last_used_at": None,
    }
    await db.access_codes.insert_one(doc)
    await _record_access_event("admin_create_access_code", request, user_id=admin["id"], email=admin.get("email"), metadata={"code_id": doc["id"], "label": doc["label"]})
    return _access_code_public(doc)


@api.patch("/admin/access-codes/{code_id}")
async def admin_update_access_code(code_id: str, payload: AccessCodeUpdate, request: Request):
    admin = await require_admin(request, db)
    update: Dict[str, Any] = {"updated_at": utc_now_iso(), "updated_by": admin.get("email")}
    for key in ["label", "code_type", "max_uses", "expires_at", "active", "auto_approve", "entitlement", "notes"]:
        if key in payload.model_fields_set:
            value = getattr(payload, key)
            if isinstance(value, str):
                value = value.strip()
            update[key] = value
    result = await db.access_codes.update_one({"id": code_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Codigo nao encontrado.")
    doc = await db.access_codes.find_one({"id": code_id}, {"_id": 0})
    await _record_access_event("admin_update_access_code", request, user_id=admin["id"], email=admin.get("email"), metadata={"code_id": code_id})
    return _access_code_public(doc)


@api.post("/admin/students/{user_id}/approve")
async def admin_approve_student(user_id: str, payload: StudentAdminAction, request: Request):
    admin = await require_admin(request, db)
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") == "admin":
        raise HTTPException(status_code=404, detail="Aluno nao encontrado.")
    now = utc_now_iso()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"account_status": "active", "approval_required": False, "approved_at": now, "approved_by": admin.get("email"), "approval_reason": payload.reason or ""}},
    )
    await _record_access_event("admin_approve_student", request, user_id=user_id, email=user.get("email"), metadata={"admin": admin.get("email")})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return _student_admin_public(updated)


@api.post("/admin/students/{user_id}/block")
async def admin_block_student(user_id: str, payload: StudentAdminAction, request: Request):
    admin = await require_admin(request, db)
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") == "admin":
        raise HTTPException(status_code=404, detail="Aluno nao encontrado.")
    now = utc_now_iso()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"account_status": "blocked", "blocked_at": now, "blocked_by": admin.get("email"), "blocked_reason": payload.reason or ""}},
    )
    await _record_access_event("admin_block_student", request, user_id=user_id, email=user.get("email"), success=False, reason=payload.reason or "blocked_by_admin")
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return _student_admin_public(updated)


@api.post("/admin/students/{user_id}/unblock")
async def admin_unblock_student(user_id: str, payload: StudentAdminAction, request: Request):
    admin = await require_admin(request, db)
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") == "admin":
        raise HTTPException(status_code=404, detail="Aluno nao encontrado.")
    now = utc_now_iso()
    await db.users.update_one(
        {"id": user_id},
        {"$set": {"account_status": "active", "approval_required": False, "unblocked_at": now, "unblocked_by": admin.get("email"), "unblock_reason": payload.reason or ""}},
    )
    await _record_access_event("admin_unblock_student", request, user_id=user_id, email=user.get("email"), metadata={"admin": admin.get("email")})
    updated = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    return _student_admin_public(updated)


@api.delete("/admin/students/{user_id}")
async def admin_delete_student(user_id: str, request: Request):
    admin = await require_admin(request, db)
    user = await db.users.find_one({"id": user_id})
    if not user or user.get("role") == "admin":
        raise HTTPException(status_code=404, detail="Aluno nao encontrado.")
    email = user.get("email")
    await _delete_student_everywhere(user_id)
    await _record_access_event("admin_delete_student", request, user_id=None, email=email, success=False, reason="deleted_by_admin", metadata={"admin": admin.get("email")})
    return {"ok": True}


@api.get("/admin/access-events")
async def admin_access_events(request: Request):
    await require_admin(request, db)
    return await db.access_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(500)


@api.get("/admin/students")
async def admin_students(request: Request):
    await require_admin(request, db)
    users = await db.users.find({"role": "student"}, {"_id": 0, "password_hash": 0}).to_list(2000)
    modules = await db.modules.find({"track": {"$in": ["recrutador", "recrutador_tecnico", "ativo", "tecnico"]}}, {"_id": 0}).to_list(200)
    result = []
    for u in users:
        metrics = await _compute_user_metrics(u["id"])
        attempts = await db.attempts.find({"user_id": u["id"], "scope": "module"}, {"_id": 0}).to_list(5000)
        lesson_progress = await db.lesson_progress.find({"user_id": u["id"]}, {"_id": 0}).to_list(500)
        learning = _student_learning_progress(u, modules, attempts, lesson_progress)
        result.append({
            "user": _student_admin_public(u),
            "points": metrics["points"],
            "level": metrics["level"],
            "overall_accuracy": metrics["overall_accuracy"],
            "weak_tags": metrics["weak_tags"][:3],
            "strong_tags": metrics["strong_tags"][:3],
            "total_attempted": metrics["total_questions_attempted"],
            "learning": {
                "total_modules": learning["total_modules"],
                "completed_modules": learning["completed_modules"],
                "videos_completed": learning["videos_completed"],
                "percent": learning["percent"],
            },
        })
    result.sort(key=lambda x: -x["points"])
    return result


@api.get("/admin/students/{user_id}")
async def admin_student_detail(user_id: str, request: Request):
    await require_admin(request, db)
    u = await db.users.find_one({"id": user_id}, {"_id": 0, "password_hash": 0})
    if not u:
        raise HTTPException(status_code=404, detail="Aluno não encontrado")
    metrics = await _compute_user_metrics(user_id)
    journal_count = await db.journal_entries.count_documents({"user_id": user_id})
    modules = await db.modules.find({"track": {"$in": ["recrutador", "recrutador_tecnico", "ativo", "tecnico"]}}, {"_id": 0}).to_list(200)
    attempts = await db.attempts.find({"user_id": user_id, "scope": "module"}, {"_id": 0}).to_list(5000)
    lesson_progress = await db.lesson_progress.find({"user_id": user_id}, {"_id": 0}).to_list(500)
    learning = _student_learning_progress(u, modules, attempts, lesson_progress)
    upsells = await db.upsell_rules.find({}, {"_id": 0}).to_list(50)
    suggested = []
    for rule in upsells:
        trig = rule["trigger_tag"]
        stat = metrics["tag_stats"].get(trig)
        if not stat or stat["total"] < rule.get("min_attempts", 3):
            continue
        acc = round((stat["correct"] / stat["total"]) * 100)
        if acc <= rule.get("max_accuracy_percent", 70):
            suggested.append({**rule, "current_accuracy": acc})
    return {
        "user": _student_admin_public(u),
        "metrics": metrics,
        "learning": learning,
        "journal_count": journal_count,
        "suggested_upsells": suggested,
    }


@api.patch("/admin/modules/{module_id}")
async def admin_update_module(module_id: str, payload: ModuleUpdate, request: Request):
    await require_admin(request, db)
    update = {"_admin_edited": True}
    if payload.title is not None:
        update["title"] = payload.title
    if payload.objective is not None:
        update["objective"] = payload.objective
    if payload.summary is not None:
        update["summary"] = payload.summary
    if payload.video_url is not None:
        update["lesson.video_url"] = payload.video_url
    if payload.lesson_text is not None:
        update["lesson.text"] = payload.lesson_text
    if len(update) == 1:
        return {"ok": True}
    result = await db.modules.update_one({"id": module_id}, {"$set": update})
    if result.matched_count == 0:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    m = await db.modules.find_one({"id": module_id}, {"_id": 0})
    return m


@api.patch("/admin/modules/{module_id}/questions/{question_id}")
async def admin_update_question(module_id: str, question_id: str, payload: QuestionUpdate, request: Request):
    await require_admin(request, db)
    m = await db.modules.find_one({"id": module_id})
    if not m:
        raise HTTPException(status_code=404, detail="Módulo não encontrado")
    questions = m.get("questions", [])
    found = False
    for q in questions:
        if q["id"] == question_id:
            for field in ["prompt", "feedback_correct", "feedback_incorrect", "checkpoint_seconds"]:
                v = getattr(payload, field)
                if v is not None:
                    q[field] = v
            if payload.correct_option_ids is not None:
                q["correct_option_ids"] = payload.correct_option_ids
            if payload.options is not None:
                q["options"] = payload.options
            found = True
            break
    if not found:
        raise HTTPException(status_code=404, detail="Questão não encontrada")
    await db.modules.update_one({"id": module_id}, {"$set": {"questions": questions, "_admin_edited": True}})
    return {"ok": True}


@api.get("/admin/upsells")
async def admin_upsells(request: Request):
    await require_admin(request, db)
    docs = await db.upsell_rules.find({}, {"_id": 0}).to_list(50)
    return docs


@api.patch("/admin/upsells/{rule_id}")
async def admin_update_upsell(rule_id: str, payload: UpsellUpdate, request: Request):
    await require_admin(request, db)
    update = {"_admin_edited": True}
    for k in ["offer_title", "offer_description", "coupon_code", "payment_url", "schedule_url"]:
        v = getattr(payload, k)
        if v is not None:
            update[k] = v
    await db.upsell_rules.update_one({"id": rule_id}, {"$set": update})
    doc = await db.upsell_rules.find_one({"id": rule_id}, {"_id": 0})
    return doc


@api.post("/admin/news")
async def admin_create_news(payload: NewsUpdateCreate, request: Request):
    await require_admin(request, db)
    doc = {
        "id": new_id(),
        "tag": (payload.tag or "Atualizacao").strip(),
        "title": payload.title.strip(),
        "body": payload.body.strip(),
        "action_url": (payload.action_url or "/novidades").strip(),
        "created_at": utc_now_iso(),
    }
    await db.news_updates.insert_one(doc)
    push_result = None
    if payload.send_push:
        push_result = await _broadcast_push(doc["title"], doc["body"][:220], doc["action_url"] or "/novidades")
    return {"ok": True, "news": doc, "push": push_result}


@api.post("/admin/market-reports")
async def admin_create_market_report(payload: MarketReportCreate, request: Request):
    await require_admin(request, db)
    bullets = [b.strip() for b in payload.bullets if b and b.strip()]
    watchlist = [w.strip() for w in payload.watchlist if w and w.strip()]
    doc = {
        "id": new_id(),
        "period": (payload.period or "Diario").strip(),
        "title": payload.title.strip(),
        "tone": (payload.tone or "neutro").strip(),
        "bullets": bullets,
        "watchlist": watchlist,
        "created_at": utc_now_iso(),
    }
    await db.market_reports.insert_one(doc)
    push_result = None
    if payload.send_push:
        body = bullets[0] if bullets else "Novo relatorio de mercado publicado no app."
        push_result = await _broadcast_push(doc["title"], body[:220], "/mercado")
    return {"ok": True, "report": doc, "push": push_result}


@api.get("/admin/system-status")
async def admin_system_status(request: Request):
    await require_admin(request, db)
    public_key = os.environ.get("VAPID_PUBLIC_KEY", "").strip()
    private_key = os.environ.get("VAPID_PRIVATE_KEY", "").strip()
    subscriptions = await db.push_subscriptions.count_documents({})
    return {
        "admin_email": os.environ.get("ADMIN_EMAIL", ""),
        "smtp": _smtp_status(),
        "push": {
            "configured": bool(public_key and private_key and webpush),
            "has_public_key": bool(public_key),
            "has_private_key": bool(private_key),
            "webpush_available": bool(webpush),
            "subscriptions": subscriptions,
        },
        "password_reset": {
            "endpoint_ready": True,
            "email_ready": _smtp_status()["configured"],
        },
    }


@api.post("/admin/system/password-reset-test")
async def admin_password_reset_test(payload: EmailTestRequest, request: Request):
    await require_admin(request, db)
    email = payload.email.lower().strip()
    user = await db.users.find_one({"email": email})
    if not user:
        raise HTTPException(status_code=404, detail="E-mail nao encontrado na base de alunos/admin.")

    token = secrets.token_urlsafe(40)
    expires_at = datetime.now(timezone.utc).timestamp() + 30 * 60
    await db.password_reset_tokens.delete_many({"user_id": user["id"]})
    await db.password_reset_tokens.insert_one({
        "id": new_id(),
        "user_id": user["id"],
        "email": email,
        "token_hash": _hash_reset_token(token),
        "expires_at": expires_at,
        "used_at": None,
        "created_at": utc_now_iso(),
    })

    frontend_url = os.environ.get("FRONTEND_URL", "http://localhost:3000").rstrip("/")
    link = f"{frontend_url}/reset-password?token={token}"
    sent = await _send_password_reset_email(email, link)
    await _record_access_event("password_reset_test", request, user_id=user["id"], email=email, success=sent)
    return {"ok": True, "email_configured": sent}


@api.get("/admin/stats")
async def admin_stats(request: Request):
    await require_admin(request, db)
    students = await db.users.count_documents({"role": "student"})
    onboarded = await db.users.count_documents({"role": "student", "has_onboarded": True})
    attempts = await db.attempts.count_documents({})
    journals = await db.journal_entries.count_documents({})
    logins = await db.access_events.count_documents({"event_type": "login_success"})
    failed_logins = await db.access_events.count_documents({"event_type": "login_failed"})
    last_events = await db.access_events.find({}, {"_id": 0}).sort("created_at", -1).to_list(10)
    return {
        "students": students,
        "onboarded": onboarded,
        "total_attempts": attempts,
        "journal_entries": journals,
        "logins": logins,
        "failed_logins": failed_logins,
        "last_access_events": last_events,
    }


@api.get("/")
async def root():
    return {"service": "GL Academy Sales Training API", "status": "ok"}


# Mount router
app.include_router(api)

# CORS — credentialed requests need explicit origins.
# Do not use "*" in production because cookies/tokens and admin routes are involved.
cors_origins_env = os.environ.get("CORS_ORIGINS", "http://localhost:3000,http://127.0.0.1:3000")
allow_origins = [o.strip() for o in cors_origins_env.split(",") if o.strip() and o.strip() != "*"]
if not allow_origins:
    allow_origins = ["http://localhost:3000", "http://127.0.0.1:3000"]
app.add_middleware(
    CORSMiddleware,
    allow_credentials=True,
    allow_origins=allow_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

logging.basicConfig(level=logging.INFO, format="%(asctime)s - %(name)s - %(levelname)s - %(message)s")
