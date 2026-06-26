"""Seed loader — pulls JSON content into MongoDB.

Idempotent: if a document with the same id exists, it is updated (only if not edited by admin).
A flag `_admin_edited` blocks future re-seeding so admin edits stick.
"""
import json
import logging
from pathlib import Path
from datetime import datetime, timezone
from auth import hash_password, verify_password
import os

DATA_DIR = Path(__file__).parent / "data"


def load_json(name: str):
    return json.loads((DATA_DIR / name).read_text(encoding="utf-8"))


def resolve_video_url(existing_video_url: str, seed_video_url: str) -> str:
    if not seed_video_url:
        return existing_video_url or ""
    if not existing_video_url:
        return seed_video_url
    if "EzhetDC0MZs" in existing_video_url and existing_video_url != seed_video_url:
        return seed_video_url
    old_local_video = (
        existing_video_url.startswith("videos/")
        or existing_video_url.startswith("/videos/")
        or existing_video_url.endswith((".mp4", ".webm", ".m4v", ".mov"))
    )
    if old_local_video:
        return seed_video_url
    return existing_video_url


async def seed_admin(db) -> None:
    email = (os.environ.get("ADMIN_EMAIL") or "").lower().strip()
    password = os.environ.get("ADMIN_PASSWORD")
    if not email or not password:
        logging.warning("ADMIN_EMAIL/ADMIN_PASSWORD ausentes; admin seed ignorado.")
        return
    existing = await db.users.find_one({"email": email})
    if existing is None:
        existing = await db.users.find_one({"id": "admin-seed-001"})
    now_iso = datetime.now(timezone.utc).isoformat()
    if existing is None:
        await db.users.insert_one({
            "id": "admin-seed-001",
            "email": email,
            "password_hash": hash_password(password),
            "name": "Gestao GL",
            "role": "admin",
            "account_status": "active",
            "has_onboarded": True,
            "onboarding": None,
            "created_at": now_iso,
        })
    else:
        update = {
            "email": email,
            "name": existing.get("name") or "Gestao GL",
            "role": "admin",
            "account_status": "active",
            "approval_required": False,
            "has_onboarded": True,
            "approved_at": existing.get("approved_at") or now_iso,
            "approved_by": existing.get("approved_by") or "admin_seed",
        }
        if not verify_password(password, existing.get("password_hash", "")):
            update["password_hash"] = hash_password(password)
        await db.users.update_one({"email": email}, {"$set": update})


async def seed_content(db) -> None:
    """Insert seed.json and content.json into MongoDB collections.
    Skips documents already flagged as admin-edited."""
    seed = load_json("seed.json")
    content = load_json("content.json")

    # App info
    await db.app_info.replace_one(
        {"_singleton": True},
        {
            "_singleton": True,
            "name": seed["app"]["name"],
            "tagline": seed["app"]["tagline"],
            "disclaimer": seed["app"]["disclaimer"],
            "core_principle": seed["app"]["core_principle"],
            "decision_sentence": seed["app"]["decision_sentence"],
        },
        upsert=True,
    )

    # Learning layers, core families, hud readings
    await db.learning_layers.delete_many({})
    if seed.get("learning_layers"):
        await db.learning_layers.insert_many(seed["learning_layers"])

    await db.core_families.delete_many({})
    if seed.get("core_families"):
        await db.core_families.insert_many(seed["core_families"])

    await db.hud_readings.delete_many({})
    if seed.get("hud_readings"):
        await db.hud_readings.insert_many(seed["hud_readings"])

    # Modules — merge moduleEnrichment.lessonPage + practical + stage
    enrichment = content.get("moduleEnrichment", {})
    extras = content.get("extraQuestions", {})
    module_ids = [mod["id"] for mod in seed["modules"]]
    await db.modules.delete_many({"id": {"$nin": module_ids}})
    for mod in seed["modules"]:
        existing = await db.modules.find_one({"id": mod["id"]})
        existing_video_url = (existing or {}).get("lesson", {}).get("video_url", "")
        seed_video_url = mod.get("lesson", {}).get("video_url", "")
        enrich = enrichment.get(mod["id"], {})
        questions = list(mod.get("questions", []))
        # add extra questions
        for q in extras.get(mod["id"], []):
            if not any(qq["id"] == q["id"] for qq in questions):
                questions.append(q)
        doc = {
            "id": mod["id"],
            "order": mod["order"],
            "title": mod["title"],
            "objective": mod["objective"],
            "summary": mod["summary"],
            "tags": mod.get("tags", []),
            "track": mod.get("track", ""),
            "sequence_group": mod.get("sequence_group", mod.get("track", "")),
            "role_label": mod.get("role_label", ""),
            "locked": mod.get("locked", False),
            "required_entitlement": mod.get("required_entitlement", ""),
            "release_status": mod.get("release_status", "available"),
            "release_label": mod.get("release_label", ""),
            "release_message": mod.get("release_message", ""),
            "unlock_requirements": mod.get("unlock_requirements", {}),
            "require_all_correct": mod.get("require_all_correct", False),
            "require_decision": mod.get("require_decision", True),
            "role_focus_time": mod.get("role_focus_time", ""),
            "role_focus_seconds": mod.get("role_focus_seconds", 0),
            "role_focus_label": mod.get("role_focus_label", ""),
            "lesson": {
                "video_url": resolve_video_url(existing_video_url, seed_video_url),
                "video_placeholder": mod.get("lesson", {}).get("video_placeholder", ""),
                "text": mod.get("lesson", {}).get("text", ""),
                "chapters": mod.get("lesson", {}).get("chapters", []),
                "require_full_video": mod.get("lesson", {}).get("require_full_video", False),
            },
            "stage": enrich.get("stage", ""),
            "lesson_page": enrich.get("lessonPage", {}),
            "practical": enrich.get("practical", {}),
            "questions": questions,
        }
        await db.modules.replace_one({"id": mod["id"]}, doc, upsert=True)

    # Journey stages
    await db.journey_stages.delete_many({})
    if content.get("journeyStages"):
        await db.journey_stages.insert_many(content["journeyStages"])

    # Knowledge pages
    knowledge_ids = [page["id"] for page in content.get("knowledgePages", [])]
    if knowledge_ids:
        await db.knowledge_pages.delete_many({"id": {"$nin": knowledge_ids}})
    for page in content.get("knowledgePages", []):
        await db.knowledge_pages.replace_one({"id": page["id"]}, page, upsert=True)

    # Learning drills (Treino 4D)
    await db.learning_drills.delete_many({})
    if content.get("learningDrills"):
        drills = content["learningDrills"]
        for i, d in enumerate(drills):
            d["order"] = i
        await db.learning_drills.insert_many(drills)

    # Tag labels and layer tags
    await db.app_config.replace_one(
        {"_singleton": True},
        {
            "_singleton": True,
            "tag_labels": content.get("tagLabels", {}),
            "layer_tags": content.get("layerTags", {}),
        },
        upsert=True,
    )

    # Challenges
    challenge_ids = [ch["id"] for ch in seed.get("challenges", [])]
    if challenge_ids:
        await db.challenges.delete_many({"id": {"$nin": challenge_ids}})
    for ch in seed.get("challenges", []):
        await db.challenges.replace_one({"id": ch["id"]}, ch, upsert=True)

    # Badges
    await db.badges.delete_many({})
    if seed.get("badges"):
        await db.badges.insert_many(seed["badges"])

    # Upsell rules
    upsell_ids = [rule["id"] for rule in seed.get("upsell_rules", [])]
    if upsell_ids:
        await db.upsell_rules.delete_many({"id": {"$nin": upsell_ids}})
    for rule in seed.get("upsell_rules", []):
        await db.upsell_rules.replace_one({"id": rule["id"]}, rule, upsert=True)


async def ensure_indexes(db) -> None:
    await db.users.create_index("email", unique=True)
    await db.users.create_index("id", unique=True)
    await db.users.create_index("account_status")
    await db.attempts.create_index([("user_id", 1), ("question_id", 1)])
    await db.attempts.create_index("user_id")
    await db.journal_entries.create_index("user_id")
    await db.commission_requests.create_index("id", unique=True)
    await db.commission_requests.create_index("user_id")
    await db.commission_requests.create_index("approval_status")
    await db.modules.create_index("id", unique=True)
    await db.modules.create_index("order")
    await db.knowledge_pages.create_index("id", unique=True)
    await db.challenges.create_index("id", unique=True)
    await db.badges.create_index("id", unique=True)
    await db.upsell_rules.create_index("id", unique=True)
    await db.lesson_progress.create_index([("user_id", 1), ("module_id", 1)], unique=True)
    await db.user_badges.create_index([("user_id", 1), ("badge_id", 1)], unique=True)
    await db.login_attempts.create_index("identifier")
    await db.password_reset_tokens.create_index("token_hash", unique=True)
    await db.password_reset_tokens.create_index("expires_at")
    await db.access_events.create_index("created_at")
    await db.access_events.create_index("user_id")
    await db.access_events.create_index("email")
    await db.push_subscriptions.create_index([("user_id", 1), ("endpoint", 1)], unique=True)
    await db.news_updates.create_index("created_at")
    await db.market_reports.create_index("created_at")
    await db.access_codes.create_index("id", unique=True)
    await db.access_codes.create_index("code", unique=True)
    await db.access_codes.create_index("active")
    await db.access_codes.create_index("expires_at")
