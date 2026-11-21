# API GROUP: RecruitmentRounds (16 ops)

## GET /api/v1/recruitment-rounds
operationId: RecruitmentRoundsController_list_v1  |  summary: -
Responses: 200: no-content

## POST /api/v1/recruitment-rounds
operationId: RecruitmentRoundsController_create_v1  |  summary: -
Body (application/json): CreateRoundDto = {}
Responses: 201: no-content

## GET /api/v1/recruitment-rounds/{id}
operationId: RecruitmentRoundsController_detail_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/recruitment-rounds/{id}/applications
operationId: RecruitmentRoundsController_applications_v1  |  summary: -
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/recruitment-rounds/{id}/applications/{applicationId}
operationId: RecruitmentRoundsController_application_v1  |  summary: -
Params: id in:path required string | applicationId in:path required string
Responses: 200: no-content

## POST /api/v1/recruitment-rounds/{id}/applications/{applicationId}/cancel
operationId: RecruitmentRoundsController_cancel_v1  |  summary: -
Params: id in:path required string | applicationId in:path required string
Responses: 201: no-content

## GET /api/v1/recruitment-rounds/{id}/applications/{applicationId}/credential-recovery
operationId: RecruitmentRoundsController_recoveryPreview_v1  |  summary: -
Params: id in:path required string | applicationId in:path required string
Responses: 200: no-content

## GET /api/v1/recruitment-rounds/{id}/applications/{applicationId}/cv
operationId: RecruitmentRoundsController_cv_v1  |  summary: -
Params: id in:path required string | applicationId in:path required string
Responses: 200: no-content

## POST /api/v1/recruitment-rounds/{id}/applications/{applicationId}/recover-credentials
operationId: RecruitmentRoundsController_recoverCredentials_v1  |  summary: -
Params: id in:path required string | applicationId in:path required string
Body (application/json): CredentialRecoveryDto = {}
Responses: 201: no-content

## POST /api/v1/recruitment-rounds/{id}/applications/{applicationId}/reschedule
operationId: RecruitmentRoundsController_reschedule_v1  |  summary: -
Params: id in:path required string | applicationId in:path required string
Body (application/json): RescheduleDto = {}
Responses: 201: no-content

## POST /api/v1/recruitment-rounds/{id}/applications/{applicationId}/resend-credentials
operationId: RecruitmentRoundsController_resendCredentials_v1  |  summary: -
Params: id in:path required string | applicationId in:path required string
Body (application/json): ResendCredentialsDto = {}
Responses: 201: no-content

## POST /api/v1/recruitment-rounds/{id}/applications/{applicationId}/retake
operationId: RecruitmentRoundsController_retake_v1  |  summary: -
Params: id in:path required string | applicationId in:path required string
Body (application/json): RetakeBookingDto = {}
Responses: 201: no-content

## POST /api/v1/recruitment-rounds/{id}/applications/{applicationId}/retry
operationId: RecruitmentRoundsController_retry_v1  |  summary: -
Params: id in:path required string | applicationId in:path required string
Responses: 201: no-content

## POST /api/v1/recruitment-rounds/{id}/slots
operationId: RecruitmentRoundsController_slot_v1  |  summary: -
Params: id in:path required string
Body (application/json): CreateSlotDto = {}
Responses: 201: no-content

## POST /api/v1/recruitment-rounds/{id}/slots/{slotId}/close
operationId: RecruitmentRoundsController_closeSlot_v1  |  summary: -
Params: id in:path required string | slotId in:path required string
Responses: 201: no-content

## POST /api/v1/recruitment-rounds/{id}/status
operationId: RecruitmentRoundsController_status_v1  |  summary: -
Params: id in:path required string
Body (application/json): RoundStatusDto = {}
Responses: 201: no-content
