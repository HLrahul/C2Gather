"use client"

import { z } from "zod";
import { socket } from "@/lib/socket";
import { Loader2 } from "lucide-react";
import { toast } from "./ui/use-toast";
import { RoomJoinedData } from "@/types";
import { useForm } from "react-hook-form";
import { Separator } from "./ui/separator";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMembersStore } from "@/store/membersStore";
import { useJoinPrompt, useUserStore } from "@/store/userStore";
import { joinRoomSchema } from "@/lib/validations/JoinRoomSchema";
import { AlertDialog, AlertDialogAction, AlertDialogContent, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormMessage,
} from "@/components/ui/form";

type JoinRoomForm = z.infer<typeof joinRoomSchema>;

type propsType = {
  roomId: string;
};

export default function JoinRoomPrompt(props: propsType) {
  const { roomId} = props;

  const setUser = useUserStore((state) => state.setUser);
  const setMembers = useMembersStore((state) => state.setMembers);
  const showDialog = useJoinPrompt((state) => state.showDialog);
  const setShowDialog = useJoinPrompt((state) => state.setShowDialog);

  const router = useRouter();

  const [isLoading, setIsLoading] = useState(false);
  const [isHomeLoading, setIsHomeLoading] = useState(false);

  const form = useForm<JoinRoomForm>({
    resolver: zodResolver(joinRoomSchema),
    defaultValues: {
      username: "",
      roomId: roomId,
    },
  });

  function onSubmit({ roomId, username }: JoinRoomForm) {
    setIsLoading(true);
    socket.emit("join-room", { roomId, username });
  }

  useEffect(() => {
    socket.on("room-not-found", () => {
      setIsLoading(false);
    });
  }, []);

  useEffect(() => {
    socket.on("room-joined", ({ user, members }: RoomJoinedData) => {
      setUser(user);
      setMembers(members);
      setShowDialog(false);
    });

    function handleErrorMessage({ message }: { message: string }) {
      toast({
        title: "Failed to join room!",
        description: message,
      });
    }

    socket.on("room-not-found", handleErrorMessage);

    socket.on("invalid-data", handleErrorMessage);

    return () => {
      socket.off("room-joined");
      socket.off("room-not-found");
      socket.off("invalid-data", handleErrorMessage);
    };
  }, [router, toast, setUser, setMembers]);

  return (
    <>
      <AlertDialog open={showDialog} onOpenChange={setShowDialog}>
        <AlertDialogContent className="w-[90vw] max-w-[400px]">
          <AlertDialogHeader className="pb-2">
            <AlertDialogTitle>Join the room now!</AlertDialogTitle>
          </AlertDialogHeader>

          <Form {...form}>
            <form
              onSubmit={form.handleSubmit(onSubmit)}
              className="flex flex-col gap-4"
            >
              <FormField
                control={form.control}
                name="username"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input placeholder="Username" {...field} />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="roomId"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Input
                        placeholder="Room ID"
                        defaultValue={roomId}
                        {...field}
                      />
                    </FormControl>
                    <FormMessage className="text-xs" />
                  </FormItem>
                )}
              />

              
                <Button type="submit" className="mt-2">
                  {isLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    "Join"
                  )}
                </Button>
              
            </form>
          </Form>

          <Separator />
          
            <Button
              onClick={(e) => {
                setIsHomeLoading(true);
                router.replace("/");
                setIsHomeLoading(false);
              }}
            >
              {isHomeLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                "Home"
              )}
            </Button>
          
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}