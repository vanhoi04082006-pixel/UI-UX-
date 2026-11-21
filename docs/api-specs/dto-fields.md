### POST /evaluation-cycles (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["code → = longer than or equal to 1 characters", "code → = a string", "name → = longer than or equal to 1 characters", "name → = a string", "type → = one of the following values: sprint, midterm, final", "startDate → = a valid ISO 8601 date string", "endDate → = a valid ISO 8601 date string"]}

### POST /evaluation-cycles/{id}/criteria (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["code → = longer than or equal to 1 characters", "code → = a string", "name → = longer than or equal to 1 characters", "name → = a string", "weight → must not be greater than 100", "weight → must not be less than 0.01", "weight → = a number conforming to the specified constraints"]}

### POST /kpi-periods (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["code → = longer than or equal to 1 characters", "code → = a string", "name → = longer than or equal to 1 characters", "name → = a string", "startDate → = a valid ISO 8601 date string", "endDate → = a valid ISO 8601 date string"]}

### POST /kpi-periods/{id}/status
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["status → = one of the following values: draft, open, calculating, finalized, closed"]}

### POST /virtual-salary/adjustments
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["userId → = a UUID", "type → = one of the following values: bonus, penalty, adjustment, reversal", "reason → = longer than or equal to 1 characters", "reason should not be empty", "reason → = a string"]}

### POST /groups (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["Code → = 3-64 chars: a-z, 0-9, dot, dash, underscore.", "code → = a string", "name → = shorter than or equal to 128 characters", "name → = longer than or equal to 1 characters", "name → = a string"]}

### POST /groups/{id}/members
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["each value in userIds → = a UUID", "All userIds's elements → = unique", "userIds → must contain no more than 200 elements", "userIds → = an array"]}

### PUT /groups/{id}/roles
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["each value in roleCodes → = a string", "All roleCodes's elements → = unique", "roleCodes → must contain no more than 50 elements", "roleCodes → = an array"]}

### POST /admin/knowledge (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["code → must match /^[a-z][a-z0-9_-]{1,79}$/ regular expression", "code → = a string", "draft should not be null or undefined"]}

### POST /catalogs/types (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["Code → = 3-64 chars: a-z, 0-9, dot, dash, underscore.", "code → = a string", "name → = shorter than or equal to 128 characters", "name → = longer than or equal to 1 characters", "name → = a string"]}

### POST /catalogs/items (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["Type code → = 3-64 chars.", "typeCode → = a string", "Code → = 1-64 chars: a-z, 0-9, dot, dash, underscore.", "code → = a string", "name → = shorter than or equal to 128 characters", "name → = longer than or equal to 1 characters", "name → = a string"]}

### POST /admin/career-roles (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["code → must match /^[a-z][a-z0-9_]{1,31}$/ regular expression", "code → = a string", "name → = shorter than or equal to 128 characters", "name → = longer than or equal to 2 characters", "name → = a string", "description → = shorter than or equal to 2000 characters", "description → = a string", "level → = one of the following values: intern, junior", "language → = one of the following values: vi, en", "each value in requiredSkills → = shorter than or equal to 80 characters", "each value in requiredSkills → = longer than or equal to 1 characters", "each value in requiredSkills → = a string", "requiredSkills → must contain no more than 30 elements", "requiredSkills → = an array"]}

### POST /certificates/issue (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["userId → = a UUID"]}

### POST /admin/question-bank (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["roleCode → must match /^[a-z][a-z0-9_]{1,31}$/ regular expression", "roleCode → = a string", "phase → = one of the following values: technical, introduction, english, communication", "difficulty → = one of the following values: easy, medium, hard", "language → = one of the following values: vi, en", "prompt → = longer than or equal to 10 characters", "prompt → = a string", "each value in expectedConcepts → = longer than or equal to 1 characters", "each value in expectedConcepts → = a string", "All expectedConcepts's elements → = unique", "expectedConcepts → must contain no more than 20 elements", "expectedConcepts → = an array", "exampleAnswer → = longer than or equal to 10 characters", "exampleAnswer → = a string"]}

### POST /users (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["Email is not valid.", "Username → = 3-64 chars: a-z, 0-9, dot, dash, underscore.", "username → = a string", "displayName → = shorter than or equal to 128 characters", "displayName → = longer than or equal to 1 characters", "displayName → = a string", "Password → = at most 72 characters.", "Password → = at least 10 characters.", "password → = a string"]}

### POST /projects (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["code → must match /^[A-Za-z0-9][A-Za-z0-9._-]*$/", "code → = longer than or equal to 1 characters", "code → = a string", "name → = longer than or equal to 1 characters", "name → = a string", "description → = longer than or equal to 1 characters", "description → = a string"]}

### POST /project-templates (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["name → = longer than or equal to 2 characters", "name → = a string", "description → = longer than or equal to 10 characters", "description → = a string", "difficulty → = one of the following values: beginner, intermediate, advanced", "each value in techStack → = shorter than or equal to 64 characters", "each value in techStack → = a string", "All techStack's elements → = unique", "techStack → must contain no more than 20 elements", "techStack → must contain at least 1 elements", "techStack → = an array", "each value in roles → must match /^[a-z][a-z0-9_]{1,31}$/ regular expression", "each value in roles → = a string", "All roles's elements → = unique"]}

### POST /sessions (admin)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["code → must match /^[A-Za-z0-9][A-Za-z0-9._-]*$/", "code → = longer than or equal to 1 characters", "code → = a string", "name → = longer than or equal to 1 characters", "name → = a string", "startDate → = a valid ISO 8601 date string", "endDate → = a valid ISO 8601 date string"]}

### POST /sessions/{id}/milestones
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["title → = longer than or equal to 1 characters", "title → = a string"]}

### POST /sessions/{id}/members
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["each value in userIds → = a UUID", "userIds → must contain no more than 200 elements", "userIds → must contain at least 1 elements", "userIds → = an array"]}

### POST /sprints (instructor)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["code → = longer than or equal to 1 characters", "code should not be empty", "code → = a string", "name → = longer than or equal to 1 characters", "name should not be empty", "name → = a string", "projectId → = a UUID", "startDate → = a valid ISO 8601 date string", "endDate → = a valid ISO 8601 date string"]}

### POST /tasks (instructor)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["title → = longer than or equal to 1 characters", "title should not be empty", "title → = a string", "projectId → = a UUID"]}

### POST /evaluations (instructor)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["cycleId → = a UUID", "internId → = a UUID"]}

### POST /reports (instructor)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["requestId → = a UUID", "title → = shorter than or equal to 256 characters", "title → = a string", "kind → = one of the following values: progress, performance, evaluation, review, risk", "projectId → = a UUID"]}

### POST /ai-generations/sprint-plan/draft (instructor)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["projectId → = a UUID", "sessionId → = a UUID"]}

### POST /ai-generations/plans/generate (instructor)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["projectId → = a UUID", "sessionId → = a UUID"]}

### POST /recruitment-rounds/{id}/slots
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["roleCode → = longer than or equal to 1 characters", "roleCode → = a string", "startsAt → = a valid ISO 8601 date string", "endsAt → = a valid ISO 8601 date string", "timezone → = longer than or equal to 1 characters", "timezone → = a string", "capacity → must not be greater than 100", "capacity → must not be less than 1", "capacity → = an integer number"]}

### POST /recruitment-rounds/{id}/applications/{aid}/reschedule
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["slotId → = a UUID"]}

### POST /recruitment-rounds/{id}/applications/{aid}/retake
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["reason → = longer than or equal to 10 characters", "reason → = a string", "slotId → = a UUID"]}

### POST /recruitment/me/interviews (intern)
{"code": null, "msg": "", "fields": []}

### PATCH /recruitment/me/role (intern)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["role → must match /^[a-z][a-z0-9_]{1,31}$/ regular expression", "role → = a string"]}

### POST /github/repository-account
{"code": "GITHUB_RECONNECT_REQUIRED", "msg": "Cần kết nối lại tài khoản GitHub.", "fields": []}

### PUT /admin/ai-configuration
{"code": "BAD_REQUEST", "msg": "Model must be a Gemini model ID; timeout 10000–180000ms, retries 0–3, version >=", "fields": []}

### PATCH /settings
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["Key → = 1-128 chars: a-z, 0-9, dot, dash, underscore.", "key → = a string", "value → = shorter than or equal to 100000 characters", "value → = a string"]}

### POST /admin/system/contracts/validate
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["data → = shorter than or equal to 400000 characters", "data → = longer than or equal to 1 characters", "data → = a string"]}

### GET /admin/communications (with params)
{"code": "VALIDATION_ERROR", "msg": "Validation failed.", "fields": ["property pageSize should not exist"]}

