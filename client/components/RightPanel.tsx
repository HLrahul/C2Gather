import MemberList from "@/components/MemberList";
import LeaveButton from "@/components/LeaveButton";

export default function RightPanel() {
  return (
    <div className="flex h-full justify-center py-8">
      <div className="relative flex h-full w-[12.5rem] flex-col gap-6">
        <MemberList />

        <LeaveButton />
      </div>
    </div>
  );
}
