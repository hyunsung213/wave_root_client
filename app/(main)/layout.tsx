import BottomNav from "@/components/layout/BottomNav";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex-1 flex flex-col w-full h-full relative">
      <div className="flex-1 overflow-y-auto pb-16">
        {children}
      </div>
      <BottomNav />
    </div>
  );
}
