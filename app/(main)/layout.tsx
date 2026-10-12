import BottomNav from "@/components/layout/BottomNav";
import SessionGate from "@/components/layout/SessionGate";

export default function MainLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <SessionGate>
      <div className="flex-1 flex flex-col w-full h-full relative">
        <div data-main-scroll className="flex-1 overflow-y-auto overscroll-y-contain pb-[calc(5.5rem+env(safe-area-inset-bottom))]">
          {children}
        </div>
        <BottomNav />
      </div>
    </SessionGate>
  );
}
