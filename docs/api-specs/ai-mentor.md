# API GROUP: ai-mentor (5 ops)

## GET /api/v1/intern/me/ai-mentor/conversations
operationId: AiMentorController_list_v1  |  summary: My AI mentor conversations (ai.mentor.use; identity = principal; AI-generated advisory content — non-authoritative)
Params: page in:query number | pageSize in:query number | status in:query string enum:['active', 'archived']
Responses: 200: no-content

## POST /api/v1/intern/me/ai-mentor/conversations
operationId: AiMentorController_create_v1  |  summary: Create an AI mentor conversation owned by the authenticated intern
Body (application/json): CreateAiMentorConversationDto = {title:string}
Responses: 201: no-content

## GET /api/v1/intern/me/ai-mentor/conversations/{id}
operationId: AiMentorController_getOne_v1  |  summary: One of my AI mentor conversations with ordered messages (404-safe for foreign conversations)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/intern/me/ai-mentor/conversations/{id}/archive
operationId: AiMentorController_archive_v1  |  summary: Archive my conversation (logical status — rows are retained; archived conversations reject new messages; idempotent)
Params: id in:path required string
Responses: 201: no-content

## POST /api/v1/intern/me/ai-mentor/conversations/{id}/messages
operationId: AiMentorController_sendMessage_v1  |  summary: Send a message to MY conversation — persists the user message, builds authorized workspace facts, generates the AI answer (AI-generated, advisory, non-authoritative; provider failure keeps the user message and returns a stable AI_* error)
Params: id in:path required string
Body (application/json): SendAiMentorMessageDto = {content*:string}
Responses: 201: no-content
