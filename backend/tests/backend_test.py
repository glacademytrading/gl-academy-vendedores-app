"""
GL Model Academy — Backend integration tests via public REACT_APP_BACKEND_URL.

Covers: auth (register/login/me/logout), onboarding, content endpoints,
quiz attempts (scoring, 3-attempt limit), journal CRUD, performance/report,
admin endpoints + role gating.
"""
import os
import uuid
import pytest
import requests

BASE_URL = os.environ.get("REACT_APP_BACKEND_URL", "http://localhost:8000").rstrip("/")
API = f"{BASE_URL}/api"

ADMIN_EMAIL = os.environ.get("ADMIN_EMAIL", "mentor@seudominio.com")
ADMIN_PASSWORD = os.environ.get("ADMIN_PASSWORD", "troque-esta-senha-antes-de-vender")


def _session():
    s = requests.Session()
    s.headers.update({"Content-Type": "application/json"})
    return s


def _login(email, password):
    s = _session()
    r = s.post(f"{API}/auth/login", json={"email": email, "password": password}, timeout=15)
    assert r.status_code == 200, f"login failed: {r.status_code} {r.text}"
    data = r.json()
    token = data["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s, data


# ---------- Fixtures ----------
@pytest.fixture(scope="session")
def admin_session():
    s, data = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
    return s, data


@pytest.fixture(scope="session")
def student_session():
    # Register a unique test student per run
    email = f"TEST_{uuid.uuid4().hex[:8]}@glmodel.com"
    password = "TesteSeguro@2026"
    s = _session()
    r = s.post(f"{API}/auth/register", json={"email": email, "password": password, "name": "TEST Student"}, timeout=15)
    assert r.status_code == 200, f"register failed: {r.status_code} {r.text}"
    data = r.json()
    token = data["access_token"]
    s.headers.update({"Authorization": f"Bearer {token}"})
    return s, data, email, password


# ---------- Auth ----------
class TestAuth:
    def test_register_returns_access_token(self, student_session):
        _, data, email, _ = student_session
        assert data["email"].lower() == email.lower()
        assert data["role"] == "student"
        assert data["has_onboarded"] is False
        assert isinstance(data.get("access_token"), str) and len(data["access_token"]) > 20

    def test_register_duplicate(self, student_session):
        _, _, email, password = student_session
        r = requests.post(f"{API}/auth/register",
                          json={"email": email, "password": password, "name": "Dup"}, timeout=10)
        assert r.status_code == 409

    def test_login_admin(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": ADMIN_PASSWORD}, timeout=15)
        assert r.status_code == 200, r.text
        data = r.json()
        assert data["role"] == "admin"
        assert "access_token" in data
        # cookies set
        assert "access_token" in r.cookies or any(
            "access_token" in c.name for c in r.cookies)

    def test_login_invalid_credentials(self):
        r = requests.post(f"{API}/auth/login",
                          json={"email": ADMIN_EMAIL, "password": "wrong"}, timeout=10)
        assert r.status_code == 401

    def test_me_with_bearer(self, admin_session):
        s, _ = admin_session
        r = s.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 200
        assert r.json()["email"] == ADMIN_EMAIL

    def test_me_unauthorized(self):
        r = requests.get(f"{API}/auth/me", timeout=10)
        assert r.status_code == 401

    def test_logout(self, admin_session):
        s, _ = admin_session
        r = s.post(f"{API}/auth/logout", timeout=10)
        assert r.status_code == 200
        assert r.json().get("ok") is True


# ---------- Onboarding ----------
class TestOnboarding:
    def test_save_and_persist(self, student_session):
        s, _, _, _ = student_session
        payload = {"experience": "iniciante", "platform": "tradingview",
                   "market": "es_mes", "difficulty": "mapa"}
        r = s.post(f"{API}/user/onboarding", json=payload, timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert data["has_onboarded"] is True
        assert data["onboarding"]["experience"] == "iniciante"
        # GET /me to verify persisted
        r2 = s.get(f"{API}/auth/me", timeout=10)
        assert r2.status_code == 200
        assert r2.json()["has_onboarded"] is True


# ---------- Content ----------
class TestContent:
    def test_app_info(self):
        r = requests.get(f"{API}/content/app-info", timeout=10)
        assert r.status_code == 200
        data = r.json()
        for key in ("name", "tagline", "disclaimer", "decision_sentence"):
            assert key in data, f"missing key {key}"

    def test_modules_count_and_progress(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/content/modules", timeout=15)
        assert r.status_code == 200
        mods = r.json()
        assert isinstance(mods, list)
        assert len(mods) >= 10, f"expected 10 modules, got {len(mods)}"
        # progress attached
        for m in mods:
            assert "progress" in m
            assert "lesson_done" in m["progress"]

    def test_single_module(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/content/modules/m01_fundamentos", timeout=10)
        assert r.status_code == 200
        m = r.json()
        assert m["id"] == "m01_fundamentos"
        assert "questions" in m
        assert len(m["questions"]) > 0

    def test_knowledge(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/content/knowledge", timeout=10)
        assert r.status_code == 200
        data = r.json()
        assert len(data) >= 10, f"expected 10 knowledge pages, got {len(data)}"

    def test_learning_drills(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/content/learning-drills", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_journey_stages(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/content/journey-stages", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 5

    def test_challenges(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/content/challenges", timeout=10)
        assert r.status_code == 200
        assert len(r.json()) >= 4

    def test_badges_with_earned_flag(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/content/badges", timeout=10)
        assert r.status_code == 200
        badges = r.json()
        assert len(badges) >= 10
        for b in badges:
            assert "earned" in b


# ---------- Quiz / Attempts ----------
class TestAttempts:
    """Test scoring and 3-attempt limit on q_m02_001 (a,d,g)."""

    def _attempt(self, s, question_id, module_id, selected):
        return s.post(f"{API}/attempts", json={
            "question_id": question_id,
            "module_id": module_id,
            "scope": "module",
            "selected_option_ids": selected,
            "decision_input": {
                "regime": "tendencia", "mapa": "hvn", "gatilho": "abs",
                "risco": "1R", "entrada": "x", "stop": "y", "alvo": "z"
            },
        }, timeout=15)

    def test_full_attempt_flow(self, student_session):
        s, _, _, _ = student_session
        qid = "q_m02_001"
        mid = "m02_gl_model_multifractal"
        # Attempt 1: wrong
        r1 = self._attempt(s, qid, mid, ["b"])
        assert r1.status_code == 200, r1.text
        d1 = r1.json()
        assert d1["is_correct"] is False
        assert d1["score"] == 0
        assert d1["attempt_number"] == 1

        # Attempt 2: wrong (partial)
        r2 = self._attempt(s, qid, mid, ["a", "d"])
        assert r2.status_code == 200
        d2 = r2.json()
        assert d2["is_correct"] is False
        assert d2["score"] == 0
        assert d2["attempt_number"] == 2

        # Attempt 3: correct -> score 40
        r3 = self._attempt(s, qid, mid, ["a", "d", "e"])
        assert r3.status_code == 200
        d3 = r3.json()
        assert d3["is_correct"] is True
        assert d3["score"] == 40
        assert d3["attempt_number"] == 3

        # Attempt 4: rejected
        r4 = self._attempt(s, qid, mid, ["a", "d", "e"])
        assert r4.status_code == 400

    def test_first_attempt_correct_scores_100(self, student_session):
        s, _, _, _ = student_session
        qid = "q_m10_001"
        mid = "m10_confluencia_rotina"
        r = self._attempt(s, qid, mid, ["a", "c", "e"])
        assert r.status_code == 200, r.text
        d = r.json()
        assert d["is_correct"] is True
        assert d["score"] == 100
        assert d["attempt_number"] == 1

    def test_by_question_list(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/attempts/by-question/q_m02_001", timeout=10)
        assert r.status_code == 200
        attempts = r.json()
        assert isinstance(attempts, list)
        assert len(attempts) >= 3


# ---------- Journal ----------
class TestJournal:
    def test_crud(self, student_session):
        s, _, _, _ = student_session
        payload = {"operacional": "TEST_compra ES @ HVN", "contexto": "tendencia",
                   "risco_r": 1.0, "resultado_r": 1.5}
        r = s.post(f"{API}/journal", json=payload, timeout=10)
        assert r.status_code == 200
        created = r.json()
        eid = created["id"]
        assert created["operacional"] == "TEST_compra ES @ HVN"

        # list
        r2 = s.get(f"{API}/journal", timeout=10)
        assert r2.status_code == 200
        entries = r2.json()
        assert any(e["id"] == eid for e in entries)

        # delete
        r3 = s.delete(f"{API}/journal/{eid}", timeout=10)
        assert r3.status_code == 200

        # verify removal
        r4 = s.get(f"{API}/journal", timeout=10)
        assert not any(e["id"] == eid for e in r4.json())


# ---------- Performance / Report ----------
class TestPerformanceReport:
    def test_performance_structure(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/user/performance", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("points", "level", "overall_accuracy", "tag_stats",
                  "layer_accuracy", "strong_tags", "weak_tags", "badges"):
            assert k in d, f"missing key {k}"
        assert d["points"] >= 100  # earned 100 from q_m10_001 + 40 from q_m02_001 attempt 3

    def test_report_structure(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/user/report", timeout=15)
        assert r.status_code == 200
        d = r.json()
        for k in ("user", "metrics", "diagnosis", "review_plan", "upsell_suggestions"):
            assert k in d, f"missing key {k}"
        assert isinstance(d["review_plan"], list)
        assert len(d["review_plan"]) == 7


# ---------- Admin ----------
class TestAdmin:
    def test_students_requires_admin(self, student_session):
        s, _, _, _ = student_session
        r = s.get(f"{API}/admin/students", timeout=10)
        assert r.status_code == 403

    def test_students_admin_ok(self):
        # Use a fresh admin session (don't reuse session-fixture which was logged out)
        s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        r = s.get(f"{API}/admin/students", timeout=15)
        assert r.status_code == 200
        assert isinstance(r.json(), list)

    def test_student_detail(self, student_session):
        # admin fetches student
        student_s, sdata, _, _ = student_session
        sid = sdata["id"]
        s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        r = s.get(f"{API}/admin/students/{sid}", timeout=10)
        assert r.status_code == 200
        d = r.json()
        assert d["user"]["id"] == sid
        assert "metrics" in d

    def test_module_update_persists(self):
        s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        new_url = f"https://www.youtube.com/embed/TEST_{uuid.uuid4().hex[:6]}"
        r = s.patch(f"{API}/admin/modules/m01_fundamentos",
                    json={"video_url": new_url}, timeout=10)
        assert r.status_code == 200
        # verify via GET
        r2 = s.get(f"{API}/content/modules/m01_fundamentos", timeout=10)
        assert r2.status_code == 200
        m = r2.json()
        assert m.get("lesson", {}).get("video_url") == new_url

    def test_upsell_update(self):
        s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        # get list
        r = s.get(f"{API}/admin/upsells", timeout=10)
        assert r.status_code == 200
        upsells = r.json()
        if not upsells:
            pytest.skip("no upsell rules seeded")
        rid = upsells[0]["id"]
        new_title = f"TEST_Mentoria Premium {uuid.uuid4().hex[:4]}"
        r2 = s.patch(f"{API}/admin/upsells/{rid}",
                     json={"offer_title": new_title}, timeout=10)
        assert r2.status_code == 200
        assert r2.json()["offer_title"] == new_title

    def test_stats(self):
        s, _ = _login(ADMIN_EMAIL, ADMIN_PASSWORD)
        r = s.get(f"{API}/admin/stats", timeout=10)
        assert r.status_code == 200
        d = r.json()
        for k in ("students", "onboarded", "total_attempts", "journal_entries"):
            assert k in d
