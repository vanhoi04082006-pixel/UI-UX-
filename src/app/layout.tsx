import type { Metadata, Viewport } from "next";
import { Be_Vietnam_Pro, JetBrains_Mono } from "next/font/google";
import localFont from "next/font/local";
import { ThemeProvider } from "next-themes";
import { Toaster } from "@/components/ui/sonner";
import "./globals.css";

/* Journey Notebook typography: Be Vietnam Pro cho nội dung đọc,
   Patrick Hand cho ghi chú viết tay, JetBrains Mono cho mã/label. */
const beVietnam = Be_Vietnam_Pro({
  variable: "--font-be-vietnam",
  subsets: ["latin", "vietnamese"],
  weight: ["300", "400", "500", "600", "700", "800"],
  display: "swap",
});

const patrickHand = localFont({
  src: "./fonts/patrick-hand-regular.ttf",
  variable: "--font-patrick-hand",
  weight: "400",
  display: "swap",
});

const jetbrains = JetBrains_Mono({
  variable: "--font-jetbrains",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  metadataBase: new URL("http://localhost:3000"),
  title: "V-Intern — Nền tảng thực tập ảo với AI",
  description:
    "V-Intern là nền tảng thực tập ảo ứng dụng AI, mô phỏng môi trường làm việc thực tế giúp sinh viên trải nghiệm quy trình phát triển phần mềm chuyên nghiệp, kết nối sinh viên - giảng viên - doanh nghiệp.",
  keywords: [
    "V-Intern",
    "thực tập ảo",
    "virtual internship",
    "AI",
    "sinh viên",
    "dự án thực tế",
    "AI Mentor",
  ],
  authors: [{ name: "V-Intern" }],
  openGraph: {
    title: "V-Intern — Nền tảng thực tập ảo với AI",
    description:
      "Kỹ năng thật. Dự án thật. Tương lai của bạn. — Nền tảng thực tập ảo thế hệ mới cho sinh viên CNTT.",
    siteName: "V-Intern",
    type: "website",
    images: ["/images/og-notebook.png"],
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#fbfaf4" },
    { media: "(prefers-color-scheme: dark)", color: "#131318" },
  ],
};

const THEME_BOOTSTRAP = `(function(){try{var t=localStorage.getItem("v-intern-theme");var d=t==="dark"||(!t&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      suppressHydrationWarning
      className={`${beVietnam.variable} ${patrickHand.variable} ${jetbrains.variable}`}
    >
      <head>
        {/* Áp theme trước lần vẽ đầu — tránh chớp nhầm palette. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOTSTRAP }} />
      </head>
      <body className="antialiased bg-background text-foreground">
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem={false}
          storageKey="v-intern-theme"
          disableTransitionOnChange
        >
          {children}
          <Toaster position="top-right" richColors closeButton />
        </ThemeProvider>
      </body>
    </html>
  );
}
