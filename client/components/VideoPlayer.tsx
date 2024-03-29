import "@/styles/video-player.css";

import { useEffect, useRef, useState } from "react";
import { useParams } from "next/navigation";
import { Skeleton } from "@nextui-org/react";

import dynamic from "next/dynamic";
const ReactPlayer = dynamic(() => import("react-player"), { ssr: false });

import VideoDetails from "./VideoDetails";

import { socket } from "@/lib/socket";
import { useChatStore } from "@/store/chatStore";
import { useUserStore } from "@/store/userStore";
import { useVideoUrlStore } from "@/store/videoUrlStore";
import { ArrowUpToLine } from "lucide-react";

export default function VideoPlayer() {
  const { roomId } = useParams();
  const { user } = useUserStore();
  const { videoUrl } = useVideoUrlStore();
  const addMessage = useChatStore((state) => state.addMessage);
  const setVideoUrl = useVideoUrlStore((state) => state.setVideoUrl);

  const actionByUser = useRef<boolean>(true);
  const [player, setPlayer] = useState<any>(null);
  const interval = useRef<NodeJS.Timeout | null>(null);
  const [isLoaded, setIsLoaded] = useState<boolean>(false);
  const [isPlaying, setIsPlaying] = useState<boolean>(true);
  const [playbackRate, setPlaybackRate] = useState<number>(1);
  const [expectedTime, setExpectedTime] = useState<number>(0);
  const [playedSeconds, setPlayedSeconds] = useState<number>(0);

  useEffect(() => {
    if (videoUrl !== "") {
      setIsLoaded(true);
    }
  }, [videoUrl]);

  useEffect(() => {
    if (player && videoUrl) {
      socket.emit("video-change", { roomId, serverUrl: videoUrl });
    }

    socket.on("video-change-from-server", ({ serverUrl }) => {
      if (player && videoUrl !== serverUrl) {
        setVideoUrl(serverUrl);
        setPlayedSeconds(0);
        setExpectedTime(0);
        player.seekTo(0);
      }
    });

    return () => {
      socket.off("video-change-from-server");
    };
  }, [player, roomId, setVideoUrl, videoUrl]);

  useEffect(() => {
    socket.emit("client-ready", roomId);
    socket.on("get-player-state", () => {
      if (player) {
        const currentTime = player.getCurrentTime();
        socket.emit("send-player-state", {
          roomId,
          currentTime,
          serverUrl: videoUrl,
        });
      }
    });
    socket.on("player-state-from-server", ({ serverUrl, currentTime }) => {
      if (videoUrl !== serverUrl) {
        setVideoUrl(serverUrl);
      }
      if (player && currentTime) {
        player.seekTo(currentTime);
      }
    });
    socket.on("player-pause-from-server", (membersCurrentTime) => {
      if (player && isPlaying) {
        actionByUser.current = false;
        player.seekTo(membersCurrentTime + 0.5);
        setExpectedTime(membersCurrentTime + 0.5);
        setPlayedSeconds(membersCurrentTime + 0.5);
        setIsPlaying(false);
      }
    });
    socket.on("player-play-from-server", () => {
      if (player) {
        actionByUser.current = false;
        setIsPlaying(true);
      }
    });
    socket.on("playback-rate-change-from-server", (playbackRate) => {
      if (player) {
        setPlaybackRate(playbackRate);
      }
    });

    return () => {
      socket.off("get-player-state");
      socket.off("player-state-from-server");
      socket.off("player-pause-from-server");
      socket.off("player-play-from-server");
      socket.off("playback-rate-change-from-server");
    };
  }, [isPlaying, player, roomId, setVideoUrl, videoUrl]);

  useEffect(() => {
    if (player && isPlaying) {
      setExpectedTime(playedSeconds);
      interval.current = setInterval(() => {
        setExpectedTime((prevTime) => prevTime + 1 * playbackRate);
      }, 1000);
    } else if (!isPlaying && interval.current) {
      clearInterval(interval.current);
    }

    return () => {
      if (interval.current) clearInterval(interval.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, isPlaying, playbackRate]);

  useEffect(() => {
    if (player && isPlaying) {
      const timeDiff = Math.ceil(Math.abs(playedSeconds - expectedTime));
      if (timeDiff > 2) {
        socket.emit("player-pause", {
          roomId,
          membersCurrentTime: playedSeconds,
        });
        setExpectedTime(playedSeconds);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [player, playedSeconds, isPlaying, expectedTime]);

  function SendActionMessage(action: string) {
    const time = new Date().toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
      hour12: true,
    });

    user &&
      addMessage({
        name: `You`,
        message: action,
        timeSent: time,
        isAction: true,
      });
    user &&
      socket.emit("action-message", {
        roomId: roomId,
        name: user.username,
        message: action,
        timeSent: new Date().toISOString(),
      });
  }

  const onReady = (player: any) => {
    setPlayer(player);
  };
  const onPlay = () => {
    if (player) {
      socket.emit("player-play", { roomId });
      if (!isPlaying) setIsPlaying(true);
      if (actionByUser.current) {
        SendActionMessage("played the video");
      } else {
        actionByUser.current = true;
      }
    }
  };
  const onPause = () => {
    if (player) {
      socket.emit("player-pause", {
        roomId,
        membersCurrentTime: player.getCurrentTime(),
      });
    }
    setIsPlaying(false);
    if (actionByUser.current) {
      SendActionMessage("paused the video");
    } else {
      actionByUser.current = true;
    }
  };
  const onPlaybackRateChange = (playbackRate: number) => {
    socket.emit("playback-rate-change", { roomId, playbackRate });
  };
  const onEnded = () => {
    if (player) {
      setExpectedTime(0);
      setPlayedSeconds(0);
      player.seekTo(0);
      setTimeout(() => {
        setIsPlaying(true);
      }, 1000);
    }
  };

  return (
    <div className="col-span-8 md:col-span-5">
      <Skeleton isLoaded className="w-5/5 rounded-lg mb-5">
        {!isLoaded && (
          <div className="absolute h-full w-full bg-foreground-800 flex flex-col items-center justify-start">
            <ArrowUpToLine className="" />
            <p className="w-[70%] h-[90%] flex items-center justify-center text-center">
              Paste a youtube video link or start typing to search a video from
              youtube.
            </p>
          </div>
        )}
        <div className="video-responsive">
          <ReactPlayer
            key={videoUrl}
            url={videoUrl}
            className="react-player"
            height="100%"
            width="100%"
            controls={true}
            playing={isPlaying}
            muted={false}
            pip={true}
            stopOnUnmount={false}
            onReady={onReady}
            onPlay={onPlay}
            onPause={onPause}
            onProgress={({ playedSeconds }) => {
              setPlayedSeconds(playedSeconds);
            }}
            playbackRate={playbackRate}
            onPlaybackRateChange={onPlaybackRateChange}
            onEnded={onEnded}
          />
        </div>
      </Skeleton>

      <VideoDetails isVideoSet={isLoaded} />
    </div>
  );
}
