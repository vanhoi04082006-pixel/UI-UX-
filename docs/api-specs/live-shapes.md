# LIVE API SHAPES — probed from QA backend

Base: https://trance-bull-changelog-observe.trycloudflare.com/api/v1
Notes: `__status` = HTTP error code. Shapes trimmed for readability.

## [admin] GET /recruitment-rounds
```json
{
 "items": [
  {
   "id": "4A44A5B1-8113-403D-8A09-FD923556BECE",
   "name": "Đợt tuyển QA probe portal",
   "status": "open",
   "opensAt": "2026-11-01T00:00:00.000Z",
   "closesAt": "2026-12-31T23:59:59.000Z",
   "ownerId": "19D5A12E-E2D9-4DD4-8EE6-BEDF28CEE293"
  },
  "...(1 items)"
 ]
}
```

## [admin] GET /admin/knowledge
```json
{
 "items": [
  {
   "id": "a321bd6e-bf72-4134-af81-c7e6775a6f97",
   "code": "qa-buttons-20261116",
   "version": 4,
   "status": "archived",
   "updatedAt": "2026-11-16T20:55:48.960Z",
   "sha256": "a55a71b317b59ddbc2bb8ecc5234bf4387b55a1353e9fd4a1b48d4a654ad4900",
   "title": "Tài liệu kiểm thử nút QA",
   "summary": "Tài liệu tổng hợp để nghiệm thu trình soạn, nguồn tham khảo và vòng đời phiên bản.",
   "kind": "guide",
   "language": "vi",
   "difficulty": null,
   "audience": "student_safe",
   "purposes": [
    "mentoring",
    "...(1 items)"
   ],
   "roleCodes": [],
   "tags": []
  },
  "...(2 items)"
 ],
 "total": 19,
 "page": 1,
 "pageSize": 2
}
```

## [admin] GET /admin/career-roles
```json
{
 "items": [
  {
   "code": "backend",
   "name": "Backend Developer",
   "description": "",
   "level": "intern",
   "language": "vi",
   "requiredSkills": [],
   "optionalSkills": [],
   "competencyWeights": {},
   "status": "published",
   "acceptingApplications": true,
   "version": 1,
   "createdAt": "2026-11-16T03:59:09.052Z",
   "updatedAt": "2026-11-16T03:59:09.052Z"
  },
  "...(2 items)"
 ],
 "total": 7,
 "page": 1,
 "pageSize": 2
}
```

## [admin] GET /catalogs/types
```json
{
 "data": [
  {
   "id": "3D2F05E9-3BE7-4580-9BE5-C314DBF57868",
   "code": "qa_buttons_20261116",
   "name": "Danh mục kiểm thử nút",
   "description": "Dữ liệu nghiệm thu danh mục trong DB QA riêng.",
   "createdAt": "2026-11-16T13:39:27.707Z",
   "updatedAt": "2026-11-16T13:39:27.707Z"
  },
  "...(1 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 20,
  "total": 1,
  "totalPages": 1
 }
}
```

## [admin] GET /catalogs/items
```json
{
 "data": [],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 0,
  "totalPages": 0
 }
}
```

## [admin] GET /evaluation-cycles
```json
{
 "items": [
  {
   "id": "303AF090-447D-4C6F-8479-4EFF7E8D3B6E",
   "code": "QA-EVAL-20261117",
   "name": "Kỳ đánh giá nghiệm thu QA cập nhật",
   "sessionId": "CDA84CB2-0DE5-4C88-A6AF-A2D124EBF3FC",
   "projectId": "B9C80820-DE24-4AD5-ABCF-EC842A07B72E",
   "type": "sprint",
   "status": "closed",
   "startDate": "2026-11-17T02:00:00.000Z",
   "endDate": "2026-11-22T03:00:00.000Z",
   "dueDate": null,
   "createdById": "D419132F-4991-4D2E-84AE-E1423C8005A0",
   "createdAt": "2026-11-17T01:35:59.628Z",
   "updatedAt": "2026-11-17T09:04:50.356Z"
  },
  "...(1 items)"
 ],
 "total": 1
}
```

## [admin] GET /kpi-periods
```json
{
 "items": [
  {
   "id": "F87BB92B-681C-4204-9B25-FA46D698BCBB",
   "code": "QA-KPI-20261117",
   "name": "Kỳ KPI QA đã chỉnh tên 20261117",
   "startDate": "2026-11-16T00:00:00.000Z",
   "endDate": "2026-11-23T00:00:00.000Z",
   "status": "finalized",
   "ruleVersion": "kpi-v1",
   "createdById": "D3052068-A7DF-4824-A932-C694E30001EC",
   "createdAt": "2026-11-17T08:33:33.093Z",
   "updatedAt": "2026-11-17T15:34:52.620Z"
  },
  "...(2 items)"
 ],
 "total": 2
}
```

## [admin] GET /virtual-salary
```json
{
 "items": [
  {
   "id": "51F0524B-F510-4155-9443-2691B7A10206",
   "userId": "286BCEBF-13CB-47AC-AB49-FC64A62E748F",
   "kpiPeriodId": null,
   "type": "adjustment",
   "amount": -2000,
   "unit": "VND_VIRTUAL",
   "sourceType": "manual_adjustment",
   "sourceId": null,
   "description": "QA tổng hợp: kiểm điều chỉnh mang dấu âm2000 và tổng sổ. Không phải tiền thật.",
   "createdById": "D3052068-A7DF-4824-A932-C694E30001EC",
   "idempotencyKey": "adjustment:req:74c5f1d9-0726-41d1-a3a7-0101c3f363d9",
   "metadataJson": "{\"reason\":\"QA tổng hợp: kiểm điều chỉnh mang dấu âm2000 và tổng sổ. Không phải tiền thật.\"...",
   "createdAt": "2026-11-17T12:42:58.922Z"
  },
  "...(2 items)"
 ],
 "total": 5
}
```

## [admin] GET /admin/communications
```json
{
 "__status": 400,
 "code": "VALIDATION_ERROR",
 "message": "Validation failed."
}
```

## [admin] GET /admin/system/status
```json
{
 "checkedAt": "2026-11-21T14:04:52.329Z",
 "database": {
  "status": "reachable",
  "latencyMs": 4
 },
 "counts": {
  "users": 10,
  "activeSessions": 0,
  "activeQuestions": 185,
  "activeTemplates": 12,
  "migrations": 47,
  "runningReviews": 0
 },
 "aiLast24Hours": [
  {
   "feature": "agent.business.decision",
   "status": "failed",
   "count": 2,
   "averageLatencyMs": 2551
  },
  "...(1 items)"
 ],
 "learningAlerts": {
  "enabled": true,
  "intervalSeconds": 60,
  "running": false,
  "lastScanAt": "2026-11-21T14:04:32.098Z",
  "lastResult": {
   "created": 0,
   "muted": 0,
   "processed": 0,
   "busy": false
  },
  "lastErrorCode": null
 },
 "integrations": {
  "github": {
   "configured": true,
   "missing": []
  },
  "webhook": {
   "configured": false
  },
  "runner": {
   "configured": true,
   "missing": [],
   "sealedSuites": 9,
   "suiteConfigValid": true,
   "connectivity": "not_probed"
  }
 }
}
```

## [admin] GET /admin/system/repositories
```json
{
 "items": [
  {
   "sessionId": "CDA84CB2-0DE5-4C88-A6AF-A2D124EBF3FC",
   "sessionName": "Phiên kiểm thử toàn luồng 20261116",
   "sessionCode": "MINI-NOTES-V1-S1",
   "instructorName": "Giảng viên QA",
   "ownerLogin": "ci-d419132f49914d2e",
   "repoName": "ci-submission-cda84cb2",
   "status": "ready",
   "webhookStatus": "not_configured",
   "webhookErrorCode": null,
   "lastEventAt": null
  },
  "...(1 items)"
 ],
 "total": 1,
 "page": 1,
 "pageSize": 20
}
```

## [admin] GET /admin/system/contracts
```json
{
 "checkedAt": "2026-11-21T14:04:53.316Z",
 "source": "GRADING_SUITES_JSON (operator-sealed; immutable per contract version)",
 "valid": true,
 "error": null,
 "contracts": [
  {
   "key": "LEARN-NOTES-V1:b2d1f16a-d64e-48ba-853e-82bf28854ff4",
   "suiteId": "qa-notes-foundation-840404b2-v1",
   "digest": "a55845241f5317b9eb23ebe8aeb0cedcf08d47e1fdea6bc6d0f6c5021550856d",
   "status": "active",
   "issues": [],
   "operator": {
    "version": "v1.0.0",
    "reviewer": "vintern operator audit 2026-10-17",
    "sealedAt": "2026-10-17T10:33:25.571Z",
    "images": {
     "runtime": "sha256:3bbac01aa406e28c545b0390f56ec87461a285d2bf516dcffec4541558c053c9",
     "tester": "sha256:3b13ce66cd235ae41b5d0010ba1566a7ba8ac228a773f8a4e276d3e30a804b6e"
    },
    "complete": true
   }
  },
  "...(9 items)"
 ]
}
```

## [admin] GET /admin/ai-configuration
```json
{
 "policy": {
  "model": "gemini-3.1-flash-lite",
  "timeoutMs": 120000,
  "maxRetries": 1,
  "version": 1
 },
 "source": "database",
 "provider": "gemini",
 "credentialsConfigured": true,
 "appliesTo": [
  "interviewer",
  "...(7 items)"
 ]
}
```

## [admin] GET /settings
```json
{
 "settings": [
  {
   "key": "ai.runtime",
   "value": "{\"model\":\"gemini-3.1-flash-lite\",\"timeoutMs\":120000,\"maxRetries\":1,\"version\":1}",
   "description": "Cấu hình model và giới hạn lời gọi AI; không chứa secret.",
   "updatedAt": "2026-11-16T14:01:58.911Z"
  },
  "...(2 items)"
 ]
}
```

## [admin] GET /audit-logs
```json
{
 "data": [
  {
   "id": "273F0585-6AE4-4F63-8F3B-3380AB96FD19",
   "actorId": "E43D9925-1B13-4B81-9ADF-FD967704FF50",
   "action": "auth.login",
   "targetType": "user",
   "targetId": "E43D9925-1B13-4B81-9ADF-FD967704FF50",
   "detail": null,
   "ip": "47.57.232.232",
   "userAgent": "Python-urllib/3.12",
   "createdAt": "2026-11-21T14:04:47.495Z"
  },
  "...(2 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 416,
  "totalPages": 208
 }
}
```

## [admin] GET /activity-events
```json
{
 "data": [
  {
   "id": "E23B6BE5-4EE7-4AED-B990-97E9EBD521A0",
   "actorId": "D3052068-A7DF-4824-A932-C694E30001EC",
   "module": "certificate",
   "action": "issued",
   "targetType": "certificate",
   "targetId": "DB692EBA-ECEF-4030-A405-C878A7ED7F7D",
   "summary": "Chứng nhận hoàn thành đã được cấp",
   "createdAt": "2026-11-17T13:00:25.723Z"
  },
  "...(2 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 27,
  "totalPages": 14
 }
}
```

## [admin] GET /groups
```json
{
 "data": [
  {
   "id": "C62C63E9-0D82-4C3D-A680-51A4116D58D5",
   "code": "qa-buttons-20261116",
   "name": "Nhóm kiểm thử thao tác cập nhật",
   "description": "Nhóm tổng hợp kiểm thử quyền và thành viên trong DB QA riêng.",
   "createdAt": "2026-11-16T04:53:35.103Z",
   "updatedAt": "2026-11-16T14:36:54.470Z"
  },
  "...(1 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 1,
  "totalPages": 1
 }
}
```

## [admin] GET /roles
```json
{
 "data": [
  {
   "id": "28ADB0DB-E23F-4FB1-923A-816F2F9B5AD4",
   "code": "admin",
   "name": "Quản trị viên",
   "description": "Toàn quyền hệ thống",
   "isSystem": true,
   "createdAt": "2026-11-16T03:59:10.957Z",
   "updatedAt": "2026-11-16T03:59:10.957Z"
  },
  "...(3 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 20,
  "total": 3,
  "totalPages": 1
 }
}
```

## [admin] GET /permissions
```json
{
 "data": [
  {
   "id": "0018D025-6DBA-4935-9FFF-8C827469DB07",
   "code": "activity.read",
   "name": "Xem hoạt động",
   "description": "Feed hoạt động hệ thống",
   "createdAt": "2026-11-16T03:59:11.176Z"
  },
  "...(20 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 20,
  "total": 60,
  "totalPages": 3
 }
}
```

## [admin] GET /projects
```json
{
 "data": [
  {
   "id": "89fbad8a-abaf-4a89-8241-27cbd9f56fe9",
   "code": "MINI-NOTES-V1-P2",
   "name": "Sổ ghi chú học tập",
   "description": "Module quản lý ghi chú plain text: tạo, tìm kiếm và xóa trên dữ liệu giả; tập trung valida...",
   "domainCategory": "mini-projects",
   "difficulty": "beginner",
   "status": "active",
   "mentorId": "d419132f-4991-4d2e-84ae-e1423c8005a0",
   "capacity": null,
   "startDate": "2026-11-17T00:00:00.000Z",
   "endDate": "2026-11-22T00:00:00.000Z",
   "archivedAt": null,
   "createdAt": "2026-11-17T08:07:44.650Z",
   "updatedAt": "2026-11-17T08:07:44.650Z",
   "technologies": [
    "JavaScript",
    "...(3 items)"
   ]
  },
  "...(2 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 2,
  "totalPages": 1
 }
}
```

## [admin] GET /project-templates
```json
{
 "data": [
  {
   "id": "e0086cb4-4c2f-47a5-844c-2e30deff9d40",
   "code": "MINI-BLOG-V1",
   "name": "Bản nháp và xuất bản bài viết",
   "category": "mini-projects",
   "difficulty": "beginner",
   "status": "active",
   "version": 2,
   "techStack": [
    "JavaScript",
    "...(3 items)"
   ],
   "roles": [
    "backend",
    "...(1 items)"
   ],
   "teamSize": 1,
   "sprintCount": 1,
   "createdAt": "2026-11-16T03:59:18.712Z"
  },
  "...(2 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 12,
  "totalPages": 6
 }
}
```

## [admin] GET /imported-reviews
```json
{
 "items": []
}
```

## [admin] GET /certificates
```json
{
 "items": [
  {
   "id": "DB692EBA-ECEF-4030-A405-C878A7ED7F7D",
   "certificateNumber": "VINT-2026-00000001",
   "verificationCode": "gIdL3VOo91KAHSazh0cXKD5--aUfssgE",
   "userId": "286BCEBF-13CB-47AC-AB49-FC64A62E748F",
   "projectId": "B9C80820-DE24-4AD5-ABCF-EC842A07B72E",
   "sessionId": "CDA84CB2-0DE5-4C88-A6AF-A2D124EBF3FC",
   "assignmentId": "FA66C4AD-AB56-4E36-9A7F-4457B8C02589",
   "evaluationId": "B2545841-2EB4-4E9C-92DF-164AFA93F111",
   "kpiResultId": "CC1EDDC7-36B5-4DEC-B436-FAAD00DA390C",
   "policyCode": "V-INTERN-COMPLETE",
   "policyVersion": 1,
   "status": "issued",
   "issuedAt": "2026-11-17T13:00:25.592Z",
   "completedAt": "2026-11-17T07:54:27.135Z",
   "holderNameSnapshot": "Chờ phân công QA cập nhật",
   "roleLabelSnapshot": "Backend Developer",
   "projectNameSnapshot": "Sổ ghi chú học tập",
   "sessionNameSnapshot": "Phiên kiểm thử toàn luồng 20261116",
   "issuedById": "D3052068-A7DF-4824-A932-C694E30001EC",
   "revokedAt": null
  },
  "...(1 items)"
 ],
 "total": 1
}
```

## [admin] GET /users
```json
{
 "data": [
  {
   "id": "E43D9925-1B13-4B81-9ADF-FD967704FF50",
   "email": "qa.intern@vintern.test",
   "username": "qa-intern",
   "displayName": "QA Thực tập sinh",
   "status": "active",
   "lastLoginAt": "2026-11-21T14:04:47.475Z",
   "createdAt": "2026-11-21T10:45:04.979Z",
   "updatedAt": "2026-11-21T21:04:47.480Z"
  },
  "...(2 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 10,
  "totalPages": 5
 }
}
```

## [admin] GET /admin/agents/business-runs
```json
{
 "definitions": [
  {
   "id": "cv-analyst",
   "version": "1",
   "promptVersion": "business-cv-analyst-v1",
   "features": [
    "cv-analysis",
    "...(1 items)"
   ],
   "tools": [
    "context_bundle",
    "...(1 items)"
   ],
   "budget": {
    "maxSteps": 8,
    "maxTokens": 1000000,
    "maxToolCalls": 2,
    "maxDurationMs": 180000
   }
  },
  "...(11 items)"
 ],
 "items": [
  {
   "id": "F6AAD7E7-E024-421A-A57C-5C06ED929D23",
   "agentId": "interview-conversation",
   "agentVersion": "1",
   "promptVersion": "business-interview-conversation-v1",
   "policyVersion": "business-agent-v1",
   "status": "failed",
   "stepCount": 1,
   "attempts": 1,
   "inputTokens": null,
   "outputTokens": null,
   "errorCode": "AI_PROVIDER_UNAVAILABLE",
   "retryable": true,
   "createdAt": "2026-11-21T11:25:05.013Z",
   "updatedAt": "2026-11-21T11:25:08.562Z",
   "model": null,
   "toolCalls": 0
  },
  "...(2 items)"
 ],
 "total": 50,
 "page": 1,
 "pageSize": 2
}
```

## [admin] GET /dashboard/catalogs
```json
{
 "types": [
  {
   "id": "3D2F05E9-3BE7-4580-9BE5-C314DBF57868",
   "code": "qa_buttons_20261116",
   "name": "Danh mục kiểm thử nút",
   "itemCount": 1,
   "activeCount": 0
  },
  "...(1 items)"
 ],
 "generatedAt": "2026-11-21T14:05:00.426Z"
}
```

## [admin] GET /dashboard/access
```json
{
 "roles": [
  {
   "id": "28ADB0DB-E23F-4FB1-923A-816F2F9B5AD4",
   "code": "admin",
   "name": "Quản trị viên",
   "permissionCount": 59,
   "userCount": 2
  },
  "...(3 items)"
 ],
 "grants": [
  {
   "roleId": "28ADB0DB-E23F-4FB1-923A-816F2F9B5AD4",
   "code": "activity.read",
   "name": "Xem hoạt động"
  },
  "...(95 items)"
 ],
 "groups": [
  {
   "id": "C62C63E9-0D82-4C3D-A680-51A4116D58D5",
   "name": "Nhóm kiểm thử thao tác cập nhật",
   "code": "qa-buttons-20261116",
   "roleIds": null,
   "memberCount": 0,
   "roleCount": 0
  },
  "...(1 items)"
 ],
 "activity": [
  {
   "id": "137B2901-A0F5-4732-AB49-CB7EFCE1A858",
   "summary": "Thêm 1 thành viên vào nhóm",
   "action": "group.members_added",
   "createdAt": "2026-11-16T07:37:03.553Z",
   "displayName": "Quản trị QA"
  },
  "...(2 items)"
 ]
}
```

## [admin] GET /dashboard/user-roles
```json
{
 "__status": 400,
 "code": "VALIDATION_ERROR",
 "message": "Validation failed."
}
```

## [admin] GET /dashboard/admin
```json
{
 "metrics": {
  "userCount": 10,
  "instructorCount": 2,
  "internCount": 6,
  "activeSessions": 0,
  "aiRunsToday": 2
 },
 "users": [
  {
   "id": "E43D9925-1B13-4B81-9ADF-FD967704FF50",
   "displayName": "QA Thực tập sinh",
   "email": "qa.intern@vintern.test",
   "status": "active",
   "lastLoginAt": "2026-11-21T14:04:47.475Z"
  },
  "...(5 items)"
 ],
 "roles": [
  {
   "id": "28ADB0DB-E23F-4FB1-923A-816F2F9B5AD4",
   "code": "admin",
   "name": "Quản trị viên",
   "permissionCount": 59
  },
  "...(3 items)"
 ],
 "activity": [
  {
   "id": "E23B6BE5-4EE7-4AED-B990-97E9EBD521A0",
   "summary": "Chứng nhận hoàn thành đã được cấp",
   "action": "issued",
   "createdAt": "2026-11-17T13:00:25.723Z",
   "displayName": "Quản trị QA"
  },
  "...(6 items)"
 ],
 "statuses": [
  {
   "status": "active",
   "count": 10
  },
  "...(1 items)"
 ],
 "generatedAt": "2026-11-21T14:05:01.878Z"
}
```

## [admin] GET /sessions
```json
{
 "data": [
  {
   "id": "D7070451-E70F-4027-9BEE-A0555398F256",
   "code": "MINI-NOTES-V1-S2",
   "name": "Phiên QA kiểm tra hủy 20261117",
   "description": "Module quản lý ghi chú plain text: tạo, tìm kiếm và xóa trên dữ liệu giả; tập trung valida...",
   "status": "cancelled",
   "leadInstructorId": "D419132F-4991-4D2E-84AE-E1423C8005A0",
   "startDate": "2026-11-17T00:00:00.000Z",
   "endDate": "2026-11-22T00:00:00.000Z",
   "createdAt": "2026-11-17T08:07:44.607Z",
   "updatedAt": "2026-11-17T15:09:07.013Z"
  },
  "...(2 items)"
 ],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 2,
  "totalPages": 1
 }
}
```

## [admin] GET /reference-screens
```json
{
 "source": "user-approved-image-samples",
 "items": []
}
```

## [instructor] GET /dashboard/instructor
```json
{
 "metrics": {
  "sessionCount": 0,
  "activeSessions": 0,
  "internCount": 0,
  "taskCount": 0,
  "todoCount": 0,
  "doingCount": 0,
  "doneCount": 0,
  "reviewCount": 0,
  "overdueCount": 0,
  "averageScore": null
 },
 "sessions": [],
 "students": [],
 "activity": [],
 "sprints": [],
 "reviews": [],
 "generatedAt": "2026-11-21T14:05:04.104Z"
}
```

## [instructor] GET /sessions/overview
```json
{
 "data": [],
 "meta": {
  "page": 1,
  "pageSize": 20,
  "total": 0,
  "totalPages": 0
 }
}
```

## [instructor] GET /evaluations
```json
{
 "items": [],
 "total": 0
}
```

## [instructor] GET /assignments
```json
{
 "data": [],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 0,
  "totalPages": 0
 }
}
```

## [instructor] GET /performance/interns
```json
{
 "items": [],
 "total": 0,
 "page": 1,
 "pageSize": 2,
 "ranking": "completion-rate, finalized-evaluation, overdue-count, workload, stable-id"
}
```

## [instructor] GET /sprints
```json
{
 "data": [],
 "meta": {
  "page": 1,
  "pageSize": 3,
  "total": 0,
  "totalPages": 0
 }
}
```

## [instructor] GET /tasks
```json
{
 "data": [],
 "meta": {
  "page": 1,
  "pageSize": 2,
  "total": 0,
  "totalPages": 0
 }
}
```

## [instructor] GET /reports
```json
{
 "__status": 400,
 "code": "VALIDATION_ERROR",
 "message": "Validation failed."
}
```

## [instructor] GET /projects/{id}/sessions (sample)
```json
{
 "data": [],
 "meta": {
  "page": 1,
  "pageSize": 1,
  "total": 0,
  "totalPages": 0
 }
}
```

## [intern] GET /github/me
```json
{
 "configured": true,
 "connected": false,
 "login": null,
 "githubUserId": null,
 "canCreatePublicRepo": false,
 "reconnectRequired": false
}
```

## [intern] GET /recruitment/me
```json
{
 "status": "interview_in_progress",
 "selectedRole": "backend",
 "selectedRoleLabel": "Backend Developer",
 "attemptNumber": 1,
 "attemptsRemaining": 2,
 "nextEligibleAt": null,
 "currentInterviewSessionId": "133896D2-24EA-4C23-A52D-4ACAEB32485D",
 "recruitedAt": null,
 "result": null,
 "interviewSchedule": null
}
```

## [intern] GET /recruitment/me/interviews
```json
{
 "items": [
  {
   "id": "133896D2-24EA-4C23-A52D-4ACAEB32485D",
   "roleCode": "backend",
   "status": "expired",
   "attemptNumber": 1,
   "startedAt": "2026-11-21T11:24:42.467Z",
   "submittedAt": null,
   "evaluatedAt": null,
   "questionCount": 10,
   "result": null
  },
  "...(1 items)"
 ],
 "total": 1
}
```

## [intern] GET /recruitment/me/result
```json
{
 "__status": 404,
 "code": "RECRUITMENT_RESULT_NOT_FOUND",
 "message": "No recruitment result exists yet."
}
```

## [intern] GET /intern/me/ai-recommendations
```json
{
 "__status": 404,
 "code": "AI_RECOMMENDATION_NOT_AVAILABLE",
 "message": "No AI recommendations have been generated yet. Use the refresh endpoint first."
}
```

## [intern] GET /intern/me/performance
```json
{
 "userId": "E43D9925-1B13-4B81-9ADF-FD967704FF50",
 "period": {
  "from": null,
  "to": null,
  "boundary": "[from, to) — task.createdAt defines period membership (documented)"
 },
 "metrics": {
  "totalTaskCount": 0,
  "completedTaskCount": 0,
  "taskCompletionRate": null,
  "committedStoryPoints": 0,
  "completedStoryPoints": 0,
  "storyPointCompletionRate": null,
  "onTimeCompletionRate": null,
  "onTimeCompletedTaskCount": 0,
  "dueDatedCompletedTaskCount": 0,
  "overdueOpenTaskCount": 0,
  "averageEvaluationScore": null,
  "finalizedEvaluationCount": 0,
  "activeSprintProgress": null
 }
}
```

## [intern] GET /participation/me
```json
{
 "items": [],
 "summary": {
  "total": 0,
  "active": 0,
  "registeredPenalty": 0
 },
 "page": 1,
 "pageSize": 20
}
```

## [intern] GET /intern/me/workspace
```json
{
 "status": "recruitment_in_progress",
 "hasAssignmentHistory": false,
 "assignment": null,
 "recruitment": {
  "status": "interview_in_progress",
  "selectedRole": "backend",
  "attemptCount": 1,
  "recruitedAt": null
 },
 "currentSprint": null,
 "taskSummary": {
  "todo": 0,
  "doing": 0,
  "review": 0,
  "done": 0,
  "total": 0
 },
 "focusedTask": null
}
```

## [intern] GET /intern/me/sprints
```json
{
 "__status": 404,
 "code": "ASSIGNMENT_NOT_ACTIVE",
 "message": "No active assignment."
}
```

## [intern] GET /intern/me/kpi
```json
{
 "items": []
}
```

## [intern] GET /intern/me/certificates
```json
{
 "items": []
}
```

## [intern] GET /github/me/repository-access
```json
{
 "items": [],
 "summary": [],
 "limit": 50
}
```

## [intern] GET /notifications/unread-count
```json
{
 "count": 0
}
```

## [intern] GET /notifications/preferences
```json
{
 "preferences": [
  {
   "category": "system",
   "enabled": true
  },
  "...(9 items)"
 ]
}
```

