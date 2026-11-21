# API GROUP: recruitment (16 ops)

## GET /api/v1/recruitment/candidates
operationId: RecruitmentController_candidates_v1  |  summary: Candidate recruitment status list (instructor/admin read-only)
Params: page in:query number | pageSize in:query number | search in:query string | role in:query string | eligibility in:query string enum:['available', 'all'] | status in:query string | sort in:query string enum:['updatedAt', 'name', 'overallScore']
Responses: 200: no-content

## GET /api/v1/recruitment/candidates/{userId}
operationId: RecruitmentController_candidate_v1  |  summary: One candidate recruitment status (read-only)
Params: userId in:path required string
Responses: 200: no-content

## GET /api/v1/recruitment/me
operationId: RecruitmentController_me_v1  |  summary: My recruitment profile: status, attempts, cooldown, latest result (spec 41)
Responses: 200: no-content

## GET /api/v1/recruitment/me/interviews
operationId: RecruitmentController_history_v1  |  summary: My interview attempts and persisted results, newest attempt first
Params: page in:query number | pageSize in:query number
Responses: 200: no-content

## POST /api/v1/recruitment/me/interviews
operationId: RecruitmentController_startInterview_v1  |  summary: Start an interview session: 10 sequential questions (2 introduction + 6 technical + 2 English), backend timer, attempt+cooldown enforced
Responses: 201: no-content

## GET /api/v1/recruitment/me/interviews/{id}
operationId: RecruitmentController_getSession_v1  |  summary: My interview session status (own sessions only; 404-safe)
Params: id in:path required string
Responses: 200: no-content

## PUT /api/v1/recruitment/me/interviews/{id}/answers/{questionId}
operationId: RecruitmentController_saveAnswer_v1  |  summary: Save/update MY answer for a session question (only while in_progress and before backend expiry — spec 16/17)
Params: id in:path required string | questionId in:path required string
Body (application/json): SaveAnswerDto = {answerText*:string}
Responses: 200: no-content

## GET /api/v1/recruitment/me/interviews/{id}/conversation
operationId: RecruitmentController_conversationView_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/recruitment/me/interviews/{id}/conversation/clarify
operationId: RecruitmentController_clarifyConversation_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content

## POST /api/v1/recruitment/me/interviews/{id}/conversation/next
operationId: RecruitmentController_nextConversation_v1  |  summary: -
Params: id in:path required string
Responses: 201: no-content

## PUT /api/v1/recruitment/me/interviews/{id}/follow-ups/{questionId}
operationId: RecruitmentController_answerFollowUp_v1  |  summary: -
Params: id in:path required string | questionId in:path required string
Body (application/json): SaveAnswerDto = {answerText*:string}
Responses: 200: no-content

## GET /api/v1/recruitment/me/interviews/{id}/questions
operationId: RecruitmentController_getQuestions_v1  |  summary: Sanitized questions of MY session: id/position/category/prompt/answered — NEVER rubric or expected answers (spec 42)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/recruitment/me/interviews/{id}/retry-evaluation
operationId: RecruitmentController_retryEvaluation_v1  |  summary: Retry a failed evaluation (evaluation_failed only): same snapshots, same answers, no duplicate result (spec 39/40)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/recruitment/me/interviews/{id}/submit
operationId: RecruitmentController_submit_v1  |  summary: Submit the interview (idempotent): validates completeness + backend timer, then runs the AI evaluation; Backend computes overall = 0.7*technical + 0.3*soft and the pass/fail decision itself (spec 4/36)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/recruitment/me/result
operationId: RecruitmentController_myResult_v1  |  summary: My authoritative recruitment result (backend-computed scores + decision)
Responses: 200: no-content

## PATCH /api/v1/recruitment/me/role
operationId: RecruitmentController_selectRole_v1  |  summary: Select a career code from the published recruiting catalog
Body (application/json): SelectRoleDto = {role*:string}
Responses: 200: no-content
