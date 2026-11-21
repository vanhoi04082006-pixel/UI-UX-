## ResendMail
{}

## ApplyDto
{}

## AccessRequestDto
{}

## VerifyApplicationDto
{}

## CreateRoundDto
{}

## RoundStatusDto
{}

## CreateSlotDto
{}

## RescheduleDto
{}

## ResendCredentialsDto
{}

## CredentialRecoveryDto
{}

## RetakeBookingDto
{}

## Object
{}

## KnowledgeSourceDto
{title*:string, url:string, reference:string}

## KnowledgeDraftDto
{kind*:string enum:['qa', 'guide', 'exercise', 'solution', 'rubric', 'plan_template', 'communication'], title*:string, summary*:string, language*:string enum:['vi', 'en'], difficulty*:string enum:['easy', 'medium', 'hard'], audience*:string enum:['student_safe', 'staff_only', 'grading_only'], purposes*:array<string>, roleCodes*:array<string>, tags*:array<string>, sources*:array<KnowledgeSourceDto>, body*:object}

## CreateKnowledgeDto
{code*:string, draft*:KnowledgeDraftDto}

## UpdateKnowledgeDto
{version*:number, draft*:KnowledgeDraftDto}

## KnowledgeImportDryRunDto
{entries*:array<object>}

## KnowledgeVersionDto
{version*:number}

## RestoreKnowledgeDto
{version*:number, sourceVersion*:number}

## CreateCareerRoleDto
{}

## UpdateCareerRoleDto
{}

## CareerRoleVersionDto
{}

## SelectRoleDto
{role*:string}

## SaveAnswerDto
{answerText*:string}

## QuestionContentDto
{}

## UpdateQuestionDto
{}

## ContractDraftDto
{}

## SetPreferenceDto
{category*:string enum:['system', 'task', 'session', 'evaluation', 'announcement', 'recruitment', 'kpi', 'salary', 'certificate'], enabled*:boolean}

## RegisterDto
{}

## LoginDto
{email*:string, password*:string}

## ChangePasswordDto
{}

## CreateUserDto
{email*:string, username*:string, displayName*:string, password*:string, roleCodes:array<string>}

## UpdateUserDto
{displayName:string, username:string}

## SetUserStatusDto
{status*:string enum:['active', 'pending', 'locked', 'deleted']}

## CreateGroupDto
{code*:string, name*:string, description:string}

## UpdateGroupDto
{name:string, description:string}

## AddGroupMembersDto
{userIds*:array<string>}

## SetGroupRolesDto
{roleCodes*:array<string>}

## CreateCatalogTypeDto
{}

## CreateCatalogItemDto
{}

## UpdateCatalogItemDto
{}

## CreateKnowledgeAgentDto
{requestId*:string, question*:string, roleCode:string}

## UpdateSettingDto
{}

## CreateSessionDto
{code*:string, name*:string, description:string, status:string enum:['upcoming', 'active', 'ending', 'completed', 'cancelled'], leadInstructorId:string, startDate*:string, endDate*:string}

## UpdateSessionDto
{name:string, description:string, status:string enum:['upcoming', 'active', 'ending', 'completed', 'cancelled'], leadInstructorId:string, startDate:string, endDate:string}

## AddSessionMembersDto
{userIds*:array<string>}

## AddSessionInstructorsDto
{instructorIds*:array<string>}

## CreateMilestoneDto
{title*:string, description:string, dueDate:string, status:string enum:['pending', 'in_progress', 'completed'], sortOrder:number}

## UpdateMilestoneDto
{title:string, description:string, dueDate:string, status:string enum:['pending', 'in_progress', 'completed'], sortOrder:number}

## DraftSprintPlanDto
{projectId*:string, sessionId*:string, sprintCount:number, startDate:string}

## ConfirmSprintPlanDto
{projectId*:string, sessionId*:string, draft*:object, requestId*:string, planId:string}

## GeneratePlanDto
{regenerate:boolean, projectId*:string, sessionId*:string, sprintCount:number, startDate:string, requestId:string}

## CreateTemplateDto
{learningPackage:object, assessment:object}

## UpdateTemplateDto
{assessment:object}

## StartTemplateDto
{}

## ChangeRequestDto
{}

## CreateTaskDto
{title*:string, description:string, projectId*:string, sprintId:string, assigneeId:string, priority:string enum:['low', 'medium', 'high', 'critical'], storyPoints:number, dueDate:string}

## UpdateTaskDto
{expectedVersion:number, title:string, description:string, sprintId:string, assigneeId:object, priority:string enum:['low', 'medium', 'high', 'critical'], storyPoints:number, dueDate:string, status:string enum:['todo', 'doing', 'review', 'done'], reason:string}

## UpdateMyTaskDto
{expectedVersion:number, status:string enum:['todo', 'doing', 'review', 'done'], progress:number, reason:string}

## CreateTaskCommentDto
{content*:string}

## RepositoryAccessRetryDto
{}

## CreateProjectDto
{code*:string, name*:string, description*:string, domainCategory:string, difficulty:string enum:['beginner', 'intermediate', 'advanced'], status:string enum:['draft', 'active', 'completed', 'archived'], mentorId:string, capacity:number, startDate:string, endDate:string, technologies:array<string>}

## UpdateProjectDto
{name:string, description:string, domainCategory:string, difficulty:string enum:['beginner', 'intermediate', 'advanced'], status:string enum:['draft', 'active', 'completed', 'archived'], mentorId:string, capacity:number, startDate:string, endDate:string, technologies:array<string>}

## ProjectRoleSlotDto
{roleCode*:string, requiredCount*:number}

## SetProjectSlotsDto
{slots*:array<ProjectRoleSlotDto>}

## CreateAssignmentDto
{internId*:string, projectId*:string, sessionId*:string, role:string}

## CreateSprintDto
{code*:string, name*:string, description:string, projectId*:string, sessionId:string, goal:string, startDate*:string, endDate*:string}

## UpdateSprintDto
{name:string, description:string, goal:string, startDate:string, endDate:string}

## TransitionSprintDto
{status*:string enum:['planned', 'active', 'completed', 'cancelled'], allowOpenTasks:boolean}

## SubmitTaskDto
{}

## ReviewSubmissionDto
{}

## ParticipationPolicyDto
{}

## ParticipationResolveDto
{}

## ParticipationExtensionDto
{}

## ReplacementPreviewDto
{}

## ReplacementApprovalDto
{}

## CreateEvaluationCycleDto
{code*:string, name*:string, sessionId:object, projectId:object, type*:string enum:['sprint', 'midterm', 'final'], startDate*:string, endDate*:string, dueDate:object, useDefaultTemplate:boolean}

## UpdateEvaluationCycleDto
{name:string, startDate:string, endDate:string, dueDate:object}

## ChangeEvaluationCycleStatusDto
{status*:string enum:['draft', 'open', 'closed', 'archived']}

## CreateEvaluationCriterionDto
{code*:string, name*:string, description:object, weight*:number, maxScore:number, sortOrder:number, isRequired:boolean}

## UpdateEvaluationCriterionDto
{code:string, name:string, description:object, weight:number, maxScore:number, sortOrder:number, isRequired:boolean}

## CreateEvaluationDto
{cycleId*:string, internId*:string, evaluatorId:string}

## EvaluationScoreInputDto
{criterionId*:string, score*:number, comment:object}

## UpdateEvaluationDto
{scores*:array<EvaluationScoreInputDto>, summary:object}

## ReviseEvaluationDto
{scores:array<EvaluationScoreInputDto>, summary:string, reason*:string}

## CreateReportDto
{}

## CreateKpiPeriodDto
{code*:string, name*:string, startDate*:string, endDate*:string}

## UpdateKpiPeriodDto
{code:string, name:string, startDate:string, endDate:string}

## TransitionKpiPeriodDto
{status*:string enum:['draft', 'open', 'calculating', 'finalized', 'closed']}

## CreateSalaryAdjustmentDto
{userId*:string, type*:string enum:['bonus', 'penalty', 'adjustment', 'reversal'], amount:number, sourceId:string, reason*:string, requestId:string}

## IssueCertificateDto
{userId*:string}

## RevokeCertificateDto
{reason*:string}

## UpdateImportedReviewDto
{}

## CreateAiMentorConversationDto
{title:string}

## SendAiMentorMessageDto
{content*:string}

