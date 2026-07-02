"""Pydantic models for GL Academy Sales Training."""
from pydantic import BaseModel, EmailStr, Field, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def new_id() -> str:
    return str(uuid.uuid4())


# === User ===
class OnboardingData(BaseModel):
    role: str
    roles: List[str] = Field(default_factory=list)
    experience: str
    goal: str
    challenge: str


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(min_length=8)
    name: str = Field(min_length=2, max_length=80)
    access_code: Optional[str] = None
    team_role: Optional[str] = None
    team_roles: List[str] = Field(default_factory=list)
    experience: Optional[str] = ""
    goal: Optional[str] = ""
    challenge: Optional[str] = ""


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class PasswordResetRequest(BaseModel):
    email: EmailStr


class PasswordResetConfirm(BaseModel):
    token: str = Field(min_length=24)
    password: str = Field(min_length=8)


class UserPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    email: str
    name: str
    role: str = "student"
    account_status: str = "active"
    has_onboarded: bool = False
    onboarding: Optional[OnboardingData] = None
    created_at: Optional[str] = None
    entitlements: List[str] = []


# === Quiz Attempt ===
class DecisionInput(BaseModel):
    meta: Optional[str] = ""
    foco: Optional[str] = ""
    proxima_acao: Optional[str] = ""
    fonte: Optional[str] = ""
    perfil: Optional[str] = ""
    acao: Optional[str] = ""
    alvo: Optional[str] = ""
    abordagem: Optional[str] = ""
    status: Optional[str] = ""
    dor: Optional[str] = ""
    produto: Optional[str] = ""
    objecao: Optional[str] = ""
    fechamento: Optional[str] = ""
    numero: Optional[str] = ""
    postura: Optional[str] = ""
    regime: Optional[str] = ""
    mapa: Optional[str] = ""
    gatilho: Optional[str] = ""
    risco: Optional[str] = ""
    entrada: Optional[str] = ""
    stop: Optional[str] = ""


class AttemptCreate(BaseModel):
    question_id: str
    module_id: str
    scope: str = "module"  # module | challenge | knowledge
    selected_option_ids: List[str]
    decision_input: Optional[DecisionInput] = None


class AttemptPublic(BaseModel):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    question_id: str
    module_id: str
    scope: str
    selected_option_ids: List[str]
    is_correct: bool
    score: int  # 100/70/40 by attempt number, 0 if all wrong
    attempt_number: int
    decision_input: Optional[DecisionInput] = None
    created_at: str


# === Journal ===
class JournalCreate(BaseModel):
    operacional: str
    contexto: Optional[str] = ""
    zona: Optional[str] = ""
    confluencias: Optional[str] = ""
    gatilho: Optional[str] = ""
    stop: Optional[str] = ""
    alvo: Optional[str] = ""
    risco_r: Optional[float] = 1.0
    resultado_r: Optional[float] = 0.0
    erro_tecnico: Optional[str] = ""
    emocional: Optional[str] = ""
    licao: Optional[str] = ""
    metadata: Optional[Dict[str, Any]] = None


class JournalEntry(JournalCreate):
    model_config = ConfigDict(extra="ignore")
    id: str
    user_id: str
    created_at: str


# === Lesson progress ===
class LessonDoneInput(BaseModel):
    module_id: str


# === Admin: edit ===
class ModuleUpdate(BaseModel):
    title: Optional[str] = None
    objective: Optional[str] = None
    summary: Optional[str] = None
    video_url: Optional[str] = None
    lesson_text: Optional[str] = None


class QuestionUpdate(BaseModel):
    prompt: Optional[str] = None
    correct_option_ids: Optional[List[str]] = None
    options: Optional[List[Dict[str, Any]]] = None
    feedback_correct: Optional[str] = None
    feedback_incorrect: Optional[str] = None
    checkpoint_seconds: Optional[int] = None


class UpsellUpdate(BaseModel):
    offer_title: Optional[str] = None
    offer_description: Optional[str] = None
    coupon_code: Optional[str] = None
    payment_url: Optional[str] = None
    schedule_url: Optional[str] = None


class NewsUpdateCreate(BaseModel):
    tag: Optional[str] = "Atualizacao"
    title: str = Field(min_length=3, max_length=140)
    body: str = Field(min_length=5, max_length=1200)
    action_url: Optional[str] = "/novidades"
    send_push: bool = False


class MarketReportCreate(BaseModel):
    period: Optional[str] = "Diario"
    title: str = Field(min_length=3, max_length=160)
    tone: Optional[str] = "neutro"
    bullets: List[str] = Field(default_factory=list)
    watchlist: List[str] = Field(default_factory=list)
    send_push: bool = False


class EmailTestRequest(BaseModel):
    email: EmailStr


class AccessCodeCreate(BaseModel):
    code: Optional[str] = Field(default=None, max_length=80)
    label: str = Field(min_length=2, max_length=120)
    code_type: str = "turma"  # turma | individual | produto
    max_uses: Optional[int] = Field(default=None, ge=1, le=10000)
    expires_at: Optional[str] = None
    active: bool = True
    auto_approve: bool = False
    entitlement: Optional[str] = ""
    notes: Optional[str] = Field(default="", max_length=500)


class AccessCodeUpdate(BaseModel):
    label: Optional[str] = Field(default=None, min_length=2, max_length=120)
    code_type: Optional[str] = None
    max_uses: Optional[int] = Field(default=None, ge=1, le=10000)
    expires_at: Optional[str] = None
    active: Optional[bool] = None
    auto_approve: Optional[bool] = None
    entitlement: Optional[str] = None
    notes: Optional[str] = Field(default=None, max_length=500)


class StudentAdminAction(BaseModel):
    reason: Optional[str] = Field(default="", max_length=500)


class CommissionCreate(BaseModel):
    commission_type: str = Field(default="comissao_em_esteira", max_length=120)
    commission_value: float = Field(default=0, ge=0)
    sale_value: float = Field(default=0, ge=0)
    sale_date: Optional[str] = ""
    payment_date: Optional[str] = ""
    sale_origin: str = "propria"
    origin_person: Optional[str] = Field(default="", max_length=120)
    client_name: Optional[str] = Field(default="", max_length=160)
    lead_name: Optional[str] = Field(default="", max_length=160)
    lead_contact_date: Optional[str] = ""
    recruiter_name: Optional[str] = Field(default="", max_length=120)
    active_seller_name: Optional[str] = Field(default="", max_length=120)
    technical_seller_name: Optional[str] = Field(default="", max_length=120)
    report_role: Optional[str] = Field(default="", max_length=40)
    workflow_status: Optional[str] = Field(default="", max_length=60)
    sale_outcome: Optional[str] = Field(default="", max_length=40)
    loss_reason: Optional[str] = Field(default="", max_length=500)
    lead_reference: Optional[str] = Field(default="", max_length=120)
    product_name: Optional[str] = Field(default="", max_length=160)
    notes: Optional[str] = Field(default="", max_length=1200)
    employee_name: Optional[str] = Field(default="", max_length=120)
    cargo: Optional[str] = Field(default="", max_length=80)
    contatos: int = Field(default=0, ge=0)
    conversas: int = Field(default=0, ge=0)
    entrevistas: int = Field(default=0, ge=0)
    propostas: int = Field(default=0, ge=0)
    vendas: int = Field(default=0, ge=0)
    gargalo: Optional[str] = Field(default="", max_length=500)
    prioridade: Optional[str] = Field(default="", max_length=500)


class CommissionAdminAction(BaseModel):
    reason: Optional[str] = Field(default="", max_length=500)
    decision: Optional[str] = Field(default="", max_length=40)
    commission_value: Optional[float] = Field(default=None, ge=0)
    sale_value: Optional[float] = Field(default=None, ge=0)
    sale_date: Optional[str] = ""
    payment_date: Optional[str] = ""
    product_name: Optional[str] = Field(default=None, max_length=160)
    technical_seller_name: Optional[str] = Field(default=None, max_length=120)
    sale_outcome: Optional[str] = Field(default=None, max_length=40)
    workflow_status: Optional[str] = Field(default=None, max_length=60)
    loss_reason: Optional[str] = Field(default=None, max_length=500)
