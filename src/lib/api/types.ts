export type BackendUserRole = "candidate" | "recruiter";

export interface BackendUser {
  id: string;
  email: string;
  role: BackendUserRole;
  is_active: boolean;
}

export interface AuthSession {
  accessToken: string;
  user: BackendUser;
}

export interface AuthTokenResponse {
  access_token: string;
  token_type: string;
  user: BackendUser;
}

export interface SignupRequest {
  email: string;
  password: string;
  role: BackendUserRole;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface DemoLoginRequest {
  role: BackendUserRole;
}

export type CandidateAvailabilityStatus = "open" | "interviewing" | "paused" | string;

export interface CandidateProfile {
  id: string;
  user_id: string;
  full_name: string | null;
  university: string | null;
  degree: string | null;
  graduation_year: number | null;
  gpa: number | null;
  target_role: string | null;
  experience_level: string | null;
  tech_stack: string[];
  skills: string[];
  portfolio_url: string | null;
  linkedin_url: string | null;
  resume_url: string | null;
  profile_visibility: boolean;
  availability_status: CandidateAvailabilityStatus;
  profile_complete: boolean;
}

export interface CandidateProfileUpdate {
  full_name?: string | null;
  university?: string | null;
  degree?: string | null;
  graduation_year?: number | null;
  gpa?: number | null;
  target_role?: string | null;
  experience_level?: string | null;
  tech_stack?: string[];
  skills?: string[];
  portfolio_url?: string | null;
  linkedin_url?: string | null;
  resume_url?: string | null;
  profile_visibility?: boolean;
  availability_status?: CandidateAvailabilityStatus;
  profile_complete?: boolean;
}

export type AssessmentStatus = "created" | "in_progress" | "completed" | "abandoned";

export interface AssessmentQuestion {
  id: string;
  question_bank_id: string;
  order_index: number;
  question_text: string;
  question_type: string;
  category: string;
  difficulty: string;
  time_limit_seconds: number;
  expected_concepts: string[];
  scoring_rubric: Record<string, unknown>;
}

export interface AssessmentAnswer {
  id: string;
  assessment_question_id: string;
  question_bank_id: string;
  order_index: number;
  answer_text: string | null;
  code_text: string | null;
  duration_seconds: number;
  metadata: Record<string, unknown>;
}

export interface AssessmentProgress {
  answered: number;
  total: number;
  current_order_index: number;
  is_complete: boolean;
}

export interface AssessmentSession {
  id: string;
  candidate_id: string;
  status: AssessmentStatus;
  target_role: string | null;
  experience_level: string | null;
  selected_difficulty: string;
  current_order_index: number;
  total_questions: number;
  session_plan_metadata: Record<string, unknown>;
}

export interface AssessmentSessionDetail {
  session: AssessmentSession;
  questions: AssessmentQuestion[];
  answers: AssessmentAnswer[];
  current_question: AssessmentQuestion | null;
  progress: AssessmentProgress;
}

export interface CurrentQuestionResponse {
  session_id: string;
  current_question: AssessmentQuestion | null;
  progress: AssessmentProgress;
}

export interface StartAssessmentRequest {
  force_new?: boolean;
}

export interface SubmitAssessmentAnswerRequest {
  assessment_question_id: string;
  answer_text?: string | null;
  code_text?: string | null;
  duration_seconds: number;
  metadata?: Record<string, unknown>;
}

export interface SubmitAssessmentAnswerResponse {
  answer: AssessmentAnswer;
  next_question: AssessmentQuestion | null;
  session: AssessmentSession;
  progress: AssessmentProgress;
}

export interface ProviderMetadata {
  requested_provider?: string | null;
  actual_provider?: string;
  provider: string;
  model: string;
  fallback_used: boolean;
  fallback_chain?: string[];
  warnings: string[];
  generated_at?: string;
}

export interface EvaluationReportJson {
  provider_metadata?: ProviderMetadata;
  ai_test_score?: number;
  technical_score?: number;
  communication_score?: number;
  problem_solving_score?: number;
  system_design_score?: number;
  code_quality_score?: number;
  project_quality_score?: number;
  project_quality?: Record<string, unknown>;
  project_score_source?: string;
  academic_score?: number;
  academic_score_source?: string;
  integrity_score?: number;
  integrity_penalty?: number;
  integrity_summary?: Record<string, unknown>;
  verified_score?: number;
  strengths?: unknown;
  weaknesses?: unknown;
  recommended_improvements?: unknown;
  role_fit?: unknown;
  recruiter_summary?: string;
  transcript_evidence?: unknown;
  question_wise_scores?: unknown;
  embedding_rebuild_warning?: string;
  [key: string]: unknown;
}

export interface EvaluationReportDetail {
  id: string;
  session_id: string;
  candidate_id: string;
  ai_test_score: number;
  technical_score: number;
  communication_score: number;
  problem_solving_score: number;
  system_design_score: number;
  code_quality_score: number;
  project_quality_score: number;
  academic_score: number;
  integrity_score: number;
  verified_score: number;
  recruiter_summary: string;
  published: boolean;
  report_json: EvaluationReportJson;
}

export interface PublishReportResponse {
  report: EvaluationReportDetail;
}

export interface OnboardingConversationMessage {
  role: "assistant" | "user";
  content: string;
}

export interface OnboardingProfileDraft {
  full_name?: string | null;
  university?: string | null;
  degree?: string | null;
  graduation_year?: number | null;
  gpa?: number | null;
  target_role?: string | null;
  experience_level?: string | null;
  tech_stack?: string[];
  skills?: string[];
  portfolio_url?: string | null;
  linkedin_url?: string | null;
  resume_url?: string | null;
  availability_status?: CandidateAvailabilityStatus | null;
  project_summary?: string | null;
  career_goal?: string | null;
}

export type OnboardingExtractedFields = OnboardingProfileDraft;

export interface OnboardingChatRequest {
  current_profile?: OnboardingProfileDraft;
  user_message: string;
  conversation_history?: OnboardingConversationMessage[];
  current_step?: string | null;
}

export interface OnboardingChatResponse {
  assistant_message: string;
  extracted_fields: OnboardingExtractedFields;
  suggested_skills: string[];
  inferred_target_role: string | null;
  inferred_experience_level: string | null;
  missing_fields: string[];
  profile_completion_delta: number;
  next_question: string;
  confidence: number;
  provider_metadata: ProviderMetadata;
}

export interface CandidateEmbeddingRead {
  id: string;
  candidate_id: string;
  report_id: string | null;
  source_type: string;
  embedding_model: string;
  embedding_provider: string;
  embedding_dimensions: number;
  fallback_used: boolean;
  metadata_json: Record<string, unknown>;
  created_at: string;
  updated_at: string;
}

export interface EmbeddingProviderMetadata {
  provider: string;
  model: string;
  dimensions: number;
  fallback_used: boolean;
  warnings: string[];
}

export interface CandidateEmbeddingStatus {
  profile_exists: boolean;
  profile_visible: boolean;
  latest_published_report_id: string | null;
  has_embedding: boolean;
  embedding: CandidateEmbeddingRead | null;
}

export interface CandidateEmbeddingRebuildResponse {
  embedding: CandidateEmbeddingRead;
  provider_metadata: EmbeddingProviderMetadata;
}

export type InviteStatus = "pending" | "accepted" | "declined" | "withdrawn";
export type InviteResponseStatus = "accepted" | "declined";

export interface CandidateMarketplaceSummary {
  id: string;
  full_name: string | null;
  university: string | null;
  target_role: string | null;
  skills: string[];
  tech_stack: string[];
  availability_status: string;
  profile_visibility: boolean;
  verified_score: number | null;
  recruiter_summary: string | null;
}

export interface CompanyMarketplaceSummary {
  id: string | null;
  company_name: string | null;
  recruiter_name: string | null;
  industry?: string | null;
  website?: string | null;
}

export interface CandidateInvite {
  id: string;
  candidate_id: string;
  recruiter_id: string;
  company_id: string | null;
  role_title: string;
  message: string;
  salary_range: string | null;
  opportunity_type: string;
  interview_window: string | null;
  note: string | null;
  status: InviteStatus;
  response_message: string | null;
  created_at: string;
  updated_at: string;
  responded_at: string | null;
  company: CompanyMarketplaceSummary;
}

export interface CandidateInviteListResponse {
  items: CandidateInvite[];
}

export interface InviteRespondRequest {
  status: InviteResponseStatus;
  response_message?: string | null;
}

export interface ActivityEvent {
  id: string;
  event_type: string;
  title: string;
  description: string;
  entity_type: string;
  entity_id: string;
  metadata_json: Record<string, unknown>;
  actor_user_id: string | null;
  created_at: string;
}

export interface ActivityFeedResponse {
  items: ActivityEvent[];
}

export type IntegrityEventType =
  | "TAB_HIDDEN"
  | "WINDOW_BLUR"
  | "WINDOW_FOCUS_LOST"
  | "PASTE_ATTEMPT"
  | "COPY_ATTEMPT"
  | "RIGHT_CLICK"
  | "FULLSCREEN_EXIT"
  | "CAMERA_DENIED"
  | "NO_FACE_DETECTED"
  | "MULTIPLE_FACES_DETECTED"
  | "FACE_AWAY"
  | "EXCESSIVE_MOVEMENT"
  | "LONG_INACTIVITY"
  | "FAST_RESPONSE_ANOMALY";

export type IntegritySeverity = "low" | "medium" | "high";

export interface IntegrityEventCreate {
  session_id: string;
  event_type: IntegrityEventType;
  severity?: IntegritySeverity | null;
  details_json?: Record<string, unknown>;
  duration_ms?: number;
  occurred_at?: string | null;
}

export interface IntegrityEventRead {
  id: string;
  session_id: string;
  candidate_id: string;
  event_type: IntegrityEventType | string;
  severity: IntegritySeverity | string;
  details_json: Record<string, unknown>;
  duration_ms: number;
  occurred_at: string;
}

export interface IntegrityEventBatchCreate {
  events: IntegrityEventCreate[];
}

export interface IntegrityBatchResponse {
  events: IntegrityEventRead[];
  ignored_duplicates: number;
}

export interface IntegritySummary {
  integrity_score: number;
  risk_level: string;
  summary: string;
  events_by_type: Record<string, number>;
  events_by_severity: Record<string, number>;
  strongest_flags: Array<Record<string, unknown>>;
  recommendation: string;
  total_events: number;
  total_duration_ms: number;
  penalty_breakdown: Record<string, number>;
}

export interface BackendHealth {
  status: string;
  database: string;
}

export interface BackendHealthResult {
  available: boolean;
  health?: BackendHealth;
  error?: unknown;
}

export interface ApiRequestOptions extends Omit<RequestInit, "body" | "headers"> {
  auth?: boolean;
  body?: unknown;
  headers?: HeadersInit;
  timeoutMs?: number;
}

export interface ApiFallbackContext {
  error: unknown;
  operation: string;
}
