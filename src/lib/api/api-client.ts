/* =====================================================================
 * API CLIENT — gọi thẳng BE thật (port 1:1 từ production V-Intern-FE).
 *
 * Bắt buộc cấu hình NEXT_PUBLIC_API_BASE_URL (vd https://host/api/v1)
 * trong .env — thiếu biến này mọi request sẽ ném API_CONFIG_MISSING
 * (không còn fallback mock nội bộ).
 * ===================================================================== */

export class ApiError extends Error {
  constructor(
    readonly statusCode: number,
    readonly code: string,
    message: string,
    readonly details?: unknown,
  ) {
    super(message);
    this.name = "ApiError";
  }
}
export function getApiBaseUrl(): string {
  return (process.env.NEXT_PUBLIC_API_BASE_URL ?? "")
    .trim()
    .replace(/\/+$/, "");
}
/** Đã cấu hình NEXT_PUBLIC_API_BASE_URL? Chưa có → app từ chối gọi API. */
export function isApiConfigured(): boolean {
  return !!getApiBaseUrl();
}
export interface ApiFetchOptions {
  method?: string;
  body?: unknown;
  formData?: FormData;
  token?: string | null;
  signal?: AbortSignal;
  responseType?: "json" | "blob" | "xlsx" | "cv";
}
export function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
export async function apiFetch(
  path: string,
  {
    method = "GET",
    body,
    formData,
    token,
    signal,
    responseType = "json",
  }: ApiFetchOptions = {},
): Promise<unknown> {
  const base = getApiBaseUrl();
  if (!base)
    throw new ApiError(
      0,
      "API_CONFIG_MISSING",
      "NEXT_PUBLIC_API_BASE_URL chưa được cấu hình.",
    );
  const url = `${base}${path}`;
  /* Direct mode (base http(s) tuyệt đối) gửi kèm skip header để ngrok free-tier
   * không chèn interstitial HTML. Proxy mode (base relative "/api/v1") là
   * same-origin — không cần (và tránh làm request thành non-simple). */
  const directApi = /^https?:\/\//i.test(base);
  let response: Response;
  try {
    response = await fetch(url, {
      method,
      cache: "no-store",
      signal,
      /* Same-origin: cookie refresh HttpOnly đi kèm tự động. Direct mode qua
       * BE tunnel/domain cũng cần credentials (BE SameSite=None + Secure +
       * CORS allow-credentials). */
      credentials: "include",
      headers: {
        ...(directApi ? { "ngrok-skip-browser-warning": "true" } : {}),
        ...(formData || body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(formData ? { body: formData } : body === undefined ? {} : { body: JSON.stringify(body) }),
    });
  } catch (error) {
    if (isRecord(error) && error.name === "AbortError") throw error;
    throw new ApiError(0, "NETWORK_ERROR", "Không thể kết nối đến hệ thống.");
  }
  if (response.status === 204 && response.ok) return null;
  if (response.ok && (responseType === "blob" || responseType === "xlsx" || responseType === "cv")) {
    const expected = responseType === "xlsx" ? "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" : responseType === "cv" ? "application/octet-stream" : "application/pdf";
    if (response.headers.get("content-type")?.split(";")[0].trim().toLowerCase() !== expected)
      throw new ApiError(0, "INVALID_RESPONSE", "Unexpected download response type.");
    return response.blob();
  }
  let data: unknown = null;
  try {
    data = await response.json();
  } catch {
    /* Invalid successful JSON is rejected by the response parser. */
  }
  if (!response.ok) {
    const err = isRecord(data) ? data : {};
    const message =
      typeof err.message === "string"
        ? err.message
        : Array.isArray(err.message)
          ? err.message.filter((x: unknown): x is string => typeof x === "string").join("; ")
          : response.statusText;
    throw new ApiError(
      response.status,
      typeof err.code === "string" ? err.code : "HTTP_ERROR",
      message,
      err.details ?? err.errors,
    );
  }
  return data;
}
export function errorMessage(error: unknown): string {
  if (!(error instanceof ApiError))
    return "Không thể xử lý dữ liệu. Vui lòng thử lại.";
  if (error.code === "API_CONFIG_MISSING") return error.message;
  if (error.code === "INVALID_RESPONSE")
    return "Dữ liệu hệ thống trả về chưa hợp lệ. Vui lòng tải lại hoặc liên hệ hỗ trợ.";
  const workflowErrors: Record<string, string> = {
    INVALID_CREDENTIALS: "Email hoặc mật khẩu không đúng.",
    ACCOUNT_LOCKED: "Tài khoản đã bị khóa. Liên hệ quản trị viên để được hỗ trợ.",
    PASSWORD_CHANGE_REQUIRED: "Bạn cần đổi mật khẩu tạm trước khi dùng hệ thống.",
    TASK_NOT_OWNED: "Bạn chỉ có thể cập nhật nhiệm vụ được giao cho mình.",
    TASK_ACCESS_DENIED: "Bạn không có quyền cập nhật nhiệm vụ này.",
    TASK_STATUS_INVALID: "Nhiệm vụ chỉ đi theo luồng Chờ làm → Đang làm → Chờ duyệt.",
    SUBMISSION_PENDING_REVIEW: "Bài nộp đang chờ giảng viên duyệt. Vui lòng chờ kết quả.",
    SPRINT_HAS_OPEN_TASKS: "Sprint còn nhiệm vụ chưa hoàn thành. Hãy xử lý hết trước khi kết thúc Sprint.",
    SPRINT_NOT_EDITABLE: "Sprint đã hoàn thành hoặc hủy. Hãy chọn Sprint khác.",
    SPRINT_ACTIVE_EXISTS: "Đang có một Sprint khác hoạt động. Hoàn thành hoặc hủy Sprint đó trước.",
    SESSION_STATUS_INVALID: "Phiên không thể chuyển sang trạng thái này.",
    AI_PROVIDER_RATE_LIMITED: "Dịch vụ AI đang quá tải. Vui lòng thử lại sau ít phút.",
    AI_PROVIDER_TIMEOUT: "Dịch vụ AI phản hồi quá lâu. Vui lòng thử lại.",
    AI_PROVIDER_UNAVAILABLE: "Dịch vụ AI chưa khả dụng. Vui lòng thử lại sau.",
    AI_RECOMMENDATION_NOT_AVAILABLE: "Chưa có khuyến nghị nào. Bấm cập nhật để tạo từ chỉ số hiện tại.",
    EVALUATION_WEIGHT_INVALID: "Tổng trọng số tiêu chí phải bằng 100%.",
    EVALUATION_CRITERIA_INCOMPLETE: "Chấm và lưu đủ điểm cho tất cả tiêu chí trước khi chốt đánh giá.",
    KPI_CALCULATION_REQUIRED: "Tính KPI thành công cho kỳ hiện tại trước khi chốt.",
    VIRTUAL_SALARY_CONFIG_MISSING: "Chưa có mức lương cơ sở ảo hợp lệ.",
    VIRTUAL_SALARY_ALREADY_REVERSED: "Dòng giao dịch này đã được hoàn đảo.",
    REPLACEMENT_PENDING_REVIEW: "Có bài đang chờ duyệt. Xử lý bài đó trước khi thay thành viên.",
    GITHUB_IDENTITY_REQUIRED: "Hãy liên kết tài khoản GitHub của bạn trước khi nộp bài.",
    CV_FILE_INVALID: "CV cần là PDF hoặc DOCX đúng định dạng, tối đa 5 MB.",
    VERIFICATION_INVALID: "Liên kết đã hết hạn hoặc đã dùng.",
    APPLICATIONS_CLOSED: "Đợt tuyển chưa mở hoặc vừa đóng.",
    MAIL_NOT_CONFIGURED: "Email chưa được cấu hình ở máy chủ.",
    CATALOG_TYPE_TAKEN: "Mã loại danh mục đã tồn tại. Hãy nhập mã khác.",
    CATALOG_ITEM_TAKEN: "Mã giá trị đã tồn tại trong loại danh mục này. Hãy nhập mã khác.",
  };
  if (workflowErrors[error.code]) return workflowErrors[error.code];
  switch (error.statusCode) {
    case 0:
      return "Không thể kết nối đến hệ thống. Vui lòng kiểm tra kết nối và thử lại.";
    case 400:
    case 422:
      return "Dữ liệu chưa hợp lệ. Vui lòng kiểm tra các trường đã nhập.";
    case 401:
      return "Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại.";
    case 403:
      return "Bạn không có quyền thực hiện thao tác này.";
    case 404:
      return "Không tìm thấy dữ liệu hoặc dữ liệu không còn khả dụng.";
    case 409:
      return "Trạng thái đã thay đổi hoặc thao tác chưa được phép. Vui lòng tải lại để xem trạng thái mới nhất.";
    case 429:
      return "Bạn thao tác quá nhanh. Vui lòng chờ rồi thử lại.";
    case 503:
      return "Dịch vụ tạm thời chưa khả dụng. Vui lòng thử lại sau.";
    default:
      return "Hệ thống đang gặp lỗi. Vui lòng thử lại sau.";
  }
}
