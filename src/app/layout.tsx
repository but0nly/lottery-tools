import type { Metadata } from "next";
import "./globals.css";
import { DesktopSidebar, MobileHeader, MobileNav } from "@/components/Sidebar";
import { NotificationContainer } from "@/components/NotificationContainer";
import { FlyToCartAnimationContainer } from "@/components/FlyToCartAnimation";
import { LotteryProvider } from "@/app/LotteryContext";

export const metadata: Metadata = {
  title: "彩通宝 - 彩票组合缩水与反向计算",
  description: "双色球和大乐透高级选号工具",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh">
      <body className="h-screen overflow-hidden bg-slate-50 font-sans flex flex-col">
        <LotteryProvider>
          {/* 顶部固定栏 (移动端) */}
          <MobileHeader />

          <div className="flex-1 flex flex-row overflow-hidden relative">
            {/* 左侧固定栏 (桌面端) */}
            <DesktopSidebar />

            {/* 中间伸缩滚动区 */}
            <main className="flex-1 overflow-y-auto w-full relative overscroll-behavior-none">
              {children}
            </main>
          </div>

          {/* 底部固定栏 (移动端) */}
          <MobileNav />

          <NotificationContainer />
          <FlyToCartAnimationContainer />
        </LotteryProvider>
      </body>
    </html>
  );
}
