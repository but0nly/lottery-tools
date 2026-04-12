import type { Metadata } from "next";
import "./globals.css";
import { DesktopSidebar, MobileHeader, MobileNav } from "@/components/Sidebar";
import { Cart } from "@/components/Cart";
import { CartButton } from "@/components/CartButton";
import { NotificationContainer } from "@/components/NotificationContainer";
import { FlyToCartAnimationContainer } from "@/components/FlyToCartAnimation";

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
        {/* 顶部固定栏 (移动端) */}
        <MobileHeader />

        <div className="flex-1 flex flex-row overflow-hidden relative">
          {/* 左侧固定栏 (桌面端) */}
          <DesktopSidebar />

          {/* 中间伸缩滚动区 */}
          <main className="flex-1 overflow-y-auto w-full relative">
            <div className="hidden md:flex absolute top-6 right-8 z-40">
              <CartButton className="bg-white shadow-md hover:shadow-lg rounded-full p-3 text-slate-600 hover:text-slate-900 transition-all border border-slate-100" />
            </div>
            {children}
          </main>
        </div>

        {/* 底部固定栏 (移动端) */}
        <MobileNav />

        <Cart />
        <NotificationContainer />
        <FlyToCartAnimationContainer />
      </body>
    </html>
  );
}
