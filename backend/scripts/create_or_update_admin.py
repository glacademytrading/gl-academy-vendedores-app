"""Create or update a GL Model Academy admin user.

Run this from the Render Shell for the backend service. It reads MONGO_URL and
DB_NAME from the service environment and never prints database secrets.

Example:

python scripts/create_or_update_admin.py --email equipe@glacademytrading.com --name "Equipe GL Academy"

You can pass the password with GL_ADMIN_PASSWORD env var or type it when asked.
"""
import argparse
import asyncio
import getpass
import os
import sys
import uuid
from datetime import datetime, timezone
from pathlib import Path

from motor.motor_asyncio import AsyncIOMotorClient

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from auth import hash_password


def utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


async def main() -> None:
    parser = argparse.ArgumentParser(description="Create or update an admin user.")
    parser.add_argument("--email", required=True, help="Admin e-mail.")
    parser.add_argument("--name", default="Equipe GL Academy", help="Admin display name.")
    parser.add_argument("--password", default=os.environ.get("GL_ADMIN_PASSWORD", ""), help="Admin password. Prefer GL_ADMIN_PASSWORD env var.")
    parser.add_argument("--entitlement", action="append", default=["gl_risk_auto"], help="Entitlement to add. Can be repeated.")
    args = parser.parse_args()

    mongo_url = os.environ.get("MONGO_URL")
    db_name = os.environ.get("DB_NAME")
    if not mongo_url or not db_name:
        raise SystemExit("MONGO_URL and DB_NAME must exist in the Render environment.")

    password = args.password
    if not password:
        password = getpass.getpass("Admin password: ")
    if len(password) < 12:
        raise SystemExit("Use a stronger password with at least 12 characters.")

    email = args.email.strip().lower()
    now = utc_now_iso()
    client = AsyncIOMotorClient(mongo_url)
    db = client[db_name]
    existing = await db.users.find_one({"email": email})

    update = {
        "email": email,
        "name": args.name.strip(),
        "role": "admin",
        "has_onboarded": True,
        "onboarding": None,
        "entitlements": sorted(set(args.entitlement or [])),
        "password_hash": hash_password(password),
    }
    if existing:
        await db.users.update_one({"email": email}, {"$set": update})
        user_id = existing.get("id")
        action = "updated"
    else:
        user_id = f"admin-{uuid.uuid4()}"
        update["id"] = user_id
        update["created_at"] = now
        update["last_login_at"] = None
        update["login_count"] = 0
        await db.users.insert_one(update)
        action = "created"

    client.close()
    print(f"Admin {action}: {email} id={user_id}")


if __name__ == "__main__":
    asyncio.run(main())
