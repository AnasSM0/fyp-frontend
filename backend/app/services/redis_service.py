from __future__ import annotations

import logging
from dataclasses import dataclass

from app.core.config import get_settings

logger = logging.getLogger(__name__)

_CLIENT = None
_WARNED_UNAVAILABLE = False


@dataclass
class RedisLockResult:
    acquired: bool | None
    fallback_to_memory: bool
    redis_enabled: bool


def reset_redis_client_for_tests() -> None:
    global _CLIENT, _WARNED_UNAVAILABLE
    _CLIENT = None
    _WARNED_UNAVAILABLE = False


def redis_config_enabled() -> bool:
    settings = get_settings()
    return bool(getattr(settings, "redis_enabled", False) and getattr(settings, "redis_url", ""))


def redis_client():
    global _CLIENT, _WARNED_UNAVAILABLE
    if not redis_config_enabled():
        return None
    if _CLIENT is not None:
        return _CLIENT
    settings = get_settings()
    try:
        import redis

        client = redis.Redis.from_url(
            settings.redis_url,
            decode_responses=True,
            socket_connect_timeout=2,
            socket_timeout=2,
        )
        client.ping()
        _CLIENT = client
        return _CLIENT
    except Exception as exc:
        if not _WARNED_UNAVAILABLE:
            logger.warning("Redis unavailable; falling back to in-memory operational locks/cooldowns. %s", exc)
            _WARNED_UNAVAILABLE = True
        return None


def acquire_lock(key: str, value: str, ttl_seconds: int) -> RedisLockResult:
    client = redis_client()
    if client is None:
        return RedisLockResult(acquired=None, fallback_to_memory=redis_config_enabled(), redis_enabled=redis_config_enabled())
    try:
        acquired = bool(client.set(key, value, nx=True, ex=max(1, int(ttl_seconds))))
        return RedisLockResult(acquired=acquired, fallback_to_memory=False, redis_enabled=True)
    except Exception as exc:
        global _WARNED_UNAVAILABLE
        if not _WARNED_UNAVAILABLE:
            logger.warning("Redis lock operation failed; falling back to in-memory lock. %s", exc)
            _WARNED_UNAVAILABLE = True
        return RedisLockResult(acquired=None, fallback_to_memory=True, redis_enabled=True)


def release_lock(key: str, value: str) -> None:
    client = redis_client()
    if client is None:
        return
    try:
        script = """
        if redis.call("GET", KEYS[1]) == ARGV[1] then
            return redis.call("DEL", KEYS[1])
        end
        return 0
        """
        client.eval(script, 1, key, value)
    except Exception as exc:
        logger.warning("Redis lock release failed; TTL will expire the lock. %s", exc)


def set_cooldown(key: str, ttl_seconds: int) -> bool:
    client = redis_client()
    if client is None:
        return False
    try:
        client.set(key, "1", ex=max(1, int(ttl_seconds)))
        return True
    except Exception as exc:
        global _WARNED_UNAVAILABLE
        if not _WARNED_UNAVAILABLE:
            logger.warning("Redis cooldown operation failed; falling back to in-memory cooldown. %s", exc)
            _WARNED_UNAVAILABLE = True
        return False


def cooldown_ttl(key: str) -> int | None:
    client = redis_client()
    if client is None:
        return None
    try:
        ttl = int(client.ttl(key))
    except Exception as exc:
        global _WARNED_UNAVAILABLE
        if not _WARNED_UNAVAILABLE:
            logger.warning("Redis cooldown TTL check failed; falling back to in-memory cooldown. %s", exc)
            _WARNED_UNAVAILABLE = True
        return None
    return ttl if ttl > 0 else None


def delete_key(key: str) -> None:
    client = redis_client()
    if client is None:
        return
    try:
        client.delete(key)
    except Exception as exc:
        logger.warning("Redis delete failed. %s", exc)
