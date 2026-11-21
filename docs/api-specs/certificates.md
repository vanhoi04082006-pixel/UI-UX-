# API GROUP: certificates (6 ops)

## GET /api/v1/certificates
operationId: CertificatesController_list_v1  |  summary: Certificate list (certificates.view; filters userId/status + pagination)
Responses: 200: no-content

## POST /api/v1/certificates/issue
operationId: CertificatesController_issue_v1  |  summary: Issue a certificate (admin): deterministic V-INTERN-COMPLETE v1 eligibility (recruitment passed + completed assignment + finalized evaluation >= 70 + finalized KPI >= 70); ineligible → 409 CERTIFICATE_NOT_ELIGIBLE with structured reasons; duplicate → 409; number from the SEQUENCE (spec 42/46/49)
Body (application/json): IssueCertificateDto = {userId*:string}
Responses: 201: no-content

## GET /api/v1/certificates/verify/{code}
operationId: CertificatesController_verify_v1  |  summary: PUBLIC verification (no auth, spec 47/48): issued → { valid: true, certificateNumber, holderName, role, projectName, issuedAt }; revoked → { valid: false, status: revoked, revokedAt }; unknown code → 404. NEVER exposes email/userId/evaluation/KPI internals
Params: code in:path required string
Responses: 200: no-content

## GET /api/v1/certificates/{id}
operationId: CertificatesController_getOne_v1  |  summary: One certificate (certificates.view)
Params: id in:path required string
Responses: 200: no-content

## GET /api/v1/certificates/{id}/pdf
operationId: CertificatesController_pdfAdmin_v1  |  summary: REAL server-side PDF (spec 51-53): deterministic pdfkit document (Vietnamese-safe DejaVu), certificate number + verification code + verify URL; ISSUED certificates only — revoked → 409 (verify endpoint communicates revocation)
Params: id in:path required string
Responses: 200: no-content

## POST /api/v1/certificates/{id}/revoke
operationId: CertificatesController_revoke_v1  |  summary: REVOKE (admin, spec 50): requires a reason, preserves the record with revoke metadata, notifies the intern, writes audit + activity; second revoke → 409 CERTIFICATE_ALREADY_REVOKED
Params: id in:path required string
Body (application/json): RevokeCertificateDto = {reason*:string}
Responses: 201: no-content
