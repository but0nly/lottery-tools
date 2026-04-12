import type { Metadata } from "next";
import "./globals.css";
import { Sidebar } from "@/components/Sidebar";
import { Cart } from "@/components/Cart";
import { NotificationContainer } from "@/components/NotificationContainer";

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
      <body className="flex flex-col md:flex-row min-h-screen bg-slate-50 font-sans pb-16 md:pb-0">
        <Sidebar />
        <main className="flex-1 overflow-y-auto w-full">
          {children}
        </main>
        <Cart />
        <NotificationContainer />
      </body>
    </html>
  );
}
