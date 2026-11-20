import type {
  ActivityItem,
  AdminUserRow,
  Certificate,
  Evaluation,
  GradingItem,
  InstructorSession,
  InternOverview,
  KpiRecord,
  MockAccount,
  MentorConversation,
  NotificationCategory,
  NotificationItem,
  Priority,
  QuestionRow,
  ReportRow,
  Role,
  SalaryEntry,
  SessionMember,
  SessionStatus,
  Sprint,
  SprintBoard,
  SprintBoardTask,
  SprintStatus,
  Task,
  TemplateRow,
} from "./types";

/* =====================================================================
 * V-INTERN MOCK DATA — dữ liệu mẫu cho mọi trạng thái nghiệp vụ.
 * Tài khoản demo dùng trong màn hình đăng nhập (one-click fill).
 * ===================================================================== */

const DAY = 86_400_000;
const iso = (offsetDays: number, hour = 9, minute = 30) => {
  const d = new Date(Date.now() + offsetDays * DAY);
  d.setHours(hour, minute, 0, 0);
  return d.toISOString();
};
const day = (offsetDays: number) => iso(offsetDays).slice(0, 10);

/* ------------------------------ TÀI KHOẢN ---------------------------- */
/* Mọi trường hợp: SV đang làm / chờ phân công / mới vào kỳ đầu / đã
   hoàn thành / bị khóa, giảng viên (thường / mới / bị khóa), quản trị
   viên (thường / bị khóa / bị reset mật khẩu). Mảng này là trạng thái
   "sống" — auth/change-password ghi đè trực tiếp lên object. */

export const ACCOUNTS: MockAccount[] = [
  {
    id: "u-minh",
    email: "minh.nguyen@student.edu.vn",
    password: "Sv@2026",
    name: "Nguyễn Minh",
    role: "intern",
    status: "active",
    title: "Sinh viên · Frontend Intern",
    internState: "active",
    note: "Đang thực tập — Sprint 3 diễn ra, có task đang làm",
  },
  {
    id: "u-linh",
    email: "linh.tran@student.edu.vn",
    password: "Sv@2026",
    name: "Trần Bảo Linh",
    role: "intern",
    status: "active",
    title: "Sinh viên · Đã đậu phỏng vấn",
    internState: "waiting",
    note: "Đã trúng tuyển — đang chờ phân công dự án",
  },
  {
    id: "u-an",
    email: "an.pham@student.edu.vn",
    password: "Sv@2026",
    name: "Phạm Gia An",
    role: "intern",
    status: "active",
    title: "Sinh viên · Đã hoàn thành kỳ thực tập",
    internState: "finished",
    note: "Hoàn thành — có KPI, lương ảo và chứng nhận",
  },
  {
    id: "u-tuan",
    email: "tuan.vo@student.edu.vn",
    password: "Sv@2026",
    name: "Võ Quốc Tuấn",
    role: "intern",
    status: "locked",
    title: "Sinh viên · Đã khóa",
    note: "Tài khoản bị khóa — thử đăng nhập để xem thông báo lỗi",
  },
  {
    id: "u-hoa",
    email: "hoa.le@student.edu.vn",
    password: "Sv@2026",
    name: "Lê Thu Hòa",
    role: "intern",
    status: "active",
    title: "Sinh viên · Frontend Intern (kỳ đầu)",
    internState: "active",
    mustChangePassword: true,
    note: "Kỳ đầu tiên — cần đổi mật khẩu mặc định khi đăng nhập",
  },
  {
    id: "u-vy",
    email: "vy.dang@student.edu.vn",
    password: "Sv@2026",
    name: "Đặng Khánh Vy",
    role: "intern",
    status: "active",
    title: "Sinh viên · Mới trúng tuyển",
    internState: "waiting",
    mustChangePassword: true,
    note: "Vừa trúng tuyển — đổi mật khẩu lần đầu, chờ phân công dự án",
  },
  {
    id: "u-lan",
    email: "lan.pham@vintern.edu.vn",
    password: "Gv@2026",
    name: "TS. Phạm Thu Lan",
    role: "instructor",
    status: "active",
    title: "Giảng viên hướng dẫn",
    note: "2 phiên thực tập đang diễn ra",
  },
  {
    id: "u-son",
    email: "son.tran@vintern.edu.vn",
    password: "Gv@2026",
    name: "ThS. Trần Hải Sơn",
    role: "instructor",
    status: "locked",
    title: "Giảng viên · Tạm khóa",
    note: "Giảng viên — tài khoản tạm khóa (nghi vấn truy cập)",
  },
  {
    id: "u-mai",
    email: "mai.dang@vintern.edu.vn",
    password: "Gv@2026",
    name: "Đặng Thy Mai",
    role: "instructor",
    status: "active",
    title: "Giảng viên hướng dẫn (mới)",
    mustChangePassword: true,
    note: "Giảng viên mới — cần đổi mật khẩu cấp lần đầu",
  },
  {
    id: "u-quantri",
    email: "quan.tri@vintern.edu.vn",
    password: "Adm@2026",
    name: "Trần Vân Anh",
    role: "admin",
    status: "active",
    title: "Quản trị viên hệ thống",
    note: "Toàn quyền vận hành nền tảng",
  },
  {
    id: "u-bac",
    email: "bac.nguyen@vintern.edu.vn",
    password: "Adm@2026",
    name: "Nguyễn Hải Bắc",
    role: "admin",
    status: "locked",
    title: "Quản trị viên · Tạm khóa",
    note: "Quản trị viên — khóa tạm thời để điều tra sự cố",
  },
  {
    id: "u-cuong",
    email: "cuong.vo@vintern.edu.vn",
    password: "Adm@2026",
    name: "Võ Đức Cường",
    role: "admin",
    status: "active",
    title: "Quản trị viên hệ thống",
    mustChangePassword: true,
    note: "Quản trị viên — mật khẩu vừa được reset, phải đổi",
  },
];

export const DEMO_ACCOUNTS_PUBLIC = ACCOUNTS.map(({ password, ...rest }) => ({
  ...rest,
  password, // FE demo cho phép hiển thị để thao tác nhanh
}));

/* --------------------------- PHÂN LOẠI SV ---------------------------- */
/* Mọi hàm XForIntern(email) đều đi qua bộ lọc này — không email nào
   làm hàm vỡ: email lạ rơi về "unknown" → dùng dữ liệu của minh
   hoặc trạng thái rỗng tùy ngữ cảnh. */

type InternKey = "minh" | "linh" | "an" | "tuan" | "hoa" | "vy" | "unknown";

function classifyIntern(email: string): InternKey {
  if (email.includes("minh.nguyen")) return "minh";
  if (email.includes("linh.tran")) return "linh";
  if (email.includes("an.pham")) return "an";
  if (email.includes("tuan.vo")) return "tuan";
  if (email.includes("hoa.le")) return "hoa";
  if (email.includes("vy.dang")) return "vy";
  return "unknown";
}

/* --------------------------- INTERN: TASKS --------------------------- */

/* Minh — 13 nhiệm vụ: Sprint 2 đã khép lại (gần như hoàn tất),
   Sprint 3 đang diễn ra với đầy đủ 4 cột kanban. */

const TASKS_ACTIVE: Task[] = [
  {
    id: "t-101",
    code: "FE-101",
    title: "Xây dựng layout khung sổ tay hành trình",
    status: "done",
    priority: "high",
    sprint: "Sprint 2",
    points: 5,
    progress: 100,
    dueDate: day(-9),
    description:
      "Dựng khung giao diện chính theo token thiết kế: nền giấy kem, viền mực 2px, bóng in lệch. Tách component SketchCard, InkButton dùng chung.",
    acceptance: [
      "Khung trang khớp token màu giấy/mực ở cả 2 theme",
      "Component SketchCard tái dùng được ở 3 vùng khác nhau",
      "Không có lỗi console khi chuyển dark mode",
    ],
    history: [
      { at: iso(-14), label: "Tạo nhiệm vụ" },
      { at: iso(-12), label: "Chuyển sang Đang làm" },
      { at: iso(-10), label: "Nộp PR #128" },
      { at: iso(-9), label: "Duyệt — Hoàn thành" },
    ],
  },
  {
    id: "t-109",
    code: "FE-095",
    title: "Bộ token thiết kế giấy kem & mực",
    status: "done",
    priority: "high",
    sprint: "Sprint 2",
    points: 3,
    progress: 100,
    dueDate: day(-12),
    description:
      "Chuyển toàn bộ biến màu sang CSS custom property theo chuẩn design token, kèm file ánh xạ cho Figma và code.",
    acceptance: [
      "Token được đặt tên theo vai trò, không theo màu",
      "Dark mode lấy đúng bộ token thứ hai",
    ],
    history: [
      { at: iso(-16), label: "Tạo nhiệm vụ" },
      { at: iso(-15), label: "Chuyển sang Đang làm" },
      { at: iso(-13), label: "Nộp PR #126" },
      { at: iso(-12), label: "Duyệt — Hoàn thành" },
    ],
  },
  {
    id: "t-110",
    code: "FE-098",
    title: "Trang hồ sơ cá nhân với avatar nét chì",
    status: "done",
    priority: "medium",
    sprint: "Sprint 2",
    points: 3,
    progress: 100,
    dueDate: day(-10),
    description:
      "Trang hồ sơ sinh viên: avatar vẽ tay, thẻ kỹ năng, dòng thời gian quá trình. Ảnh đại diện fallback bằng chữ cái đầu tên.",
    acceptance: [
      "Hồ sơ render đúng với tên dài 45 ký tự",
      "Avatar fallback khi ảnh chưa tải xong",
    ],
    history: [
      { at: iso(-13), label: "Tạo nhiệm vụ" },
      { at: iso(-11), label: "Nộp PR #127" },
      { at: iso(-10), label: "Duyệt — Hoàn thành" },
    ],
  },
  {
    id: "t-111",
    code: "API-190",
    title: "API xác thực đăng nhập cho môi trường demo",
    status: "review",
    priority: "medium",
    sprint: "Sprint 2",
    points: 5,
    progress: 85,
    dueDate: day(-5),
    description:
      "Luồng đăng nhập giả lập: kiểm tra cặp email/mật khẩu, cấp token tạm, trả envelope chuẩn {ok, data, message}.",
    acceptance: [
      "Sai mật khẩu 5 lần liên tiếp → khóa 15 phút",
      "Envelope lỗi có message tiếng Việt",
    ],
    history: [
      { at: iso(-12), label: "Tạo nhiệm vụ" },
      { at: iso(-8), label: "Chuyển sang Đang làm" },
      { at: iso(-5, 16, 20), label: "Nộp PR #133 — chờ duyệt" },
    ],
  },
  {
    id: "t-108",
    code: "QA-301",
    title: "Bộ kiểm thử tương tác kanban",
    status: "done",
    priority: "medium",
    sprint: "Sprint 2",
    points: 3,
    progress: 100,
    dueDate: day(-6),
    description: "Viết test kéo–thả kanban: happy path, thả sai cột, hoàn tác.",
    acceptance: ["Đủ 6 ca kiểm thử", "CI xanh 3 lần liên tiếp"],
    history: [
      { at: iso(-9), label: "Tạo nhiệm vụ" },
      { at: iso(-7), label: "Nộp PR #135" },
      { at: iso(-6), label: "Duyệt — Hoàn thành" },
    ],
  },
  {
    id: "t-102",
    code: "FE-102",
    title: "Kanban cá nhân kéo–thả với 4 cột trạng thái",
    status: "doing",
    priority: "urgent",
    sprint: "Sprint 3",
    points: 8,
    progress: 55,
    dueDate: day(2),
    description:
      "Bảng Kanban cá nhân: Cần làm → Đang làm → Chờ duyệt → Hoàn thành. Kéo-thả bằng dnd-kit, có fallback bàn phím và mobile.",
    acceptance: [
      "Kéo thẻ giữa các cột mượt trên desktop và mobile",
      "Thả vào cột Chờ duyệt thì mở luồng nộp bài",
      "Điều khiển được hoàn toàn bằng bàn phím",
    ],
    history: [
      { at: iso(-4), label: "Tạo nhiệm vụ" },
      { at: iso(-3), label: "Chuyển sang Đang làm" },
    ],
  },
  {
    id: "t-106",
    code: "FE-106",
    title: "Tích hợp API danh sách nhiệm vụ vào Kanban",
    status: "doing",
    priority: "high",
    sprint: "Sprint 3",
    points: 5,
    progress: 40,
    dueDate: day(-1),
    description:
      "Nối bảng Kanban với endpoint /tasks: adapter đổi shape response sang model FE, skeleton khi tải, retry khi lỗi mạng, hủy request cũ khi lọc lại.",
    acceptance: [
      "Adapter kiểm tra schema trước khi render",
      "Lọc lại danh sách không bao giờ ghi đè bằng response cũ",
      "Nhánh lỗi và nhánh rỗng hiển thị đúng từng loại",
    ],
    history: [
      { at: iso(-3, 10, 0), label: "Tạo nhiệm vụ" },
      { at: iso(-2, 9, 15), label: "Chuyển sang Đang làm" },
    ],
  },
  {
    id: "t-104",
    code: "API-201",
    title: "API danh sách nhiệm vụ kèm bộ lọc trạng thái",
    status: "review",
    priority: "high",
    sprint: "Sprint 3",
    points: 5,
    progress: 90,
    dueDate: day(0),
    description:
      "Endpoint GET /tasks hỗ trợ filter theo status, priority, sprint; trả về shape tương thích adapter FE hiện có.",
    acceptance: ["Filter chính xác 100% ca kiểm thử", "Thời gian phản hồi < 200ms"],
    history: [
      { at: iso(-5), label: "Tạo nhiệm vụ" },
      { at: iso(-4), label: "Chuyển sang Đang làm" },
      { at: iso(-1, 16, 45), label: "Nộp PR #142 — chờ duyệt" },
    ],
  },
  {
    id: "t-103",
    code: "FE-103",
    title: "Hiệu ứng reveal cuộn cho danh sách task",
    status: "review",
    priority: "medium",
    sprint: "Sprint 3",
    points: 3,
    progress: 80,
    dueDate: day(1),
    description:
      "Danh sách nhiệm vụ xuất hiện lần lượt (stagger) khi cuộn tới; tôn trọng prefers-reduced-motion.",
    acceptance: ["Chuyển động mượt ở 60fps", "Tắt hiệu ứng khi hệ điều hành yêu cầu reduced-motion"],
    history: [
      { at: iso(-2), label: "Tạo nhiệm vụ" },
      { at: iso(-1), label: "Chuyển sang Đang làm" },
      { at: iso(0, 9, 25), label: "Nộp PR #145 — chờ duyệt" },
    ],
  },
  {
    id: "t-113",
    code: "QA-305",
    title: "Sửa lỗi kéo–thả Kanban trên Safari",
    status: "done",
    priority: "medium",
    sprint: "Sprint 3",
    points: 2,
    progress: 100,
    dueDate: day(-2),
    description:
      "Thẻ Kanban giật khựng trên Safari 17 do transform vs. left/top; đổi sang transform duy nhất và snap điểm thả.",
    acceptance: ["Kéo mượt trên Safari 17 và iOS", "Không gây hồi quy trên Chrome"],
    history: [
      { at: iso(-4, 9, 0), label: "Tạo nhiệm vụ" },
      { at: iso(-3, 14, 0), label: "Nộp PR #139" },
      { at: iso(-2, 10, 0), label: "Duyệt — Hoàn thành" },
    ],
  },
  {
    id: "t-105",
    code: "FE-105",
    title: "Trang thông báo phân loại theo nhóm",
    status: "todo",
    priority: "medium",
    sprint: "Sprint 3",
    points: 5,
    progress: 0,
    dueDate: day(6),
    description: "Trang thông báo cá nhân: feed theo ngày, badge nhóm, lọc chỉ chưa đọc, đánh dấu từng cái hoặc tất cả.",
    acceptance: ["Phân trang đúng", "Đánh dấu đã đọc cập nhật ngay không cần tải lại"],
    history: [{ at: iso(0, 8, 15), label: "Tạo nhiệm vụ" }],
  },
  {
    id: "t-107",
    code: "FE-107",
    title: "Khung thoại AI Mentor phiên bản di động",
    status: "todo",
    priority: "high",
    sprint: "Sprint 3",
    points: 8,
    progress: 0,
    dueDate: day(10),
    description: "Tối ưu khu vực hội thoại AI Mentor cho màn hình 390px: bàn phím ảo, cuộn tin nhắn, nút gửi nổi.",
    acceptance: ["Thao tác được bằng một tay", "Không che mất tin cuối khi bàn phím mở"],
    history: [{ at: iso(0, 8, 20), label: "Tạo nhiệm vụ" }],
  },
  {
    id: "t-112",
    code: "FE-108",
    title: "Tối ưu cuộn danh sách nhiệm vụ (virtualized)",
    status: "todo",
    priority: "low",
    sprint: "Sprint 3",
    points: 3,
    progress: 0,
    dueDate: day(9),
    description:
      "Danh sách trên 100 thẻ chỉ render vùng nhìn thấy; đo lại fps trước/sau bằng Chrome performance panel.",
    acceptance: ["Cuộn 60fps với 200 thẻ", "Thanh tìm kiếm vẫn hoạt động khi virtualize"],
    history: [{ at: iso(0, 8, 25), label: "Tạo nhiệm vụ" }],
  },
];

/* Hòa — kỳ đầu tiên, tuần 1 của Sprint 1: toàn bộ nhiệm vụ dễ,
   có một nhiệm vụ fokus đang làm dở 25%. */

const TASKS_FRESH: Task[] = [
  {
    id: "tf-1",
    code: "FE-011",
    title: "Đọc bộ tài liệu dự án & ghi chú câu hỏi",
    status: "todo",
    priority: "low",
    sprint: "Sprint 1",
    points: 1,
    progress: 0,
    dueDate: day(2),
    description:
      "Đọc tổng quan dự án 'Cổng thông tin sự nghiệp UEH', quy ước code và sổ tay onboarding; ghi lại mọi chỗ chưa hiểu.",
    acceptance: ["Có tối thiểu 5 câu hỏi gửi AI Mentor hoặc giảng viên"],
    history: [{ at: iso(-2, 9, 0), label: "Tạo nhiệm vụ" }],
  },
  {
    id: "tf-2",
    code: "FE-012",
    title: "Phác bố cục trang README nhóm trên giấy",
    status: "todo",
    priority: "medium",
    sprint: "Sprint 1",
    points: 2,
    progress: 0,
    dueDate: day(5),
    description: "Phác thảo bố cục bằng nét chì: khung tiêu đề, dải thành viên, mục quy ước nhóm, dòng thời gian.",
    acceptance: ["Bố cục được nhóm duyệt trước khi dựng code", "Tối đa 2 vòng sửa"],
    history: [{ at: iso(-1, 9, 0), label: "Tạo nhiệm vụ" }],
  },
  {
    id: "tf-3",
    code: "FE-014",
    title: "Ghi quy ước commit & đặt tên nhánh",
    status: "todo",
    priority: "medium",
    sprint: "Sprint 1",
    points: 2,
    progress: 0,
    dueDate: day(7),
    description: "Soạn quy ước commit (type: scope — message) và bảng quy tắc đặt tên nhánh cho cả nhóm.",
    acceptance: ["Giảng viên phản biện 1 vòng là duyệt", "Có bảng ví dụ đúng/sai"],
    history: [{ at: iso(-1, 9, 5), label: "Tạo nhiệm vụ" }],
  },
  {
    id: "tf-4",
    code: "FE-015",
    title: "Tạo nhánh cá nhân đầu tiên & push thử",
    status: "todo",
    priority: "low",
    sprint: "Sprint 1",
    points: 1,
    progress: 0,
    dueDate: day(8),
    description: "Làm quen luồng git: tạo nhánh theo quy ước, sửa 1 file nhỏ, mở pull request đầu tiên tới mentor duyệt.",
    acceptance: ["PR đầu tiên được mentor merge", "Biết cách pull --rebase sau khi có conflict"],
    history: [{ at: iso(-1, 9, 10), label: "Tạo nhiệm vụ" }],
  },
  {
    id: "tf-5",
    code: "FE-013",
    title: "Xây dựng trang README nhóm",
    status: "doing",
    priority: "high",
    sprint: "Sprint 1",
    points: 3,
    progress: 25,
    dueDate: day(4),
    description:
      "Dựng trang README nhóm theo phác họa: khung tiêu đề, dải thành viên với avatar, mục quy ước và dòng thời gian tuần.",
    acceptance: [
      "Khung trang khớp phác họa đã duyệt",
      "Dải thành viên render đúng 5 bạn trong nhóm",
    ],
    history: [
      { at: iso(-1, 10, 0), label: "Tạo nhiệm vụ" },
      { at: iso(0, 9, 30), label: "Chuyển sang Đang làm" },
    ],
  },
  {
    id: "tf-6",
    code: "FE-016",
    title: "Danh sách thành viên nhóm với avatar nét chì",
    status: "doing",
    priority: "medium",
    sprint: "Sprint 1",
    points: 3,
    progress: 40,
    dueDate: day(3),
    description: "Component thẻ thành viên: avatar, tên, vai trò trong nhóm; bố cục responsive 2 cột trên mobile.",
    acceptance: ["Thẻ dùng lại được cho trang khác", "Ảnh chưa tải thì fallback chữ cái đầu"],
    history: [
      { at: iso(-1, 10, 5), label: "Tạo nhiệm vụ" },
      { at: iso(0, 10, 0), label: "Chuyển sang Đang làm" },
    ],
  },
  {
    id: "tf-7",
    code: "FE-017",
    title: "Bản mô tả cấu trúc thư mục dự án",
    status: "review",
    priority: "medium",
    sprint: "Sprint 1",
    points: 2,
    progress: 60,
    dueDate: day(1),
    description: "Tài liệu hóa cấu trúc thư mục: mỗi thư mục chính kèm 1–2 dòng giải thích trách nhiệm.",
    acceptance: ["Không thư mục chính nào thiếu mô tả", "Được mentor duyệt lần đầu"],
    history: [
      { at: iso(-1, 10, 10), label: "Tạo nhiệm vụ" },
      { at: iso(0, 8, 50), label: "Nộp PR #152 — chờ duyệt" },
    ],
  },
];

export function tasksForIntern(email: string): Task[] {
  const key = classifyIntern(email);
  // An đã hoàn thành — mọi nhiệm vụ chốt ở trạng thái done.
  if (key === "an") {
    return TASKS_ACTIVE.map((t) => ({ ...t, status: "done" as const, progress: 100 }));
  }
  // Hòa — kỳ đầu tiên, tuần 1 của Sprint 1.
  if (key === "hoa") return TASKS_FRESH;
  // Chưa được phân công (linh, vy) hoặc tài khoản bị khóa (tuan) — sổ trống.
  if (key === "linh" || key === "vy" || key === "tuan") return [];
  // Mặc định (minh & email lạ) — dữ liệu chuẩn đang thực tập.
  return TASKS_ACTIVE;
}

/* -------------------------- INTERN: OVERVIEW ------------------------- */

export function overviewForIntern(email: string): InternOverview {
  const key = classifyIntern(email);
  const account = ACCOUNTS.find((a) => a.email === email) ?? ACCOUNTS[0];
  const tasks = tasksForIntern(email);
  const summary = {
    total: tasks.length,
    todo: tasks.filter((t) => t.status === "todo").length,
    doing: tasks.filter((t) => t.status === "doing").length,
    review: tasks.filter((t) => t.status === "review").length,
    done: tasks.filter((t) => t.status === "done").length,
  };
  const firstName = account.name.split(" ").slice(-1)[0];

  // Chờ phân công (linh, vy) hoặc khóa (tuan) — không có placement.
  if (key === "linh" || key === "vy" || key === "tuan") {
    return {
      greeting: `Chào ${firstName}, đã thấy bạn ở đây rồi!`,
      userName: account.name,
      internState: "waiting",
      placement: null,
      taskSummary: { total: 0, todo: 0, doing: 0, review: 0, done: 0 },
      nextTasks: [],
      focusedTask: null,
      recentActivity: [
        { at: iso(-11), label: "Đã đậu phỏng vấn AI — 78/100 điểm", kind: "Tuyển dụng" },
        { at: iso(-11, 10, 5), label: "Hồ sơ chuyển sang hàng chờ phân công", kind: "Tuyển dụng" },
        { at: iso(-1), label: "Hệ thống xác minh email thành công", kind: "Hệ thống" },
      ],
    };
  }

  // Hòa — kỳ đầu tiên, tuần 1 Sprint 1.
  if (key === "hoa") {
    return {
      greeting: `Chào mừng kỳ đầu tiên, ${firstName}!`,
      userName: account.name,
      internState: "active",
      placement: {
        project: "Cổng thông tin sự nghiệp UEH",
        projectCode: "PRJ-2026-UEH",
        session: "SS-2026-03 · Nhóm sáng thứ 4",
        sprint: "Sprint 1 · Tuần 1/2",
        sprintStatus: "Đang diễn ra",
        progressPct: 18,
        weekLabel: "1/8 tuần",
      },
      taskSummary: summary,
      nextTasks: tasks.filter((t) => t.status !== "done").slice(0, 4),
      focusedTask: tasks.find((t) => t.id === "tf-5") ?? null,
      recentActivity: [
        { at: iso(0, 8, 50), label: "Đăng nhập lần đầu — cần đổi mật khẩu mặc định", kind: "Hệ thống" },
        { at: iso(-1, 9, 0), label: "Sprint 1 mở — nhận 7 nhiệm vụ đầu tiên", kind: "Phiên thực tập" },
        { at: iso(-2, 10, 0), label: "Được phân công vào SS-2026-03 · Cổng thông tin sự nghiệp UEH", kind: "Phiên thực tập" },
      ],
    };
  }

  const finished = key === "an" || account.internState === "finished";

  return {
    greeting: `Một buổi sáng tốt lành, ${firstName}!`,
    userName: account.name,
    internState: finished ? "finished" : "active",
    placement: {
      project: "Sổ tay hành trình thực tập số",
      projectCode: "PRJ-2026-NB",
      session: "SS-2026-01 · Khóa 2026",
      sprint: "Sprint 3",
      sprintStatus: finished ? "Đã kết thúc" : "Đang diễn ra · Tuần 1/2",
      progressPct: finished ? 100 : 58,
      weekLabel: finished ? "8/8 tuần" : "5/8 tuần",
    },
    taskSummary: summary,
    nextTasks: tasks.filter((t) => t.status !== "done").slice(0, 4),
    focusedTask: finished ? null : tasks.find((t) => t.id === "t-106") ?? null,
    recentActivity: finished
      ? [
          { at: iso(-12), label: "Chứng nhận CRT-2026-0042 được cấp", kind: "Chứng nhận" },
          { at: iso(-13), label: "KPI kỳ cuối: 88/100 — Đạt", kind: "KPI" },
          { at: iso(-14), label: "Đánh giá Sprint 4 được chốt: 8.6/10", kind: "Đánh giá" },
        ]
      : [
          { at: iso(0, 9, 25), label: "PR #145 (FE-103) chuyển sang chờ duyệt", kind: "Nhiệm vụ" },
          { at: iso(-1, 16, 45), label: "PR #142 (API-201) chuyển sang chờ duyệt", kind: "Nhiệm vụ" },
          { at: iso(-2, 15, 0), label: "Sprint 3 mở — nhận 8 nhiệm vụ mới", kind: "Phiên thực tập" },
        ],
  };
}

/* ------------------------- INTERN: EVALUATIONS ----------------------- */

const EVALUATIONS_MINH: Evaluation[] = [
  {
    id: "ev-3",
    sprint: "Sprint 3",
    instructor: "TS. Phạm Thu Lan",
    aiScore: 8.6,
    finalScore: 8.5,
    comment:
      "Tiến bộ rõ rệt về kỹ năng tích hợp API và độ chủ động khi gỡ lỗi. Nửa sau sprint nên dành 20% thời gian viết test cho luồng kanban nhé.",
    criteria: [
      { label: "Kiến thức kỹ thuật", score: 8.5, max: 10 },
      { label: "Chất lượng code", score: 8.0, max: 10 },
      { label: "Tốc độ", score: 8.5, max: 10 },
      { label: "Giao tiếp", score: 8.0, max: 10 },
      { label: "Trách nhiệm", score: 9.0, max: 10 },
    ],
    finalizedAt: iso(-1, 15, 0),
  },
  {
    id: "ev-2",
    sprint: "Sprint 2",
    instructor: "TS. Phạm Thu Lan",
    aiScore: 8.1,
    finalScore: 8.0,
    comment:
      "Tiến bộ rõ về tư duy component. Lần tới chú ý viết test song song với tính năng thay vì dồn vào cuối sprint nhé.",
    criteria: [
      { label: "Kiến thức kỹ thuật", score: 8.0, max: 10 },
      { label: "Chất lượng code", score: 8.5, max: 10 },
      { label: "Tốc độ", score: 7.5, max: 10 },
      { label: "Giao tiếp & hợp tác", score: 8.0, max: 10 },
    ],
    finalizedAt: iso(-6),
  },
  {
    id: "ev-1",
    sprint: "Sprint 1",
    instructor: "TS. Phạm Thu Lan",
    aiScore: 7.2,
    finalScore: 7.0,
    comment:
      "Khởi đầu ổn. Cần kiểm tra kỹ hơn trước khi gửi review — có vài lỗi nhỏ vốn có thể tránh được.",
    criteria: [
      { label: "Kiến thức kỹ thuật", score: 7.0, max: 10 },
      { label: "Chất lượng code", score: 6.5, max: 10 },
      { label: "Tốc độ", score: 7.5, max: 10 },
      { label: "Giao tiếp & hợp tác", score: 7.0, max: 10 },
      { label: "Trách nhiệm", score: 7.5, max: 10 },
    ],
    finalizedAt: iso(-20),
  },
];

const EVALUATIONS_AN: Evaluation[] = [
  {
    id: "eva-3",
    sprint: "Sprint 4 · Chốt kỳ",
    instructor: "TS. Phạm Thu Lan",
    aiScore: 8.8,
    finalScore: 8.6,
    comment:
      "Kỳ thực tập khép lại rất đẹp. An đã tự chạy được một tính năng lớn end-to-end — giữ đà này cho dự án thật nhé!",
    criteria: [
      { label: "Kiến thức kỹ thuật", score: 8.5, max: 10 },
      { label: "Chất lượng code", score: 8.5, max: 10 },
      { label: "Tốc độ", score: 9.0, max: 10 },
      { label: "Giao tiếp & hợp tác", score: 8.5, max: 10 },
      { label: "Trách nhiệm", score: 9.0, max: 10 },
    ],
    finalizedAt: iso(-14),
  },
  {
    id: "eva-2",
    sprint: "Sprint 3",
    instructor: "TS. Phạm Thu Lan",
    aiScore: 8.2,
    finalScore: 8.0,
    comment:
      "Nắm vững luồng dữ liệu backend cuối kỳ. Nên rút ngắn thời gian tự review PR — chạy checklist trước khi mời người duyệt.",
    criteria: [
      { label: "Kiến thức kỹ thuật", score: 8.0, max: 10 },
      { label: "Chất lượng code", score: 8.0, max: 10 },
      { label: "Tốc độ", score: 8.0, max: 10 },
      { label: "Giao tiếp & hợp tác", score: 8.0, max: 10 },
    ],
    finalizedAt: iso(-41),
  },
  {
    id: "eva-1",
    sprint: "Sprint 2",
    instructor: "TS. Phạm Thu Lan",
    aiScore: 7.9,
    finalScore: 7.6,
    comment:
      "Chất lượng code ổn định và giao tiếp nhóm tốt. Cẩn thận hơn với xử lý null ở đầu ra API — có 2 lỗi thuộc loại này.",
    criteria: [
      { label: "Kiến thức kỹ thuật", score: 7.5, max: 10 },
      { label: "Chất lượng code", score: 7.5, max: 10 },
      { label: "Tốc độ", score: 7.5, max: 10 },
      { label: "Giao tiếp & hợp tác", score: 8.0, max: 10 },
    ],
    finalizedAt: iso(-56),
  },
];

export function evaluationsForIntern(email: string): Evaluation[] {
  const key = classifyIntern(email);
  if (key === "an") return EVALUATIONS_AN;
  // Chưa phân công / kỳ đầu tiên chưa xong sprint — sổ trống.
  if (key === "linh" || key === "vy" || key === "tuan" || key === "hoa") return [];
  return EVALUATIONS_MINH;
}

/* ---------------------------- INTERN: KPI ---------------------------- */

const KPI_MINH: KpiRecord[] = [
  {
    id: "kpi-3",
    period: "Sprint 3 · Tuần 5–6",
    score: 81,
    ruleVersion: "v2.1",
    calculatedAt: iso(-1, 15, 30),
    metrics: [
      { code: "TASK_DONE", label: "Nhiệm vụ hoàn thành đúng hạn", value: 4, display: "4/5 nhiệm vụ", weight: 35, contribution: 28.0 },
      { code: "PR_MERGED", label: "PR được merge không phải sửa lại", value: 86, display: "86%", weight: 25, contribution: 21.5 },
      { code: "REVIEW_GIVEN", label: "Nhận xét review cho đồng nhóm", value: 75, display: "12 PR được nhận xét", weight: 15, contribution: 11.3 },
      { code: "MENTOR_USE", label: "Tương tác AI Mentor hữu ích", value: 68, display: "14 hội thoại", weight: 10, contribution: 6.8 },
      { code: "ON_TIME", label: "Điểm đúng giờ", value: 90, display: "Chuẩn giờ 90%", weight: 15, contribution: 13.5 },
    ],
  },
  {
    id: "kpi-2",
    period: "Sprint 2 · Tuần 3–4",
    score: 74,
    ruleVersion: "v2.1",
    calculatedAt: iso(-6),
    metrics: [
      { code: "TASK_DONE", label: "Nhiệm vụ hoàn thành đúng hạn", value: 3, display: "3/4 nhiệm vụ", weight: 35, contribution: 26.3 },
      { code: "PR_MERGED", label: "PR được merge không phải sửa lại", value: 70, display: "70%", weight: 25, contribution: 17.5 },
      { code: "REVIEW_GIVEN", label: "Nhận xét review cho đồng nhóm", value: 62, display: "8 PR được nhận xét", weight: 15, contribution: 9.3 },
      { code: "MENTOR_USE", label: "Tương tác AI Mentor hữu ích", value: 74, display: "11 hội thoại", weight: 10, contribution: 7.4 },
      { code: "ON_TIME", label: "Điểm đúng giờ", value: 87, display: "Chuẩn giờ 87%", weight: 15, contribution: 13.1 },
    ],
  },
  {
    id: "kpi-1",
    period: "Sprint 1 · Tuần 1–2",
    score: 68,
    ruleVersion: "v2.1",
    calculatedAt: iso(-20),
    metrics: [
      { code: "TASK_DONE", label: "Nhiệm vụ hoàn thành đúng hạn", value: 2, display: "2/3 nhiệm vụ", weight: 35, contribution: 23.3 },
      { code: "PR_MERGED", label: "PR được merge không phải sửa lại", value: 64, display: "64%", weight: 25, contribution: 16.0 },
      { code: "REVIEW_GIVEN", label: "Nhận xét review cho đồng nhóm", value: 50, display: "6 PR được nhận xét", weight: 15, contribution: 7.5 },
      { code: "MENTOR_USE", label: "Tương tác AI Mentor hữu ích", value: 85, display: "9 hội thoại", weight: 10, contribution: 8.5 },
      { code: "ON_TIME", label: "Điểm đúng giờ", value: 85, display: "Chuẩn giờ 85%", weight: 15, contribution: 12.8 },
    ],
  },
];

const KPI_AN: KpiRecord[] = [
  {
    id: "kpi-a3",
    period: "Kỳ cuối · Tổng hợp 4 sprint",
    score: 88,
    ruleVersion: "v2.1",
    calculatedAt: iso(-13),
    metrics: [
      { code: "TASK_DONE", label: "Nhiệm vụ hoàn thành đúng hạn", value: 20, display: "20/21 nhiệm vụ", weight: 35, contribution: 33.3 },
      { code: "PR_MERGED", label: "PR được merge không phải sửa lại", value: 88, display: "88%", weight: 25, contribution: 22.0 },
      { code: "REVIEW_GIVEN", label: "Nhận xét review cho đồng nhóm", value: 82, display: "27 PR được nhận xét", weight: 15, contribution: 12.3 },
      { code: "MENTOR_USE", label: "Tương tác AI Mentor hữu ích", value: 55, display: "24 hội thoại", weight: 10, contribution: 5.5 },
      { code: "ON_TIME", label: "Điểm đúng giờ", value: 94, display: "Chuẩn giờ 94%", weight: 15, contribution: 14.1 },
    ],
  },
  {
    id: "kpi-a2",
    period: "Sprint 4 · Tuần 7–8",
    score: 85,
    ruleVersion: "v2.1",
    calculatedAt: iso(-27),
    metrics: [
      { code: "TASK_DONE", label: "Nhiệm vụ hoàn thành đúng hạn", value: 5, display: "5/5 nhiệm vụ", weight: 35, contribution: 35.0 },
      { code: "PR_MERGED", label: "PR được merge không phải sửa lại", value: 82, display: "82%", weight: 25, contribution: 20.5 },
      { code: "REVIEW_GIVEN", label: "Nhận xét review cho đồng nhóm", value: 75, display: "15 PR được nhận xét", weight: 15, contribution: 11.3 },
      { code: "MENTOR_USE", label: "Tương tác AI Mentor hữu ích", value: 50, display: "8 hội thoại", weight: 10, contribution: 5.0 },
      { code: "ON_TIME", label: "Điểm đúng giờ", value: 89, display: "Chuẩn giờ 89%", weight: 15, contribution: 13.4 },
    ],
  },
  {
    id: "kpi-a1",
    period: "Sprint 3 · Tuần 5–6",
    score: 78,
    ruleVersion: "v2.1",
    calculatedAt: iso(-41),
    metrics: [
      { code: "TASK_DONE", label: "Nhiệm vụ hoàn thành đúng hạn", value: 4, display: "4/5 nhiệm vụ", weight: 35, contribution: 28.0 },
      { code: "PR_MERGED", label: "PR được merge không phải sửa lại", value: 78, display: "78%", weight: 25, contribution: 19.5 },
      { code: "REVIEW_GIVEN", label: "Nhận xét review cho đồng nhóm", value: 75, display: "12 PR được nhận xét", weight: 15, contribution: 11.3 },
      { code: "MENTOR_USE", label: "Tương tác AI Mentor hữu ích", value: 48, display: "7 hội thoại", weight: 10, contribution: 4.8 },
      { code: "ON_TIME", label: "Điểm đúng giờ", value: 96, display: "Chuẩn giờ 96%", weight: 15, contribution: 14.4 },
    ],
  },
];

const KPI_HOA: KpiRecord[] = [
  {
    id: "kpi-h1",
    period: "Sprint 1 · Tuần 1 (tạm tính)",
    score: 62,
    ruleVersion: "v2.1",
    calculatedAt: iso(0, 7, 0),
    metrics: [
      { code: "TASK_DONE", label: "Nhiệm vụ hoàn thành đúng hạn", value: 2, display: "2/3 nhiệm vụ (tạm tính)", weight: 35, contribution: 23.3 },
      { code: "PR_MERGED", label: "PR được merge không phải sửa lại", value: 50, display: "50%", weight: 25, contribution: 12.5 },
      { code: "REVIEW_GIVEN", label: "Nhận xét review cho đồng nhóm", value: 40, display: "2 PR được nhận xét", weight: 15, contribution: 6.0 },
      { code: "MENTOR_USE", label: "Tương tác AI Mentor hữu ích", value: 90, display: "3 hội thoại", weight: 10, contribution: 9.0 },
      { code: "ON_TIME", label: "Điểm đúng giờ", value: 75, display: "Chuẩn giờ 75%", weight: 15, contribution: 11.3 },
    ],
  },
];

export function kpiForIntern(email: string): KpiRecord[] {
  const key = classifyIntern(email);
  if (key === "an") return KPI_AN;
  if (key === "hoa") return KPI_HOA;
  // Chưa phân công / bị khóa — chưa có kỳ KPI nào.
  if (key === "linh" || key === "vy" || key === "tuan") return [];
  return KPI_MINH;
}

/* ------------------------ INTERN: LƯƠNG ẢO --------------------------- */

const SALARY_MINH: SalaryEntry[] = [
  { id: "sal-8", at: iso(-1, 10, 15), type: "Thưởng", amount: 250_000, note: "Góp ý cải thiện luồng review được ghi nhận", period: "Sprint 3 · Tuần 5–6" },
  { id: "sal-7", at: iso(-6, 1, 0), type: "KPI", amount: 2_180_000, note: "Sprint 2 · 74 điểm", period: "Sprint 2 · Tuần 3–4" },
  { id: "sal-6", at: iso(-7, 9, 0), type: "Thưởng", amount: 400_000, note: "PR #135 được highlight tuần Sprint 2", period: "Sprint 2 · Tuần 3–4" },
  { id: "sal-5", at: iso(-9, 9, 0), type: "Điều chỉnh", amount: 180_000, note: "Trợ cấp đi lại buổi onsite" },
  { id: "sal-4", at: iso(-16, 9, 0), type: "Thưởng", amount: 250_000, note: "Top tương tác AI Mentor tuần 3–4", period: "Sprint 2 · Tuần 3–4" },
  { id: "sal-3", at: iso(-20, 1, 0), type: "KPI", amount: 1_960_000, note: "Sprint 1 · 68 điểm", period: "Sprint 1 · Tuần 1–2" },
  { id: "sal-2", at: iso(-22, 9, 0), type: "Điều chỉnh", amount: 400_000, note: "Trợ giá kỳ thực tập đầu tiên" },
  { id: "sal-1", at: iso(-25, 9, 0), type: "Thưởng", amount: 300_000, note: "Hoàn thành sớm nhiệm vụ khung FE-101", period: "Sprint 1 · Tuần 1–2" },
  { id: "sal-0", at: iso(-28, 9, 0), type: "Điều chỉnh", amount: 120_000, note: "Điểm danh đủ 10 buổi đầu tiên" },
];

const SALARY_AN: SalaryEntry[] = [
  { id: "sal-a7", at: iso(-13, 1, 0), type: "KPI", amount: 2_640_000, note: "Tổng hợp KPI kỳ cuối · 88 điểm", period: "Kỳ cuối · Tổng hợp 4 sprint" },
  { id: "sal-a6", at: iso(-27, 1, 0), type: "KPI", amount: 2_550_000, note: "Sprint 4 · 85 điểm", period: "Sprint 4 · Tuần 7–8" },
  { id: "sal-a5", at: iso(-40, 9, 0), type: "Thưởng", amount: 450_000, note: "PR được highlight tuần cuối kỳ", period: "Sprint 4 · Tuần 7–8" },
  { id: "sal-a4", at: iso(-41, 1, 0), type: "KPI", amount: 2_340_000, note: "Sprint 3 · 78 điểm", period: "Sprint 3 · Tuần 5–6" },
  { id: "sal-a3", at: iso(-55, 9, 0), type: "Thưởng", amount: 350_000, note: "PR được highlight giữa kỳ", period: "Sprint 3 · Tuần 5–6" },
  { id: "sal-a2", at: iso(-56, 1, 0), type: "KPI", amount: 2_200_000, note: "Sprint 2 · 73 điểm", period: "Sprint 2 · Tuần 3–4" },
  { id: "sal-a1", at: iso(-70, 1, 0), type: "KPI", amount: 1_980_000, note: "Sprint 1 · 66 điểm", period: "Sprint 1 · Tuần 1–2" },
  { id: "sal-a0", at: iso(-72, 9, 0), type: "Điều chỉnh", amount: 400_000, note: "Trợ giá kỳ thực tập đầu tiên" },
];

const SALARY_HOA: SalaryEntry[] = [
  { id: "sal-h2", at: iso(0, 8, 0), type: "Thưởng", amount: 200_000, note: "Điểm danh đủ tuần đầu tiên" },
  { id: "sal-h1", at: iso(-1, 9, 0), type: "Điều chỉnh", amount: 120_000, note: "Trợ cấp đi lại nhóm sáng thứ 4" },
  { id: "sal-h0", at: iso(-2, 10, 0), type: "Điều chỉnh", amount: 400_000, note: "Trợ giá kỳ thực tập đầu tiên" },
];

export function salaryForIntern(email: string): SalaryEntry[] {
  const key = classifyIntern(email);
  if (key === "an") return SALARY_AN;
  if (key === "hoa") return SALARY_HOA;
  // Chưa phân công / bị khóa — chưa có giao dịch nào.
  if (key === "linh" || key === "vy" || key === "tuan") return [];
  return SALARY_MINH;
}

/* ------------------------ INTERN: CHỨNG NHẬN ------------------------ */

export function certificatesForIntern(email: string): Certificate[] {
  if (email.includes("an.pham")) {
    return [
      {
        id: "crt-1",
        code: "CRT-2026-0042",
        project: "Sổ tay hành trình thực tập số",
        session: "SS-2026-01 · Khóa 2026",
        issuedAt: iso(-12),
        verifyCode: "VINT-2026-QX4T8N",
        status: "valid",
      },
      {
        id: "crt-2",
        code: "CRT-2026-0043",
        project: "Chứng nhận component · Micro-credential",
        session: "SS-2026-01 · Khóa 2026",
        issuedAt: iso(-11),
        verifyCode: "VINT-2026-LM2K9P",
        status: "revoked",
      },
    ];
  }
  return [];
}

/* -------------------------- INTERN: AI MENTOR ------------------------ */

const MENTOR_MINH: MentorConversation[] = [
  {
    id: "mc-1",
    title: "Cách chia component UI",
    archived: false,
    messages: [
      { id: "mm-1", from: "ai", text: "Chào Minh! Hôm nay mình thấy bạn mở nhánh FE-106 — muốn hỏi gì về cách chia component cho trang này?", at: iso(-1, 9, 0) },
      { id: "mm-2", from: "me", text: "Mình nên tách component thế nào để danh sách nhiệm vụ không render lại toàn bộ khi kéo thả giữa các cột?", at: iso(-1, 9, 2) },
      { id: "mm-3", from: "ai", text: "Gợi ý nhỏ: dùng React.memo cho từng thẻ + truyền key ổn định (id nhiệm vụ, không dùng index). Vùng animate chỉ nên bọc phần xuất hiện, đừng bọc cả danh sách.", at: iso(-1, 9, 3) },
      { id: "mm-4", from: "me", text: "Nếu trạng thái của một thẻ nằm ở board cha thì mình truyền xuống kiểu nào cho sạch?", at: iso(-1, 9, 5) },
      { id: "mm-5", from: "ai", text: "Hãy giữ state cột ở board, còn state riêng của thẻ (đang kéo, hover) để trong thẻ. Props vào là dữ liệu tối thiểu — một component lo một việc.", at: iso(-1, 9, 6) },
      { id: "mm-6", from: "me", text: "OK. Vậy component cha có nên dùng context để tránh truyền prop qua 3 tầng?", at: iso(-1, 9, 8) },
      { id: "mm-7", from: "ai", text: "Chỉ khi dữ liệu thật sự dùng ở nhiều nhánh. Nếu nằm trong một nhánh cây UI, đừng đẩy lên context toàn cục — props rõ ràng dễ test hơn.", at: iso(-1, 9, 9) },
      { id: "mm-8", from: "me", text: "Tớ gắng áp dụng vào FE-106 chiều nay, cảm ơn mentor!", at: iso(-1, 9, 10) },
    ],
  },
  {
    id: "mc-2",
    title: "Kanban kéo–thả với dnd-kit",
    archived: false,
    messages: [
      { id: "mm-10", from: "ai", text: "Hôm qua bạn hỏi về kanban kéo–thả — mình có mặt đây. Bạn đang kẹt chỗ nào?", at: iso(-2, 14, 0) },
      { id: "mm-11", from: "me", text: "DragOverlay có cần thiết không, hay dùng transform trực tiếp trên thẻ gốc?", at: iso(-2, 14, 1) },
      { id: "mm-12", from: "ai", text: "Nên dùng DragOverlay: bản thẻ gốc giữ chỗ (không giật layout), bản overlay bay theo con trỏ. Đây là pattern chính thức của dnd-kit cho sortable list.", at: iso(-2, 14, 2) },
      { id: "mm-13", from: "me", text: "Thả vào cột Chờ duyệt thì mở luồng nộp bài — side effect nên xử lý ở đâu cho đúng?", at: iso(-2, 14, 4) },
      { id: "mm-14", from: "ai", text: "Đặt trong onDragEnd: tính cột đích từ over.id, gọi action store rồi mới mở dialog nộp bài. Đừng để logic nằm trong render.", at: iso(-2, 14, 5) },
      { id: "mm-15", from: "me", text: "Điều khiển bàn phím thì gợi ý thế nào? Tớ sợ viết test tốn thời gian.", at: iso(-2, 14, 7) },
      { id: "mm-16", from: "ai", text: "dnd-kit có sẵn KeyboardSensor: Tab vào thẻ, Enter để nhặt, mũi tên đổi cột, Esc để bỏ. Bạn chỉ cần bật sensor và viết test đúng hành vi đó.", at: iso(-2, 14, 8) },
      { id: "mm-17", from: "me", text: "Nghe hợp lý — tớ sẽ thêm KeyboardSensor vào FE-102 hôm nay.", at: iso(-2, 14, 9) },
    ],
  },
  {
    id: "mc-3",
    title: "Tối ưu API fetch và hủy request",
    archived: false,
    messages: [
      { id: "mm-20", from: "ai", text: "Chào buổi sáng! Hôm nay muốn hỏi về API hay về component?", at: iso(-3, 10, 0) },
      { id: "mm-21", from: "me", text: "Khi người dùng lọc lại danh sách nhiệm vụ, request cũ đôi khi về sau và ghi đè dữ liệu mới. Xử lý sao?", at: iso(-3, 10, 2) },
      { id: "mm-22", from: "ai", text: "Dùng AbortController: trước mỗi fetch mới thì abort() request cũ. Ngoài ra kiểm tra schema response trước khi render theo adapter pattern dự án đang dùng.", at: iso(-3, 10, 3) },
      { id: "mm-23", from: "me", text: "Còn nhánh lỗi và nhánh rỗng thì nên render gì cho gọn?", at: iso(-3, 10, 5) },
      { id: "mm-24", from: "ai", text: "Nhánh lỗi hiển thị thông điệp + nút thử lại; nhánh rỗng hiển thị empty state có ý nghĩa (không chỉ chữ 'không có dữ liệu'). Cả hai nên là component riêng để tái dùng.", at: iso(-3, 10, 6) },
      { id: "mm-25", from: "me", text: "Tớ cũng muốn cache response 30 giây — có cần thêm thư viện không?", at: iso(-3, 10, 8) },
      { id: "mm-26", from: "ai", text: "Với dữ liệu hiện tại, một Map + timestamp là đủ. Chỉ thêm thư viện khi có yêu cầu invalidation phức tạp — đừng tải đồ sớm quá.", at: iso(-3, 10, 9) },
    ],
  },
  {
    id: "mc-4",
    title: "Tuần trước · Kế hoạch học test",
    archived: true,
    messages: [
      { id: "mm-30", from: "ai", text: "Bạn nói muốn học viết test — mình gợi ý lộ trình 3 buổi nhé.", at: iso(-9, 10, 0) },
      { id: "mm-31", from: "me", text: "OK tớ nghe.", at: iso(-9, 10, 1) },
      { id: "mm-32", from: "ai", text: "Buổi 1: test logic thuần (hàm đổi trạng thái nhiệm vụ). Buổi 2: component với Testing Library — query như người dùng nhìn. Buổi 3: lồng vào CI để chạy tự động.", at: iso(-9, 10, 2) },
      { id: "mm-33", from: "me", text: "Test có cần viết cho mọi component không?", at: iso(-9, 10, 4) },
      { id: "mm-34", from: "ai", text: "Không. Mỗi test nên gắn với một hành vi thật. Đừng viết test chỉ để cho có — tỉ lệ phủ cũng chỉ là một số liệu.", at: iso(-9, 10, 5) },
      { id: "mm-35", from: "me", text: "Tớ sẽ bắt đầu với hàm chuyển cột kanban.", at: iso(-9, 10, 6) },
      { id: "mm-36", from: "ai", text: "Lựa chọn tốt! Xong 6 ca kiểm thử đầu thì mang đến đây, mình review cùng.", at: iso(-9, 10, 7) },
    ],
  },
];

const MENTOR_AN: MentorConversation[] = [
  {
    id: "mc-a1",
    title: "Tổng kết kỳ thực tập",
    archived: true,
    messages: [
      { id: "mma-1", from: "ai", text: "Kỳ của bạn khép lại với KPI 88. Muốn tổng kết gì cùng mình?", at: iso(-15, 9, 0) },
      { id: "mma-2", from: "me", text: "Điểm mình nên giữ và nên sửa khi đi làm thật?", at: iso(-15, 9, 2) },
      { id: "mma-3", from: "ai", text: "Giữ: kỷ luật commit và tốc độ học. Cải thiện: viết tài liệu song song với code — đồng nghiệp sau này sẽ cảm ơn bạn.", at: iso(-15, 9, 3) },
      { id: "mma-4", from: "me", text: "Cảm ơn mentor đã đồng hành suốt 8 tuần!", at: iso(-15, 9, 5) },
    ],
  },
  {
    id: "mc-a2",
    title: "Chuẩn bị phỏng vấn thật",
    archived: true,
    messages: [
      { id: "mma-5", from: "me", text: "Phỏng vấn junior frontend thường hỏi gì đầu tiên?", at: iso(-13, 16, 0) },
      { id: "mma-6", from: "ai", text: "Thường là flexbox/grid, sau đó rendering list + key. Bạn đã làm kanban — dùng chính dự án này để dẫn chứng.", at: iso(-13, 16, 1) },
      { id: "mma-7", from: "me", text: "OK tớ sẽ ôn lại 2 chủ đề đó tuần này.", at: iso(-13, 16, 2) },
    ],
  },
];

const MENTOR_HOA: MentorConversation[] = [
  {
    id: "mc-h1",
    title: "Câu hỏi đầu tiên ở Sprint 1",
    archived: false,
    messages: [
      { id: "mmh-1", from: "ai", text: "Chào mừng Hòa đến với kỳ thực tập đầu tiên! Mình là AI Mentor — cứ hỏi bất cứ điều gì về dự án 'Cổng thông tin sự nghiệp UEH' nhé.", at: iso(0, 9, 0) },
      { id: "mmh-2", from: "me", text: "Tuần đầu tiên em nên bắt đầu đọc gì trước ạ?", at: iso(0, 9, 3) },
    ],
  },
];

const MENTOR_WAITING: MentorConversation[] = [
  {
    id: "mc-w1",
    title: "Chờ phân công dự án",
    archived: false,
    messages: [
      { id: "mmw-1", from: "me", text: "Em đã đậu phỏng vấn được hơn tuần rồi, bao giờ mới được phân công dự án?", at: iso(-1, 20, 0) },
      { id: "mmw-2", from: "ai", text: "Nhóm vận hành xếp hàng theo đợt — thường 1–2 tuần. Bạn đang ở hàng chờ SS-2026-04, dự kiến khởi động tuần sau.", at: iso(-1, 20, 1) },
      { id: "mmw-3", from: "me", text: "Trong lúc chờ em nên học gì?", at: iso(-1, 20, 3) },
      { id: "mmw-4", from: "ai", text: "Ôn git rebase và đọc tài liệu design system của nền tảng — 2 thứ đó dùng ngay tuần đầu. Khi có dự án, mình sẽ nhắc bạn nhé.", at: iso(-1, 20, 4) },
    ],
  },
];

export function mentorForIntern(email: string): MentorConversation[] {
  const key = classifyIntern(email);
  if (key === "an") return MENTOR_AN;
  if (key === "hoa") return MENTOR_HOA;
  if (key === "linh" || key === "vy" || key === "tuan") return MENTOR_WAITING;
  return MENTOR_MINH;
}

/* --------------------------- INSTRUCTOR ------------------------------ */

export const INSTRUCTOR_SESSIONS: InstructorSession[] = [
  {
    id: "ss-1",
    code: "SS-2026-01",
    project: "Sổ tay hành trình thực tập số",
    members: 5,
    memberNames: ["Nguyễn Minh", "Lê Hoàng", "Phan Chi", "Đỗ Kha", "Trịnh Gia Bảo"],
    memberDetails: [
      { name: "Nguyễn Minh", email: "minh.nguyen@student.edu.vn", assignmentStatus: "active" },
      { name: "Lê Hoàng", email: "hoang.le@student.edu.vn", assignmentStatus: "active" },
      { name: "Phan Chi", email: "chi.phan@student.edu.vn", assignmentStatus: "active" },
      { name: "Đỗ Kha", email: "kha.do@student.edu.vn", assignmentStatus: "active" },
      { name: "Trịnh Gia Bảo", email: "bao.trinh@student.edu.vn", assignmentStatus: "active" },
    ],
    sprint: "Sprint 3",
    sprintStatus: "Đang diễn ra · Tuần 1/2",
    progress: 58,
    startDate: day(-34),
    endDate: day(22),
    status: "active",
  },
  {
    id: "ss-2",
    code: "SS-2026-02",
    project: "Kho tri thức Agent nội bộ",
    members: 5,
    memberNames: ["Nguyễn Minh", "Vũ Thanh", "Bùi Diễm", "Ngô Phong", "Trương Mỹ Nhi"],
    memberDetails: [
      { name: "Nguyễn Minh", email: "minh.nguyen@student.edu.vn", assignmentStatus: "active" },
      { name: "Vũ Thanh", email: "thanh.vu@student.edu.vn", assignmentStatus: "active" },
      { name: "Bùi Diễm", email: "diem.bui@student.edu.vn", assignmentStatus: "active" },
      { name: "Ngô Phong", email: "phong.ngo@student.edu.vn", assignmentStatus: "active" },
      { name: "Trương Mỹ Nhi", email: "nhi.truong@student.edu.vn", assignmentStatus: "active" },
    ],
    sprint: "Sprint 5",
    sprintStatus: "Đang diễn ra · Tuần 2/2",
    progress: 76,
    startDate: day(-48),
    endDate: day(8),
    status: "active",
  },
  {
    id: "ss-3",
    code: "SS-2026-04",
    project: "Cổng thông tin sự nghiệp UEH",
    members: 6,
    memberNames: ["Trần Bảo Linh", "Đặng Khánh Vy", "Tôn Nữ Mai", "Hà Vy", "Trịnh Khanh", "Lý Tường"],
    memberDetails: [
      { name: "Trần Bảo Linh", email: "linh.tran@student.edu.vn", assignmentStatus: "active" },
      { name: "Đặng Khánh Vy", email: "vy.dang@student.edu.vn", assignmentStatus: "active" },
      { name: "Tôn Nữ Mai", email: "mai.tonnu@student.edu.vn", assignmentStatus: "active" },
      { name: "Hà Vy", email: "vy.ha@student.edu.vn", assignmentStatus: "active" },
      { name: "Trịnh Khanh", email: "khanh.trinh@student.edu.vn", assignmentStatus: "active" },
      { name: "Lý Tường", email: "tuong.ly@student.edu.vn", assignmentStatus: "active" },
    ],
    sprint: "Sprint 1",
    sprintStatus: "Chưa mở — khởi động sau 9 ngày",
    progress: 0,
    startDate: day(9),
    endDate: day(51),
    status: "upcoming",
  },
  {
    id: "ss-4",
    code: "SS-2025-11",
    project: "Cổng xác minh chứng nhận",
    members: 6,
    memberNames: ["Tôn Nữ Mai", "Hà Vy", "Trịnh Khanh", "Dương Thiện", "Lý Tường", "Cao Uyên"],
    memberDetails: [
      { name: "Tôn Nữ Mai", email: "mai.tonnu@student.edu.vn", assignmentStatus: "completed" },
      { name: "Hà Vy", email: "vy.ha@student.edu.vn", assignmentStatus: "completed" },
      { name: "Trịnh Khanh", email: "khanh.trinh@student.edu.vn", assignmentStatus: "completed" },
      { name: "Dương Thiện", email: "thien.duong@student.edu.vn", assignmentStatus: "completed" },
      { name: "Lý Tường", email: "tuong.ly@student.edu.vn", assignmentStatus: "completed" },
      { name: "Cao Uyên", email: "uyen.cao@student.edu.vn", assignmentStatus: "completed" },
    ],
    sprint: "Kết thúc",
    sprintStatus: "Đã chốt KPI",
    progress: 100,
    startDate: day(-120),
    endDate: day(-28),
    status: "closed",
  },
];

export const INSTRUCTOR_SPRINT_BOARD: SprintBoard = {
  id: "sp-3",
  name: "Sprint 3 · SS-2026-01",
  goal: "Hoàn thiện bảng Kanban cá nhân và API nhiệm vụ",
  week: "Tuần 1/2",
  daysLeft: 9,
  status: "active",
  columns: [
    {
      key: "todo",
      label: "Cần làm",
      tasks: [
        { id: "sb-1", code: "FE-105", title: "Trang thông báo phân loại theo nhóm", status: "todo", assignee: "Nguyễn Minh", priority: "medium", points: 5 },
        { id: "sb-2", code: "FE-107", title: "Khung thoại AI Mentor phiên bản di động", status: "todo", assignee: "Nguyễn Minh", priority: "high", points: 8 },
        { id: "sb-3", code: "FE-108", title: "Tối ưu cuộn danh sách nhiệm vụ", status: "todo", assignee: "Nguyễn Minh", priority: "low", points: 3 },
        { id: "sb-4", code: "BE-202", title: "Seed dữ liệu mẫu cho môi trường demo", status: "todo", assignee: "Phan Chi", priority: "medium", points: 3 },
      ],
    },
    {
      key: "doing",
      label: "Đang làm",
      tasks: [
        { id: "sb-5", code: "FE-102", title: "Kanban cá nhân kéo–thả với 4 cột", status: "doing", assignee: "Nguyễn Minh", priority: "urgent", points: 8 },
        { id: "sb-6", code: "FE-106", title: "Tích hợp API danh sách nhiệm vụ vào Kanban", status: "doing", assignee: "Nguyễn Minh", priority: "high", points: 5 },
        { id: "sb-7", code: "FE-110", title: "Khu vực hồ sơ thành viên", status: "doing", assignee: "Đỗ Kha", priority: "high", points: 5 },
      ],
    },
    {
      key: "review",
      label: "Chờ duyệt",
      tasks: [
        { id: "sb-8", code: "API-201", title: "API danh sách nhiệm vụ kèm bộ lọc", status: "review", assignee: "Nguyễn Minh", priority: "high", points: 5 },
        { id: "sb-9", code: "FE-103", title: "Hiệu ứng reveal cuộn cho danh sách", status: "review", assignee: "Nguyễn Minh", priority: "medium", points: 3 },
        { id: "sb-10", code: "BE-190", title: "Webhook sự kiện nộp bài", status: "review", assignee: "Phan Chi", priority: "high", points: 8 },
      ],
    },
    {
      key: "done",
      label: "Hoàn thành",
      tasks: [
        { id: "sb-11", code: "FE-101", title: "Xây dựng layout khung sổ tay", status: "done", assignee: "Nguyễn Minh", priority: "high", points: 5 },
        { id: "sb-12", code: "QA-301", title: "Bộ kiểm thử tương tác kanban", status: "done", assignee: "Nguyễn Minh", priority: "medium", points: 3 },
        { id: "sb-13", code: "QA-305", title: "Sửa lỗi kéo–thả Kanban trên Safari", status: "done", assignee: "Nguyễn Minh", priority: "medium", points: 2 },
        { id: "sb-14", code: "FE-100", title: "Bộ icon nét chì dùng chung", status: "done", assignee: "Đỗ Kha", priority: "medium", points: 5 },
      ],
    },
  ],
  burndown: [68, 68, 67, 65, 63, 61, 60, 58, 57, 55, 54, 53, 53, 53],
};

/* --------- SPRINTS: vòng đời đầy đủ (codex: sprint lifecycle) ---------- */

export const INSTRUCTOR_SPRINTS: Sprint[] = [
  {
    id: "sp-3",
    sessionId: "ss-1",
    name: "Sprint 3",
    goal: "Hoàn thiện bảng Kanban cá nhân và API nhiệm vụ",
    startsAt: day(-5),
    endsAt: day(9),
    status: "active",
    totalTasks: 14,
    openTasks: 10,
  },
  {
    id: "sp-4",
    sessionId: "ss-1",
    name: "Sprint 4",
    goal: "Ra mắt bản demo giữa kỳ cho giảng viên phản hồi",
    startsAt: day(10),
    endsAt: day(23),
    status: "planned",
    totalTasks: 0,
    openTasks: 0,
  },
  {
    id: "sp-5",
    sessionId: "ss-2",
    name: "Sprint 5",
    goal: "Tích hợp tìm kiếm ngữ nghĩa cho kho tri thức",
    startsAt: day(-6),
    endsAt: day(8),
    status: "active",
    totalTasks: 12,
    openTasks: 4,
  },
  {
    id: "sp-2",
    sessionId: "ss-1",
    name: "Sprint 2",
    goal: "Xây khung giao diện sổ tay và component dùng chung",
    startsAt: day(-19),
    endsAt: day(-6),
    status: "completed",
    totalTasks: 11,
    openTasks: 0,
  },
  {
    id: "sp-1",
    sessionId: "ss-1",
    name: "Sprint 1",
    goal: "Khởi tạo dự án, cấu hình CI và quy tắc làm việc",
    startsAt: day(-33),
    endsAt: day(-20),
    status: "completed",
    totalTasks: 8,
    openTasks: 0,
  },
  {
    id: "sp-6",
    sessionId: "ss-3",
    name: "Sprint 1",
    goal: "Phân tích yêu cầu và thiết kế cơ sở dữ liệu ban đầu",
    startsAt: day(9),
    endsAt: day(22),
    status: "planned",
    totalTasks: 0,
    openTasks: 0,
  },
];

const SESSION_STATUS_LABEL: Record<SessionStatus, string> = {
  active: "Đang diễn ra",
  upcoming: "Sắp khởi động",
  ending: "Sắp kết thúc",
  closed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

const SPRINT_STATUS_LABEL: Record<SprintStatus, string> = {
  planned: "Đã lập kế hoạch",
  active: "Đang diễn ra",
  completed: "Đã hoàn thành",
  cancelled: "Đã hủy",
};

export function sessionStatusLabel(status: SessionStatus): string {
  return SESSION_STATUS_LABEL[status] ?? status;
}

export function sprintStatusLabel(status: SprintStatus): string {
  return SPRINT_STATUS_LABEL[status] ?? status;
}

/** Codex sessionTransitions: các trạng thái kế tiếp hợp lệ của phiên.
 *  "closed" = đã hoàn thành (tương đương completed của codex). */
export function sessionTransitions(status: SessionStatus): SessionStatus[] {
  switch (status) {
    case "upcoming":
      return ["cancelled"];
    case "active":
      return ["ending", "closed", "cancelled"];
    case "ending":
      return ["closed", "cancelled"];
    default:
      return [];
  }
}

/** Codex sprintTransitions: planned → active; active → completed/cancelled. */
export function sprintTransitions(status: SprintStatus): SprintStatus[] {
  switch (status) {
    case "planned":
      return ["active", "cancelled"];
    case "active":
      return ["completed", "cancelled"];
    default:
      return [];
  }
}

/** Đổi trạng thái phiên (codex: SessionLifecycleActions). */
export function transitionSession(
  sessionId: string,
  next: SessionStatus,
): { session: InstructorSession } {
  const session = INSTRUCTOR_SESSIONS.find((s) => s.id === sessionId);
  if (!session) throw new Error("Không tìm thấy phiên thực tập này.");
  const choices = sessionTransitions(session.status);
  if (!choices.includes(next)) {
    throw new Error(
      `Không thể chuyển phiên từ "${sessionStatusLabel(session.status)}" sang "${sessionStatusLabel(next)}".`,
    );
  }
  session.status = next;
  if (next === "closed") {
    session.progress = 100;
    session.sprintStatus = "Đã hoàn thành — lịch sử được giữ lại";
  } else if (next === "cancelled") {
    session.sprintStatus = "Đã hủy — lịch sử được giữ lại";
  } else if (next === "ending") {
    session.sprintStatus = `${session.sprintStatus} · Sắp kết thúc`;
  }
  pushNotification("instructor", {
    category: "Phiên thực tập",
    title: `${session.code} — ${sessionStatusLabel(next)}`,
    body:
      next === "closed"
        ? "Phiên đã hoàn thành. Nhiệm vụ, đánh giá và lịch sử phân công được giữ lại."
        : next === "cancelled"
          ? "Phiên đã hủy theo xác nhận của giảng viên. Lịch sử được giữ lại để đối chiếu."
          : "Phiên chuyển sang giai đoạn sắp kết thúc — kiểm soát tiến độ các phân công còn lại.",
  });
  return { session };
}

/** Hoàn thành phân công của một sinh viên trong phiên (codex: AssignmentCompletion). */
export function completeAssignment(
  sessionId: string,
  memberEmail: string,
): { member: SessionMember } {
  const session = INSTRUCTOR_SESSIONS.find((s) => s.id === sessionId);
  if (!session) throw new Error("Không tìm thấy phiên thực tập này.");
  if (!["active", "ending", "closed"].includes(session.status)) {
    throw new Error("Phiên đã đóng hoặc bị hủy — không thể đổi trạng thái phân công.");
  }
  const member = session.memberDetails.find(
    (m) => m.email.toLowerCase() === memberEmail.toLowerCase(),
  );
  if (!member) throw new Error("Thành viên không nằm trong phiên này.");
  if (member.assignmentStatus !== "active") {
    throw new Error(
      "Phân công của thành viên này đã kết thúc. Hãy tải lại danh sách để đối chiếu.",
    );
  }
  member.assignmentStatus = "completed";
  pushNotification("instructor", {
    category: "Phiên thực tập",
    title: `Phân công đã hoàn thành — ${member.name}`,
    body: `${member.name} đã hoàn tất công việc được giao trong ${session.code}. Thành viên, bài nộp và lịch sử của phiên được giữ lại.`,
  });
  return { member };
}

/** Đổi trạng thái sprint (codex: SprintLifecycleActions). */
export function transitionSprint(
  sprintId: string,
  next: SprintStatus,
): { sprint: Sprint } {
  const sprint = INSTRUCTOR_SPRINTS.find((s) => s.id === sprintId);
  if (!sprint) throw new Error("Không tìm thấy Sprint này.");
  const choices = sprintTransitions(sprint.status);
  if (!choices.includes(next)) {
    throw new Error(
      `Sprint đã ${sprintStatusLabel(sprint.status).toLowerCase()} — không thể chuyển sang trạng thái mới.`,
    );
  }
  if (next === "completed" && sprint.openTasks > 0) {
    throw new Error(
      "Sprint còn nhiệm vụ chưa hoàn thành. Hãy xử lý hết trước khi kết thúc Sprint.",
    );
  }
  sprint.status = next;
  // Đồng bộ bảng Kanban + phiên chứa sprint này.
  if (INSTRUCTOR_SPRINT_BOARD.id === sprintId) {
    INSTRUCTOR_SPRINT_BOARD.status = next;
    if (next === "cancelled" || next === "completed") {
      INSTRUCTOR_SPRINT_BOARD.week = next === "completed" ? "Hoàn thành" : "Đã hủy";
    }
  }
  const session = INSTRUCTOR_SESSIONS.find((s) => s.id === sprint.sessionId);
  if (session && session.sprint === sprint.name) {
    if (next === "active") session.sprintStatus = "Đang diễn ra";
    else if (next === "completed") session.sprintStatus = "Đã hoàn thành — chờ chốt KPI";
    else if (next === "cancelled") session.sprintStatus = "Sprint đã hủy";
  }
  pushNotification("instructor", {
    category: "Nhiệm vụ",
    title: `${sprint.name} (${session?.code ?? sprint.sessionId}) — ${sprintStatusLabel(next)}`,
    body:
      next === "completed"
        ? "Sprint đã hoàn thành. Điểm KPI của kỳ này sẵn sàng để tính và chốt."
        : next === "cancelled"
          ? "Sprint đã hủy theo xác nhận của giảng viên. Sprint không thể kích hoạt lại."
          : "Sprint đã kích hoạt — nhiệm vụ trong kế hoạch bắt đầu chạy theo hạn đã đặt.",
  });
  return { sprint };
}

/** Sửa thông tin sprint (codex: SprintEditDialog) — chỉ khi chưa kết thúc/hủy. */
export function updateSprint(
  sprintId: string,
  patch: { name?: string; goal?: string; startsAt?: string; endsAt?: string },
): { sprint: Sprint } {
  const sprint = INSTRUCTOR_SPRINTS.find((s) => s.id === sprintId);
  if (!sprint) throw new Error("Không tìm thấy Sprint này.");
  if (sprint.status === "completed" || sprint.status === "cancelled") {
    throw new Error(
      "Sprint đã hoàn thành hoặc hủy. Hãy chọn Sprint khác để tạo hoặc chuyển nhiệm vụ mới.",
    );
  }
  if (patch.name !== undefined) sprint.name = patch.name;
  if (patch.goal !== undefined) sprint.goal = patch.goal;
  if (patch.startsAt !== undefined) sprint.startsAt = patch.startsAt;
  if (patch.endsAt !== undefined) sprint.endsAt = patch.endsAt;
  if (INSTRUCTOR_SPRINT_BOARD.id === sprintId) {
    if (patch.goal !== undefined) INSTRUCTOR_SPRINT_BOARD.goal = patch.goal;
    if (patch.name !== undefined) {
      const session = INSTRUCTOR_SESSIONS.find((s) => s.id === sprint.sessionId);
      INSTRUCTOR_SPRINT_BOARD.name = `${patch.name}${session ? ` · ${session.code}` : ""}`;
    }
  }
  return { sprint };
}

/** Tạo sprint mới trong phiên (codex: DeliveryOverview "Tạo Sprint"). */
export function createSprint(input: {
  sessionId: string;
  name: string;
  goal?: string;
  startsAt: string;
  endsAt: string;
}): { sprint: Sprint } {
  const session = INSTRUCTOR_SESSIONS.find((s) => s.id === input.sessionId);
  if (!session) throw new Error("Không tìm thấy phiên thực tập cho Sprint mới.");
  if (session.status === "cancelled") {
    throw new Error("Phiên đã hủy — không thể tạo Sprint mới.");
  }
  if (!input.name.trim() || !input.startsAt || !input.endsAt) {
    throw new Error("Vui lòng điền tên Sprint và khoảng thời gian.");
  }
  const sprint: Sprint = {
    id: `sp-${Date.now()}`,
    sessionId: input.sessionId,
    name: input.name.trim(),
    goal: input.goal?.trim() || "Chưa đặt mục tiêu",
    startsAt: input.startsAt,
    endsAt: input.endsAt,
    status: "planned",
    totalTasks: 0,
    openTasks: 0,
  };
  INSTRUCTOR_SPRINTS.unshift(sprint);
  pushNotification("instructor", {
    category: "Nhiệm vụ",
    title: `Đã tạo ${sprint.name} — ${session.code}`,
    body: "Sprint ở trạng thái đã lập kế hoạch. Kích hoạt khi đội hình sẵn sàng.",
  });
  return { sprint };
}

/** Tạo nhiệm vụ trong sprint (codex: TaskManagement allowCreate). */
export function createBoardTask(input: {
  sprintId: string;
  title: string;
  assignee: string;
  priority?: Priority;
  points?: number;
}): { task: SprintBoardTask } {
  const sprint = INSTRUCTOR_SPRINTS.find((s) => s.id === input.sprintId);
  if (!sprint) throw new Error("Không tìm thấy Sprint này.");
  if (sprint.status === "completed" || sprint.status === "cancelled") {
    throw new Error(
      "Sprint đã hoàn thành hoặc hủy. Hãy chọn Sprint khác để tạo hoặc chuyển nhiệm vụ mới.",
    );
  }
  if (!input.title.trim() || !input.assignee.trim()) {
    throw new Error("Vui lòng điền tên nhiệm vụ và người nhận.");
  }
  const task: SprintBoardTask = {
    id: `sb-${Date.now()}`,
    code: `NEW-${Math.floor(Math.random() * 900 + 100)}`,
    title: input.title.trim(),
    status: "todo",
    assignee: input.assignee.trim(),
    priority: input.priority ?? "medium",
    points: input.points ?? 3,
  };
  if (INSTRUCTOR_SPRINT_BOARD.id === input.sprintId) {
    INSTRUCTOR_SPRINT_BOARD.columns[0].tasks.push(task);
  }
  sprint.totalTasks += 1;
  sprint.openTasks += 1;
  pushNotification("instructor", {
    category: "Nhiệm vụ",
    title: `Đã giao nhiệm vụ ${task.code} — ${task.assignee}`,
    body: `${task.title} (${task.points} điểm, ưu tiên ${task.priority}) đã vào cột Cần làm của ${sprint.name}.`,
  });
  return { task };
}

export const INSTRUCTOR_GRADING: GradingItem[] = [
  {
    id: "gr-1",
    taskCode: "API-201",
    taskTitle: "API danh sách nhiệm vụ kèm bộ lọc",
    student: "Nguyễn Minh",
    submittedAt: iso(-1, 16, 45),
    aiScore: 8.4,
    prLink: "https://github.com/v-intern/journey-notebook/pull/142",
    status: "pending",
    notes: "AI: response shape khớp adapter; còn 1 test case thiếu cho filter rỗng.",
  },
  {
    id: "gr-2",
    taskCode: "BE-190",
    taskTitle: "Webhook sự kiện nộp bài",
    student: "Phan Chi",
    submittedAt: iso(-1, 11, 20),
    aiScore: 7.9,
    prLink: "https://github.com/v-intern/journey-notebook/pull/141",
    status: "pending",
    notes: "AI: retry logic ổn; nên bọc payload bằng schema validation.",
  },
  {
    id: "gr-3",
    taskCode: "FE-103",
    taskTitle: "Hiệu ứng reveal cuộn cho danh sách task",
    student: "Nguyễn Minh",
    submittedAt: iso(0, 9, 25),
    aiScore: 8.1,
    prLink: "https://github.com/v-intern/journey-notebook/pull/145",
    status: "pending",
    notes: "AI: animation mượt và tôn trọng reduced-motion; nên đo lại chỉ số trên máy yếu.",
  },
  {
    id: "gr-4",
    taskCode: "FE-017",
    taskTitle: "Bản mô tả cấu trúc thư mục dự án",
    student: "Lê Thu Hòa",
    submittedAt: iso(0, 8, 50),
    aiScore: 6.2,
    prLink: "https://github.com/v-intern/ueh-career-portal/pull/152",
    status: "pending",
    notes: "AI: còn thiếu mô tả thư mục tests; góp ý nhẹ nhàng cho sinh viên kỳ đầu.",
  },
  {
    id: "gr-5",
    taskCode: "FE-109",
    taskTitle: "Form nộp bài kèm link PR",
    student: "Đỗ Kha",
    submittedAt: iso(-2, 15, 10),
    aiScore: 9.1,
    finalScore: 8.9,
    prLink: "https://github.com/v-intern/journey-notebook/pull/138",
    status: "approved",
    notes: "Đã duyệt — giao tiếp rõ ràng, edge case tốt.",
  },
  {
    id: "gr-6",
    taskCode: "FE-099",
    taskTitle: "Empty state mascots cho các trang",
    student: "Lê Hoàng",
    submittedAt: iso(-3, 10, 5),
    aiScore: 6.9,
    prLink: "https://github.com/v-intern/journey-notebook/pull/131",
    status: "changes",
    notes: "Yêu cầu sửa: tỉ lệ mascot lệch ở 390px, thiếu alt text.",
  },
];

export const INSTRUCTOR_REPORTS: ReportRow[] = [
  { id: "rp-1", period: "Sprint 3 · SS-2026-01 · hiện tại", scope: "5 sinh viên", avgScore: 7.9, completion: 58, kpiAvg: 81, students: 5 },
  { id: "rp-2", period: "Sprint 5 · SS-2026-02 · hiện tại", scope: "5 sinh viên", avgScore: 8.3, completion: 76, kpiAvg: 84, students: 5 },
  { id: "rp-3", period: "Sprint 2 · SS-2026-01 · tuần trước", scope: "5 sinh viên", avgScore: 7.6, completion: 100, kpiAvg: 74, students: 5 },
  { id: "rp-4", period: "Sprint 4 · SS-2026-02 · tuần trước", scope: "5 sinh viên", avgScore: 8.0, completion: 92, kpiAvg: 78, students: 5 },
  { id: "rp-5", period: "Kỳ 2025-11 · SS-2025-11 · đã đóng", scope: "6 sinh viên", avgScore: 8.1, completion: 100, kpiAvg: 80, students: 6 },
];

/* ------------------------------- ADMIN ------------------------------- */

export const ADMIN_USERS: AdminUserRow[] = [
  { id: "u-01", name: "Nguyễn Minh", email: "minh.nguyen@student.edu.vn", role: "intern", status: "active", createdAt: day(-40), lastActive: iso(0, 8, 30) },
  { id: "u-02", name: "Trần Bảo Linh", email: "linh.tran@student.edu.vn", role: "intern", status: "active", createdAt: day(-38), lastActive: iso(0, 7, 45) },
  { id: "u-03", name: "Phạm Gia An", email: "an.pham@student.edu.vn", role: "intern", status: "active", createdAt: day(-120), lastActive: iso(-12) },
  { id: "u-04", name: "Lê Thu Hòa", email: "hoa.le@student.edu.vn", role: "intern", status: "active", createdAt: day(-5), lastActive: iso(0, 9, 5) },
  { id: "u-05", name: "Võ Quốc Tuấn", email: "tuan.vo@student.edu.vn", role: "intern", status: "locked", createdAt: day(-30), lastActive: iso(-9) },
  { id: "u-06", name: "Hoàng Gia Bảo", email: "hoang.le@student.edu.vn", role: "intern", status: "pending", createdAt: day(-2), lastActive: iso(-2, 16, 0) },
  { id: "u-07", name: "Nguyễn Thảo Nhi", email: "nhi.pham@student.edu.vn", role: "intern", status: "pending", createdAt: day(-1), lastActive: iso(-1, 20, 10) },
  { id: "u-08", name: "Ngô Quang Duy", email: "duy.ngo@student.edu.vn", role: "intern", status: "pending", createdAt: day(-1), lastActive: iso(-1, 18, 30) },
  { id: "u-09", name: "TS. Phạm Thu Lan", email: "lan.pham@vintern.edu.vn", role: "instructor", status: "active", createdAt: day(-200), lastActive: iso(0, 9, 10) },
  { id: "u-10", name: "ThS. Trần Hải Sơn", email: "son.tran@vintern.edu.vn", role: "instructor", status: "locked", createdAt: day(-160), lastActive: iso(-4) },
  { id: "u-11", name: "Đặng Thy Mai", email: "mai.dang@vintern.edu.vn", role: "instructor", status: "active", createdAt: day(-7), lastActive: iso(0, 8, 55) },
  { id: "u-12", name: "Trần Vân Anh", email: "quan.tri@vintern.edu.vn", role: "admin", status: "active", createdAt: day(-365), lastActive: iso(0, 9, 0) },
  { id: "u-13", name: "Nguyễn Hải Bắc", email: "bac.nguyen@vintern.edu.vn", role: "admin", status: "locked", createdAt: day(-300), lastActive: iso(-6) },
  { id: "u-14", name: "Võ Đức Cường", email: "cuong.vo@vintern.edu.vn", role: "admin", status: "active", createdAt: day(-180), lastActive: iso(0, 9, 20) },
];

export const ADMIN_QUESTIONS: QuestionRow[] = [
  { id: "q-01", code: "Q-FE-014", role: "Frontend", content: "Khi nào bạn chọn Server Component thay vì Client Component?", difficulty: "Vừa", type: "Tư duy", status: "Đang dùng" },
  { id: "q-02", code: "Q-FE-021", role: "Frontend", content: "Giải thích event loop trong JavaScript — microtask khác task ở điểm nào?", difficulty: "Khó", type: "Kỹ thuật", status: "Đang dùng" },
  { id: "q-03", code: "Q-FE-007", role: "Frontend", content: "Accessibility: bạn kiểm tra contrast màu bằng công cụ gì?", difficulty: "Dễ", type: "Kiến thức", status: "Đang dùng" },
  { id: "q-04", code: "Q-FE-032", role: "Frontend", content: "Khác nhau giữa REST và GraphQL — khi nào bạn chọn cái nào?", difficulty: "Vừa", type: "Kiến thức", status: "Đang dùng" },
  { id: "q-05", code: "Q-BE-011", role: "Backend", content: "Thiết kế idempotency cho API thanh toán như thế nào?", difficulty: "Khó", type: "Thiết kế", status: "Đang dùng" },
  { id: "q-06", code: "Q-BE-003", role: "Backend", content: "Khác biệt giữa optimistic concurrency và pessimistic concurrency?", difficulty: "Vừa", type: "Kiến thức", status: "Ngưng" },
  { id: "q-07", code: "Q-BE-018", role: "Backend", content: "Cách hoạt động của database index và khi nào index không còn hiệu quả?", difficulty: "Khó", type: "Kỹ thuật", status: "Đang dùng" },
  { id: "q-08", code: "Q-FS-005", role: "Fullstack", content: "Thiết kế luồng đăng nhập có refresh token và giới hạn một thiết bị.", difficulty: "Khó", type: "Thiết kế", status: "Đang dùng" },
  { id: "q-09", code: "Q-FS-009", role: "Fullstack", content: "Bạn triển khai feature flag cho hệ thống 50 nghìn người dùng thế nào?", difficulty: "Vừa", type: "Tư duy", status: "Đang dùng" },
  { id: "q-10", code: "Q-DA-002", role: "Data", content: "Viết truy vấn SQL tìm khách hàng có đơn trong 3 ngày liên tiếp — giải pháp của bạn?", difficulty: "Khó", type: "Thực hành", status: "Đang dùng" },
  { id: "q-11", code: "Q-DA-006", role: "Data", content: "Khác biệt giữa OLAP và OLTP? Khi nào cần data warehouse?", difficulty: "Vừa", type: "Kiến thức", status: "Ngưng" },
  { id: "q-12", code: "Q-DA-009", role: "Data", content: "Làm sạch dữ liệu thiếu (missing data) — các chiến lược bạn hay dùng?", difficulty: "Dễ", type: "Kiến thức", status: "Ngưng" },
];

export const ADMIN_TEMPLATES: TemplateRow[] = [
  {
    id: "tpl-1",
    code: "TPL-NB-01",
    name: "Sổ tay hành trình số",
    domain: "Web App · Next.js",
    description: "Dự án giáo trình nền tảng: design system, component library và ứng dụng notebook.",
    blueprints: 6,
    tasks: 20,
    status: "Công khai",
  },
  {
    id: "tpl-2",
    code: "TPL-KT-04",
    name: "Kho tri thức Agent",
    domain: "AI · RAG",
    description: "Xây dựng kho tài liệu có AI truy xuất: embedding, retrieval và pipeline đánh giá.",
    blueprints: 4,
    tasks: 18,
    status: "Công khai",
  },
  {
    id: "tpl-3",
    code: "TPL-VF-02",
    name: "Cổng xác minh chứng nhận",
    domain: "Platform · API công khai",
    description: "Trang tra cứu công khai + API mã hóa một chiều, có trang in chứng nhận.",
    blueprints: 3,
    tasks: 16,
    status: "Nội bộ",
  },
  {
    id: "tpl-4",
    code: "TPL-DX-07",
    name: "Bảng điều phối sự kiện nội bộ",
    domain: "Internal Tool · Realtime",
    description: "Đề tài thử nghiệm: WebSocket, hàng đợi và canvas trực quan.",
    blueprints: 2,
    tasks: 14,
    status: "Nội bộ",
  },
  {
    id: "tpl-5",
    code: "TPL-MB-03",
    name: "App điểm danh nhóm sáng",
    domain: "Mobile · React Native",
    description: "Ứng dụng điểm danh nhanh cho nhóm thực tập: QR, lịch sử và thống kê chuyên cần.",
    blueprints: 3,
    tasks: 16,
    status: "Nội bộ",
  },
  {
    id: "tpl-6",
    code: "TPL-DA-05",
    name: "Bảng điều khi phân tích KPI",
    domain: "Data · Analytics",
    description: "Dashboard KPI sinh viên: ETL nhẹ, mô hình điểm và trực quan hóa xu hướng sprint.",
    blueprints: 2,
    tasks: 12,
    status: "Nội bộ",
  },
];

export const ADMIN_ACTIVITY: ActivityItem[] = [
  { id: "ac-1", module: "Người dùng", label: "3 đăng ký mới chờ duyệt trong 24 giờ qua", at: iso(0, 8, 40), ok: true },
  { id: "ac-2", module: "Ngân hàng câu hỏi", label: "Nhập 12 câu hỏi mới cho mảng Frontend & Data", at: iso(0, 8, 12), ok: true },
  { id: "ac-3", module: "Phiên thực tập", label: "Mở đăng ký SS-2026-04 — khởi động sau 9 ngày", at: iso(0, 7, 55), ok: true },
  { id: "ac-4", module: "Cấu hình AI", label: "Điều chỉnh nhiệt độ sinh câu phỏng vấn 0.7 → 0.6", at: iso(-1, 17, 5), ok: true },
  { id: "ac-5", module: "Người dùng", label: "Khóa tài khoản tuan.vo@student.edu.vn (vi phạm quy định nộp bài)", at: iso(-1, 15, 30), ok: true },
  { id: "ac-6", module: "GitHub", label: "Đồng bộ 14 pull request mới từ tổ chức v-intern", at: iso(-1, 14, 0), ok: true },
  { id: "ac-7", module: "KPI", label: "Tính lại KPI Sprint 2 cho SS-2026-01 sau khi sửa trọng số", at: iso(-1, 10, 20), ok: true },
  { id: "ac-8", module: "GitHub", label: "Lỗi 401 khi đồng bộ repo riêng tư — chờ cấp token mới", at: iso(-1, 8, 5), ok: false },
  { id: "ac-9", module: "KPI", label: "Đồng bộ KPI gặp lỗi — bỏ qua 2 bản ghi trùng lặp", at: iso(-2, 3, 10), ok: false },
  { id: "ac-10", module: "Mẫu dự án", label: "Cập nhật TPL-NB-01 — bổ sung 4 nhiệm vụ accessibility", at: iso(-2, 9, 45), ok: true },
  { id: "ac-11", module: "Chứng nhận", label: "Cấp CRT-2026-0042 cho Phạm Gia An", at: iso(-12), ok: true },
  { id: "ac-12", module: "Chứng nhận", label: "Thu hồi CRT-2026-0043 — nhầm lẫn dữ liệu sinh viên", at: iso(-11, 9, 15), ok: true },
];

export const ADMIN_STATS = {
  users: 128,
  interns: 87,
  instructors: 19,
  admins: 6,
  pendingAccounts: 9,
  lockedAccounts: 4,
  activeSessions: 12,
  certificatesIssued: 41,
  questions: 96,
  templates: 18,
  aiCallsToday: 1240,
  uptime: 99.7,
};

/* --------------------------- NOTIFICATIONS --------------------------- */
/* 30 thông báo: intern 12 (đủ 8 nhóm), instructor 10, admin 8.
   Trạng thái đã đọc được máy chủ ghi nhớ qua READ_STATE bên dưới. */

export const NOTIFICATIONS: NotificationItem[] = [
  // ---- intern (12) ----
  { id: "n-101", role: "intern", category: "Nhiệm vụ", title: "Nhiệm vụ FE-106 sắp đến hạn", body: "Nhiệm vụ 'Tích hợp API danh sách nhiệm vụ' đã quá hạn 1 ngày — ưu tiên hoàn thành trước họp sprint.", at: iso(0, 8, 5), read: false },
  { id: "n-102", role: "intern", category: "Đánh giá", title: "Điểm Sprint 3 đã chốt: 8.5/10", body: "TS. Phạm Thu Lan đã chốt điểm giữa kỳ. Đọc nhận xét để điều hướng nửa sau sprint nhé.", at: iso(0, 9, 40), read: false },
  { id: "n-103", role: "intern", category: "Nhiệm vụ", title: "API-201 đã vào hàng chờ duyệt", body: "PR #142 của bạn đã được AI chấm nháp 8.4/10. Giảng viên sẽ xem xét trong 48 giờ.", at: iso(-1, 16, 45), read: false },
  { id: "n-104", role: "intern", category: "Hệ thống", title: "Bảo trì định kỳ cuối tuần", body: "Hệ thống tạm dừng 22:00–23:00 thứ Bảy. Task đang soạn sẽ được giữ nguyên.", at: iso(-1, 9, 0), read: true },
  { id: "n-105", role: "intern", category: "Lương ảo", title: "Thưởng 250.000 đ ảo đã cộng", body: "Góp ý cải thiện luồng review được ghi nhận. Xem chi tiết trong sổ giao dịch.", at: iso(-1, 10, 15), read: false },
  { id: "n-106", role: "intern", category: "Hệ thống", title: "AI Mentor có trả lời mới", body: "Hội thoại 'Cách chia component UI' vừa có câu trả lời — mở AI Mentor để xem.", at: iso(-2, 14, 20), read: false },
  { id: "n-107", role: "intern", category: "Phiên thực tập", title: "Họp nhóm sáng thứ 4", body: "SS-2026-01 họp 8:30 sáng thứ 4 — chuẩn bị demo kanban 2 phút.", at: iso(-3, 8, 0), read: true },
  { id: "n-108", role: "intern", category: "KPI", title: "KPI Sprint 2 đã tổng hợp: 74/100", body: "Tăng 6 điểm so với Sprint 1. Chi tiết từng nguồn tính đã sẵn sàng.", at: iso(-6, 1, 0), read: true },
  { id: "n-109", role: "intern", category: "Lương ảo", title: "Số dư được cộng 2.180.000 đ ảo", body: "Từ KPI Sprint 2 · 74 điểm. Sổ giao dịch đã đối chiếu.", at: iso(-6, 2, 0), read: true },
  { id: "n-110", role: "intern", category: "Đánh giá", title: "Đánh giá Sprint 2 đã chốt: 8.0/10", body: "Điểm chính thức 8.0/10 — đọc nhận xét của giảng viên để chuẩn bị sprint tới.", at: iso(-20), read: true },
  { id: "n-111", role: "intern", category: "Tuyển dụng", title: "Chúc mừng! Bạn đã đậu phỏng vấn AI", body: "78/100 điểm. Hồ sơ của bạn đã vào hàng chờ phân công dự án.", at: iso(-11), read: false },
  { id: "n-112", role: "intern", category: "Chứng nhận", title: "Chứng nhận CRT-2026-0042 đã được cấp", body: "Tải bản PDF hoặc chia sẻ mã xác minh VINT-2026-QX4T8N.", at: iso(-12), read: true },

  // ---- instructor (10) ----
  { id: "n-201", role: "instructor", category: "Nhiệm vụ", title: "4 bài nộp đang chờ duyệt", body: "API-201, FE-103 (Nguyễn Minh), BE-190 (Phan Chi) và FE-017 (Lê Thu Hòa) — AI đã chấm nháp sẵn.", at: iso(0, 8, 50), read: false },
  { id: "n-202", role: "instructor", category: "Đánh giá", title: "Đề xuất điểm AI đã sẵn sàng cho Sprint 3", body: "5 hồ sơ của SS-2026-01 có thể duyệt một lượt trong trang Đánh giá.", at: iso(-1, 9, 0), read: false },
  { id: "n-203", role: "instructor", category: "Phiên thực tập", title: "Sprint 5 sắp kết thúc", body: "SS-2026-02 còn 8 ngày. Nhắc nhóm hoàn tất cột Chờ duyệt sớm.", at: iso(-1, 8, 0), read: true },
  { id: "n-204", role: "instructor", category: "Phiên thực tập", title: "Sinh viên mới: Lê Thu Hòa vào SS-2026-03", body: "Sinh viên kỳ đầu tiên vừa được phân công nhóm sáng thứ 4 — nhớ chào mừng và giao nhiệm vụ tuần 1.", at: iso(-2, 10, 30), read: false },
  { id: "n-205", role: "instructor", category: "KPI", title: "KPI Sprint 2 của SS-2026-01 đã tổng hợp", body: "Trung bình nhóm 74/100, tăng 6 điểm so với Sprint 1. Xem báo cáo chi tiết.", at: iso(-3, 7, 0), read: true },
  { id: "n-206", role: "instructor", category: "Hệ thống", title: "Bản vá grading runner", body: "Chấm nháp giờ hỗ trợ repo riêng tư. Không cần thao tác gì thêm.", at: iso(-3, 6, 5), read: true },
  { id: "n-207", role: "instructor", category: "Nhiệm vụ", title: "Bài nộp FE-099 cần sửa lại", body: "Lê Hoàng gửi mascot empty state — tỉ lệ lệch ở 390px và thiếu alt text. Nhắc sinh viên hoàn tất trước cuối tuần.", at: iso(-4, 15, 0), read: false },
  { id: "n-208", role: "instructor", category: "Đánh giá", title: "Đánh giá Sprint 2 đã chốt cho 5 sinh viên", body: "Điểm số và nhận xét đã gửi kèm thông báo tới từng sinh viên.", at: iso(-6), read: true },
  { id: "n-209", role: "instructor", category: "Hệ thống", title: "Nhóm SS-2026-02 dùng 80% hạn mức AI", body: "Hạn mức AI Mentor của nhóm đã dùng 80% trong tuần. Xem phân bổ lại nếu cần.", at: iso(-8, 9, 0), read: false },
  { id: "n-210", role: "instructor", category: "Chứng nhận", title: "Đã cấp 6 chứng nhận cho SS-2025-11", body: "Kỳ 2025-11 kết thúc — chứng nhận đã ký số và gửi email cho 6 sinh viên.", at: iso(-12), read: true },

  // ---- admin (8) ----
  { id: "n-301", role: "admin", category: "Người dùng", title: "3 tài khoản chờ duyệt", body: "hoang.le, nhi.pham, duy.ngo vừa đăng ký — xem trong trang Người dùng.", at: iso(0, 8, 5), read: false },
  { id: "n-302", role: "admin", category: "Hệ thống", title: "AI đã dùng 1.240 lượt gọi hôm nay", body: "Trong hạn mức 2.000. Biểu đồ chi tiết ở trang Trạng thái dịch vụ.", at: iso(0, 8, 10), read: false },
  { id: "n-303", role: "admin", category: "Người dùng", title: "Đã khóa tài khoản tuan.vo@student.edu.vn", body: "Khóa vì vi phạm quy định nộp bài — sinh viên đã được thông báo qua email.", at: iso(-1, 15, 30), read: true },
  { id: "n-304", role: "admin", category: "Người dùng", title: "Khóa tạm giảng viên son.tran@vintern.edu.vn", body: "Nghi vấn truy cập bất thường từ dải IP lạ — tài khoản tạm khóa để điều tra.", at: iso(-1, 10, 0), read: false },
  { id: "n-305", role: "admin", category: "Chứng nhận", title: "Cấp chứng nhận thành công", body: "CRT-2026-0042 đã ký số và gửi email cho sinh viên.", at: iso(-12), read: true },
  { id: "n-306", role: "admin", category: "Tuyển dụng", title: "Đợt tuyển 2026-03 mở đăng ký", body: "46 đơn trong 24 giờ đầu — đợt phỏng vấn AI đã mở.", at: iso(-2, 9, 0), read: false },
  { id: "n-307", role: "admin", category: "Hệ thống", title: "Grading runner khởi động lại sau bản vá", body: "Không mất dữ liệu nào — hàng đợi chấm nháp đã chạy lại bình thường.", at: iso(-3, 6, 2), read: true },
  { id: "n-308", role: "admin", category: "Người dùng", title: "Mật khẩu quản trị viên vừa được reset", body: "cuong.vo@vintern.edu.vn — người dùng phải đổi mật khẩu mới khi đăng nhập lần tới.", at: iso(-4, 11, 0), read: false },
];

/* Trạng thái đã đọc ghi nhớ phía máy chủ (mỗi lần khởi động lại sạch).
   read = giá trị gốc CÓ thêm id nằm trong READ_STATE. */
const READ_STATE = new Map<string, Set<string>>();

/** Đẩy thông báo mới vào đầu danh sách của một vai trò (codex sync:
 *  hành động vòng đời sprint/phiên/phân công đều báo tới người dùng). */
export function pushNotification(
  role: Role,
  item: { category: NotificationCategory; title: string; body: string },
): NotificationItem {
  const notification: NotificationItem = {
    id: `n-${Date.now()}-${Math.floor(Math.random() * 900 + 100)}`,
    role,
    category: item.category,
    title: item.title,
    body: item.body,
    at: new Date().toISOString(),
    read: false,
  };
  NOTIFICATIONS.unshift(notification);
  return notification;
}

export function notificationsFor(role: string): NotificationItem[] {
  const r = role.toLowerCase();
  const readSet = READ_STATE.get(r);
  return NOTIFICATIONS.filter((n) => n.role === r).map((n) => ({
    ...n,
    read: n.read || (readSet?.has(n.id) ?? false),
  }));
}

/** Đánh dấu đã đọc (toàn bộ hoặc từng id) — trả về số mục mới được đánh dấu. */
export function markNotificationsRead(role: string, ids?: string[], all = false): number {
  const r = role.toLowerCase();
  const items = NOTIFICATIONS.filter((n) => n.role === r);
  if (items.length === 0) return 0;
  let set = READ_STATE.get(r);
  if (!set) {
    set = new Set<string>();
    READ_STATE.set(r, set);
  }
  const target = all ? items.map((i) => i.id) : (ids ?? []);
  let updated = 0;
  for (const id of target) {
    const item = items.find((i) => i.id === id);
    if (!item) continue;
    if (item.read || set.has(id)) continue; // mục đã đọc sẵn thì bỏ qua
    set.add(id);
    updated++;
  }
  return updated;
}

/** Bỏ đánh dấu đã đọc (hoàn tác) — trả về số mục được gỡ. */
export function markNotificationsUnread(role: string, ids: string[]): number {
  const r = role.toLowerCase();
  const set = READ_STATE.get(r);
  if (!set) return 0;
  let updated = 0;
  for (const id of ids) {
    if (set.delete(id)) updated++;
  }
  return updated;
}
