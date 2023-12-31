"use client";

import { useEffect } from "react";
import { socket } from "@/lib/socket";
import { Notification } from "@/types";
import { Chip } from "@nextui-org/react";
import { useToast } from "./ui/useToast";
import { ScrollArea } from "./ui/scrollArea";
import { useMembersStore } from "@/store/membersStore";

export default function MembersList() {
  const { toast } = useToast();
  const [members, setMembers] = useMembersStore((state) => [
    state.members,
    state.setMembers,
  ]);

  useEffect(() => {
    socket.on("update-members", (members) => {
      setMembers(members);
    });
    socket.on("send-notification", ({ title, message }: Notification) => {
      toast({
        title,
        description: message,
      });
    });

    return () => {
      socket.off("update-members");
      socket.off("send-notification");
    };
  }, [toast, setMembers]);

  return (
    <div className="my-6 select-none">
      <h2 className="pb-2.5 font-medium text-primary">Members</h2>

      <ScrollArea className="h-48">
        <ul className="flex flex-col gap-1 rounded-md px-1">
          {members.map(({ id, username }, index) => (
            <li className="flex gap-2 items-center" key={id}>
              <p>{username}</p>
              {(index === 0) && (
                <Chip size="sm" color="primary" className="text-[0.7rem]">
                  Admin
                </Chip>
              )}
            </li>
          ))}
        </ul>
      </ScrollArea>
    </div>
  );
}
