from urllib.parse import parse_qs
from django.conf import settings
from django.contrib.auth import get_user_model
from channels.db import database_sync_to_async
from rest_framework_simplejwt.backends import TokenBackend
from django.contrib.auth.models import AnonymousUser
import logging

logger = logging.getLogger(__name__)

User = get_user_model()


class TokenAuthMiddleware:
    """ASGI middleware that authenticates a user from a JWT token passed as a
    `token` query parameter (e.g. ws://.../?token=...).

    This middleware is used like:
        application = TokenAuthMiddleware(inner_application)
    """

    def __init__(self, inner):
        self.inner = inner

    async def __call__(self, scope, receive, send):
        # copy scope so we don't mutate the original
        scope = dict(scope)

        # Parse token from query string
        query_string = scope.get('query_string', b'').decode()
        params = parse_qs(query_string)
        token = params.get('token', [None])[0]

        user = AnonymousUser()
        if token:
            try:
                token_backend = TokenBackend(algorithm='HS256', signing_key=settings.SECRET_KEY)
                validated = token_backend.decode(token, verify=True)
                user_id = validated.get('user_id')
                if user_id:
                    user = await database_sync_to_async(User.objects.get)(id=user_id)
                    logger.debug("WS token auth: decoded user_id=%s for path=%r", user_id, scope.get('path'))
            except Exception:
                # Log the exception with stack trace and a token preview (don't log full token in production)
                token_preview = (token[:20] + '...') if token else None
                logger.exception("WS token auth failed for path=%r token_preview=%r", scope.get('path'), token_preview)
                user = AnonymousUser()
        else:
            logger.debug("No WS token provided in query string for path=%r", scope.get('path'))

        scope['user'] = user
        logger.debug("WS scope user set to %r for path=%r", getattr(user, 'id', None), scope.get('path'))

        return await self.inner(scope, receive, send)


def TokenAuthMiddlewareStack(inner):
    return TokenAuthMiddleware(inner)
