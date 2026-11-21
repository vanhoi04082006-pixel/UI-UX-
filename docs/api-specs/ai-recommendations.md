# API GROUP: ai-recommendations (3 ops)

## GET /api/v1/intern/me/ai-recommendations
operationId: RecommendationsController_latestOwn_v1  |  summary: My latest AI development recommendations (ai.recommendations.view.own; AI-generated, advisory, non-authoritative; 404 until first refresh)
Responses: 200: no-content

## POST /api/v1/intern/me/ai-recommendations/refresh
operationId: RecommendationsController_refreshOwn_v1  |  summary: Refresh my recommendations — deterministic source facts are hashed; unchanged facts reuse the existing snapshot WITHOUT a provider call; changed facts generate a new snapshot (AI-generated, advisory)
Responses: 201: no-content

## GET /api/v1/performance/interns/{userId}/ai-recommendations
operationId: RecommendationsController_latestForIntern_v1  |  summary: Latest AI recommendations for one intern (ai.recommendations.view; strict session/project mentor scope or admin; advisory, non-authoritative)
Params: userId in:path required string
Responses: 200: no-content
