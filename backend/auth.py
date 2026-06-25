"""Auth utilities — JWT cookie-based authentication."""
import os
import bcrypt
import jwt
import secrets
from datetime import datetime, timezone, timedelta
from fastapi import HTTPException, Request, Response

JWT_ALGORITHM = "HS256"
ACCESS_TTL = timedelta(days=7)
REFRESH_TTL = timedelta(days=30)


def get_jwt_secret() -> str:
    return os.environ["JWT_SECRET"]


def hash_password(password: str) -> str:
    salt = bcrypt.gensalt()
    return bcrypt.hashpw(password.encode("utf-8"), salt).decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except Exception:
        return False


def create_access_token(user_id: str, email: str, role: str) -> str:
    payload = {
        "sub": user_id,
        "email": email,
        "role": role,
        "exp": datetime.now(timezone.utc) + ACCESS_TTL,
        "type": "access",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def create_refresh_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.now(timezone.utc) + REFRESH_TTL,
        "type": "refresh",
    }
    return jwt.encode(payload, get_jwt_secret(), algorithm=JWT_ALGORITHM)


def set_auth_cookies(response: Response, access: str, refresh: str) -> None:
    response.set_cookie(
        key="access_token",
        value=access,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=int(ACCESS_TTL.total_seconds()),
        path="/",
    )
    response.set_cookie(
        key="refresh_token",
        value=refresh,
        httponly=True,
        secure=True,
        samesite="none",
        max_age=int(REFRESH_TTL.total_seconds()),
        path="/",
    )


def clear_auth_cookies(response: Response) -> None:
    response.delete_cookie("access_token", path="/")
    response.delete_cookie("refresh_token", path="/")


async def get_current_user(request: Request, db) -> dict:
    token = request.cookies.get("access_token")
    if not token:
        auth_header = request.headers.get("Authorization", "")
        if auth_header.startswith("Bearer "):
            token = auth_header[7:]
    if not token:
        raise HTTPException(status_code=401, detail="Not authenticated")
    try:
        payload = jwt.decode(token, get_jwt_secret(), algorithms=[JWT_ALGORITHM])
        if payload.get("type") != "access":
            raise HTTPException(status_code=401, detail="Invalid token type")
        user = await db.users.find_one({"id": payload["sub"]})
        if not user:
            raise HTTPException(status_code=401, detail="User not found")
        if user.get("role") != "admin" and user.get("account_status", "active") != "active":
            status = user.get("account_status", "pending")
            if status == "blocked":
                raise HTTPException(status_code=403, detail="Acesso bloqueado. Fale com a equipe GL Academy.")
            raise HTTPException(status_code=403, detail="Cadastro aguardando aprovacao da equipe GL Academy.")
        user.pop("password_hash", None)
        user.pop("_id", None)
        return user
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError:
        raise HTTPException(status_code=401, detail="Invalid token")


async def require_admin(request: Request, db) -> dict:
    user = await get_current_user(request, db)
    if user.get("role") != "admin":
        raise HTTPException(status_code=403, detail="Admin access required")
    return user


# Brute force protection
LOCKOUT_THRESHOLD = 5
LOCKOUT_DURATION = timedelta(minutes=15)


async def check_brute_force(db, identifier: str) -> None:
    now = datetime.now(timezone.utc)
    rec = await db.login_attempts.find_one({"identifier": identifier})
    if rec and rec.get("count", 0) >= LOCKOUT_THRESHOLD:
        last = rec.get("last_at")
        if isinstance(last, str):
            last = datetime.fromisoformat(last)
        if last and now - last < LOCKOUT_DURATION:
            mins = int((LOCKOUT_DURATION - (now - last)).total_seconds() / 60) + 1
            raise HTTPException(status_code=429, detail=f"Muitas tentativas. Tente novamente em {mins} minutos.")
        await db.login_attempts.delete_one({"identifier": identifier})


async def record_failed_login(db, identifier: str) -> None:
    now = datetime.now(timezone.utc).isoformat()
    await db.login_attempts.update_one(
        {"identifier": identifier},
        {"$inc": {"count": 1}, "$set": {"last_at": now}},
        upsert=True,
    )


async def clear_login_attempts(db, identifier: str) -> None:
    await db.login_attempts.delete_one({"identifier": identifier})
