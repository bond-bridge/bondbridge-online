import { useState, useEffect, useRef } from "react";
import { Message } from "@/types/chat";
import {
  ArrowLeft,
  // History,
  Volume2,
  Check,
  ChevronsUpDown,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { ChatInput, ChatInputRef } from "@/components/chat/ChatInput";
import { useSocket } from "@/context/SocketContext";
import { useApiCall } from "@/apis/globalCatchError";
import { getMessages, startMessage } from "@/apis/commonApiCalls/chatApi";
import { toast } from "sonner";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { useNavigate } from "react-router-dom";
import { useDispatch } from "react-redux";
import { setActiveChat } from "@/store/chatSlice";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import LogoLoader from "@/components/LogoLoader";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { stopAllRecognitionInstances } from "@/types/speech-recognition";
import { TypingIndicator } from "@/components/chat/TypingIndicator";

// Extend the Message type to support complex content
interface ExtendedMessage extends Omit<Message, "text"> {
  text: string | MessageContent;
  media?: string;
  senderId?: string;
}

interface UserRecommendation {
  _id: string;
  name: string;
  nickName: string;
  profilePic: string;
  interests: string[];
  matchingInterestsCount: number;
  hasMessageInterest: boolean;
}

interface MessageContent {
  message: string;
  users?: UserRecommendation[];
}

interface MessageResponse {
  _id?: string;
  content: string | MessageContent;
  senderId: string;
  timestamp?: number;
  chatId?: string;
  senderName?: string;
  senderAvatar?: string;
  isBot?: boolean;
  media?: string;
  deviceId?: string;
}

// Interface for message objects in the API response
interface MessageHistoryItem {
  _id: string;
  content: string | MessageContent;
  senderId: string;
  createdAt: string;
  media?: string;
}

interface SendMessageResponse {
  success: boolean;
  message?: string;
  data?: {
    _id: string;
    content: string;
    timestamp: number;
  };
}

// Custom component for user recommendation cards
const UserCard = ({
  user,
  onNavigate,
}: {
  user: UserRecommendation;
  onNavigate: (path: string) => void;
}) => {
  // Display up to 3 interests with a "+n more" indicator if needed
  const displayedInterests = user.interests.slice(0, 3);
  const remainingCount = Math.max(0, user.interests.length - 3);

  return (
    <div
      className="flex items-start border-2 border-primary/25 gap-3 p-4 bg-muted/50 rounded-lg mb-2 hover:bg-muted transition-colors cursor-pointer"
      onClick={() => onNavigate(`/profile/${user._id}`)}
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={user.profilePic} alt={user.name} />
        <AvatarFallback>{user.name[0]}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <span className="font-medium">{user.name}</span>
        <div className="flex flex-wrap gap-1 mt-1">
          {displayedInterests.map((interest, index) => (
            <Badge
              key={`${index}-${user._id}`}
              variant="outline"
              className="text-xs border-primary"
            >
              {interest}
            </Badge>
          ))}
          {remainingCount > 0 && (
            <Badge variant="outline" className="text-xs border-primary">
              +{remainingCount} more
            </Badge>
          )}
        </div>
      </div>
    </div>
  );
};

// Custom component for rendering bot messages with potential user recommendations
const BotMessage = ({
  message,
  messageIndex,
  onNavigate,
}: {
  message: ExtendedMessage;
  messageIndex: number;
  onNavigate: (path: string) => void;
}) => {
  // Check if the message has content that includes user recommendations
  const hasUserRecommendations =
    typeof message.text === "object" &&
    "users" in message.text &&
    Array.isArray(message.text.users);

  // Extract the message text and user recommendations if available
  const messageText = hasUserRecommendations
    ? (message.text as MessageContent).message
    : typeof message.text === "string"
    ? message.text
    : "";

  const users = hasUserRecommendations
    ? (message.text as MessageContent).users || []
    : [];

  return (
    <div className="flex items-start gap-2 mb-4">
      <Avatar className="h-8 w-8">
        <AvatarImage src="/bondchat.svg" alt="Bond Chat" />
        <AvatarFallback>BC</AvatarFallback>
      </Avatar>
      <div className="flex-1 max-w-[80%]">
        <div className="bg-muted p-3 rounded-lg text-foreground rounded-tl-none">
          <p className="break-words">{messageText}</p>
          <span className="text-xs opacity-70 block text-right mt-1">
            {message.timestamp}
          </span>
        </div>

        {users.length > 0 && (
          <div className="mt-2">
            {users.map((user, index) => {
              const key = `${messageIndex}-user-${index}-${user._id}`;
              return <UserCard key={key} user={user} onNavigate={onNavigate} />;
            })}
          </div>
        )}
      </div>
    </div>
  );
};

// Custom component for user messages
const UserMessage = ({ message }: { message: ExtendedMessage }) => {
  return (
    <div className="flex items-start gap-2 mb-4 flex-row-reverse">
      <div className="bg-primary p-3 rounded-lg text-primary-foreground rounded-tr-none max-w-[70%]">
        <p className="break-words">
          {typeof message.text === "string" ? message.text : ""}
        </p>
        <span className="text-xs opacity-70 block text-right mt-1  ">
          {message.timestamp}
        </span>
      </div>
    </div>
  );
};

// Helper function to get current location
const getCurrentLocation = (): Promise<{ latitude: number; longitude: number } | null> => {
  return new Promise((resolve) => {
    if (!navigator.geolocation) {
      console.warn("Geolocation is not supported by this browser.");
      resolve(null);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        resolve({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
        });
      },
      (error) => {
        console.warn(`Error getting location: ${error.message}`);
        resolve(null);
      },
      {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 60000,
      }
    );
  });
};

export default function BondChat() {
  const [messages, setMessages] = useState<ExtendedMessage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSpeakerOn, setIsSpeakerOn] = useState(true);
  const [voiceType, setVoiceType] = useState<string>("male");
  const [audioRef, setAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);
  const isSpeakerOnRef = useRef(false); // Add a ref to track current speaker state
  const voiceTypeRef = useRef<string>("male"); // Updated ref for voice type to use "male"
  const [isBotTyping, setIsBotTyping] = useState(false); // Add state for typing indicator
  const [isWaitingForResponse, setIsWaitingForResponse] = useState(false); // Add state to track if waiting for response

  // Add new state for speech recognition active
  const [isSpeechActive, setIsSpeechActive] = useState(false);
  const [showExitDialog, setShowExitDialog] = useState(false);

  // Add ref for ChatInput component
  const chatInputRef = useRef<ChatInputRef>(null);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { socket, isConnected } = useSocket();
  const [executeGetMessages] = useApiCall(getMessages);
  const [executeStartMessage] = useApiCall(startMessage);
  const userId = localStorage.getItem("userId") || "";
  const [chatRoomId, setChatRoomId] = useState<string | null>(null);
  const BOT_ID = import.meta.env.VITE_BOT_ID; // Access the bot ID from environment variables
  const deviceId = localStorage.getItem("deviceId") || "";

  const dispatch = useDispatch();
  const navigate = useNavigate();

  // Define voice options with lock status
  const maleVoices = [
    { name: "Michael", value: "male", locked: false },
    { name: "Robert", value: "Robert", locked: true },
    { name: "Lonnie", value: "Lonnie", locked: true },
  ];

  const femaleVoices = [
    { name: "Vanessa", value: "female", locked: false },
    { name: "Sonia", value: "Sonia", locked: true },
    { name: "Mabel", value: "Mabel", locked: true },
  ];

  // Update refs when states change
  useEffect(() => {
    isSpeakerOnRef.current = isSpeakerOn;
  }, [isSpeakerOn]);

  useEffect(() => {
    voiceTypeRef.current = voiceType;
  }, [voiceType]);

  // Set activeChat to null when component mounts
  useEffect(() => {
    dispatch(setActiveChat(null));

    // Cleanup when component unmounts
    return () => {
      // Make sure all speech recognition instances are stopped
      stopAllRecognitionInstances();
    };
  }, [dispatch]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Add new useEffect to handle scrolling when typing indicator state changes
  useEffect(() => {
    if (isBotTyping) {
      scrollToBottom();
    }
  }, [isBotTyping]);

  // Function to toggle the speaker state
  const toggleSpeaker = () => {
    const newSpeakerState = !isSpeakerOn;
    setIsSpeakerOn(newSpeakerState);

    // Instead of stopping playback, just adjust the volume
    if (audioRef) {
      audioRef.volume = newSpeakerState ? 1 : 0;
    }
  };

  // Function to select voice type
  const selectVoice = (type: string) => {
    setVoiceType(type);
  };

  // Function to play audio from base64 string when received
  const playAudioFromBase64 = (base64Audio: string) => {
    if (!base64Audio) return;

    try {
      // First completely stop and clean up any existing audio
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
        audioRef.onplaying = null;
        audioRef.onended = null;
        audioRef.onpause = null;
        audioRef.onerror = null;
        setAudioRef(null);
        setIsAudioPlaying(false);
      }

      // Create audio source from base64
      const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);

      // Set volume based on current speaker state
      audio.volume = isSpeakerOnRef.current ? 1 : 0;

      setAudioRef(audio);

      // Set up event handlers
      audio.onplaying = () => {
        setIsAudioPlaying(true);
      };

      audio.onended = audio.onpause = () => {
        setIsAudioPlaying(false);
      };

      audio.onerror = () => {
        setAudioRef(null);
        setIsAudioPlaying(false);
        toast.error("Audio playback failed");
      };

      // Play the audio regardless of speaker state
      audio.play().catch((error) => {
        console.error("Audio playback error:", error);
        toast.error("Failed to play audio");
        setAudioRef(null);
        setIsAudioPlaying(false);
      });
    } catch (error) {
      console.error("Error playing audio:", error);
      toast.error("Failed to process audio data");
      setIsAudioPlaying(false);
    }
  };

  // Socket connection and message fetching effect
  useEffect(() => {
    if (!socket || !isConnected || !userId) return;

    // Initialize the chat with the bot
    const initializeChat = async () => {
      setIsLoading(true);

      // First call start-message API to get or create the chat room
      const startMessageResult = await executeStartMessage({
        userId2: BOT_ID, // Use the bot ID from environment variables
      });

      if (startMessageResult.success && startMessageResult.data) {
        const roomId = startMessageResult.data.chatRoom.chatRoomId;
        setChatRoomId(roomId);
        console.log("Chat initialized with room ID:", roomId);

        // Join the room
        socket.emit("join", roomId);

        // Now fetch messages for this room
        const result = await executeGetMessages({
          roomId,
          page: 1,
          limit: 50,
        });

        if (result.success && result.data) {
          const messageHistory = result.data.messages
            .map((msg: MessageHistoryItem) => {
              // Try to parse content if it's a string that might be JSON
              let parsedContent: string | MessageContent = msg.content;
              if (typeof msg.content === "string") {
                try {
                  const possibleJson = JSON.parse(msg.content);
                  if (possibleJson && typeof possibleJson === "object") {
                    parsedContent = possibleJson as MessageContent;
                  }
                } catch {
                  // Not JSON, keep as string
                }
              }

              return {
                id: parseInt(msg._id) || Date.now(),
                text: parsedContent,
                timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                }),
                isUser: msg.senderId === userId,
                avatar:
                  msg.senderId === userId
                    ? "/profile/user.png"
                    : "/bondchat.svg",
                username: msg.senderId === userId ? "You" : "Bond Chat",
                media: msg.media,
              };
            })
            .reverse(); // Reverse to show newest at the bottom
          setMessages(messageHistory);
        }
      } else {
        toast.error("Failed to initialize chat");
        console.error("Start message failed:", startMessageResult);
      }

      setIsLoading(false);
    };

    initializeChat();

    // Set up socket event listeners
    const handleReceiveMessage = (data: MessageResponse) => {
      console.log("Received message:", data);
      if (data.senderId === userId && data.deviceId === deviceId) {
        console.log("Skipping message from same device", data);
        return;
      }

      // Hide typing indicator when bot message is received
      setIsBotTyping(false);
      
      // Allow sending new messages now that we've received a response
      setIsWaitingForResponse(false);

      const isFromCurrentUser = data.senderId === userId;

      // Handle different content types
      let messageContent: string | MessageContent =
        typeof data.content === "string" ? data.content : data.content;

      // If content is a string but might be JSON, try to parse it
      if (typeof data.content === "string") {
        try {
          const possibleJson = JSON.parse(data.content);
          if (possibleJson && typeof possibleJson === "object") {
            messageContent = possibleJson as MessageContent;
          }
        } catch {
          console.log("Not JSON, keep as string");
        }
      }

      const newMsg: ExtendedMessage = {
        id: data._id ? parseInt(data._id) : Date.now(),
        text: messageContent,
        timestamp: new Date(
          data.timestamp ? data.timestamp * 1000 : Date.now()
        ).toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
        isUser: isFromCurrentUser,
        avatar: "/bondchat.svg",
        username: "Bond Chat",
        media: data.media, // Store audio data from Polly if available
      };

      console.log("Adding message:", newMsg);

      setMessages((prev) => [...prev, newMsg]);

      if (isFromCurrentUser) {
        setTimeout(() => setIsBotTyping(true), 400);
      }

      // Play audio if we have audio data - regardless of speaker state
      // Volume will be set based on isSpeakerOnRef.current
      if (data.media && data.deviceId === deviceId) {
        playAudioFromBase64(data.media);
      }
    };

    // Add event listeners
    socket.on("receiveMessage", handleReceiveMessage);

    // Clean up function
    return () => {
      socket.off("receiveMessage", handleReceiveMessage);
      // Leave the room when component unmounts
      if (chatRoomId) {
        socket.emit("leave", chatRoomId);
      }
      // Clean up audio
      if (audioRef) {
        audioRef.pause();
        audioRef.currentTime = 0;
        setIsAudioPlaying(false);
      }
    };
  }, [socket, isConnected, userId, BOT_ID]);

  // Effect to handle existing messages' audio when speaker toggle changes
  useEffect(() => {
    // Update volume of existing audio when speaker state changes
    if (audioRef) {
      audioRef.volume = isSpeakerOn ? 1 : 0;
    }
  }, [isSpeakerOn]);

  const handleSendMessage = async (text: string) => {
    if (!userId || !chatRoomId) {
      toast.error("Chat not initialized properly.");
      return;
    }

    // Stop any currently playing audio
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      audioRef.onplaying = null;
      audioRef.onended = null;
      audioRef.onpause = null;
      audioRef.onerror = null;
      setAudioRef(null);
      setIsAudioPlaying(false);
    }

    // Set waiting for response to true to prevent sending another message
    setIsWaitingForResponse(true);

    // Show typing indicator when message is sent
    setTimeout(() => setIsBotTyping(true), 700);

    // Get current location
    const location = await getCurrentLocation();

    // Create message data
    const messageData = {
      senderId: userId,
      content: text,
      entityId: chatRoomId, // Use the roomId from start-message API
      media: null,
      entity: "chat",
      isBot: true, // Set isBot flag to true
      senderName: "You",
      senderAvatar: "/profile/user.png",
      isSpeakerOn: isSpeakerOnRef.current, // Use ref value to ensure latest state
      voice: voiceTypeRef.current, // Always send voice type regardless of speaker status
      deviceId: deviceId,
      location: location, // Add the location object (will be null if fetching failed)
    };

    // Add message to local state immediately for better UX
    const tempMessage: ExtendedMessage = {
      id: Date.now(),
      text,
      timestamp: new Date().toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      }),
      isUser: true,
      avatar: "/profile/user.png",
      username: "You",
    };
    setMessages((prev) => [...prev, tempMessage]);

    // Send message through socket
    if (socket && isConnected) {
        socket.emit("sendMessage", messageData, (response: SendMessageResponse) => {
          if (!response.success) {
            toast.error("Failed to send message");
          }
        });
    } else {
        console.error("Socket not connected, cannot send message.");
        toast.error("Cannot connect to chat. Please try again later.");
        // Optionally revert the optimistic message addition
        setMessages((prev) => prev.filter(msg => msg.id !== tempMessage.id));
        setIsWaitingForResponse(false); // Allow user to try again if socket disconnected
        setIsBotTyping(false);
    }
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "end",
    });
  };

  // Update handleSpeechStateChange function to track speech recognition state
  const handleSpeechStateChange = (isActive: boolean) => {
    setIsSpeechActive(isActive);
  };

  // Add new function to handle navigation
  const handleNavigation = (path?: string) => {
    // Always clean up audio regardless of speech state
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setIsAudioPlaying(false);
    }

    // Only turn off speech recognition if it's active
    if (isSpeechActive) {
      // Force stop speech recognition
      if (chatInputRef.current) {
        chatInputRef.current.forceStopListening();
      }
      stopAllRecognitionInstances();
      setIsSpeechActive(false);
    }

    // Navigate to the specified path or back
    if (path) {
      navigate(path);
    } else {
      navigate(-1);
    }
  };

  // Add confirmation dialog exit handler
  const handleConfirmExit = () => {
    setShowExitDialog(false);

    // First explicitly turn off speech recognition in the ChatInput component
    if (chatInputRef.current) {
      chatInputRef.current.forceStopListening();
    }

    // Clean up audio
    if (audioRef) {
      audioRef.pause();
      audioRef.currentTime = 0;
      setIsAudioPlaying(false);
    }

    // Make sure speech recognition is turned off and mic button is toggled off
    stopAllRecognitionInstances();
    setIsSpeechActive(false);

    // Use the navigate function from react-router instead of window.history.back()
    navigate(-1);
  };

  // Add a new useEffect to handle beforeunload event
  useEffect(() => {
    // Handle browser back button and page refresh
    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      if (isSpeechActive) {
        // Standard way to show a confirmation dialog when leaving page
        e.preventDefault();
        e.returnValue = "";
        return "";
      }
    };

    // Handle browser navigation (history)
    const handlePopState = () => {
      // Only turn off speech recognition if it's active
      if (isSpeechActive && chatInputRef.current) {
        chatInputRef.current.forceStopListening();
        stopAllRecognitionInstances();
        setIsSpeechActive(false);
      }

      // Note: No need to call navigate here as the browser will handle the navigation
    };

    // Add event listeners
    window.addEventListener("beforeunload", handleBeforeUnload);
    window.addEventListener("popstate", handlePopState);

    // Clean up
    return () => {
      window.removeEventListener("beforeunload", handleBeforeUnload);
      window.removeEventListener("popstate", handlePopState);
    };
  }, [isSpeechActive]);

  return (
    <div className="flex flex-col bg-background relative h-[calc(100vh-64px)] overflow-hidden">
      <div className="flex items-center gap-3 p-4 border-b">
        <Button
          variant="ghost"
          size="icon"
          className="cursor-pointer"
          onClick={() => {
            // Always clean up audio regardless of speech state
            if (audioRef) {
              audioRef.pause();
              audioRef.currentTime = 0;
              setIsAudioPlaying(false);
            }

            // Only turn off speech recognition if it's active
            if (isSpeechActive) {
              // Force stop any speech recognition
              if (chatInputRef.current) {
                chatInputRef.current.forceStopListening();
              }
              stopAllRecognitionInstances();
              setIsSpeechActive(false);
            }

            // Always navigate back using react-router
            navigate("/");
          }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>
        <div className="flex items-center gap-2">
          <img src="/bondchat.svg" alt="Bond Chat" className="w-8 h-8" />
          <span className="font-medium grad">BondChat</span>
          <div className="bg-muted rounded-full border-1 pb-1 border-primary">
            <span className="text-xs px-2 text-foreground">Basic</span>
          </div>
        </div>
        <div className="ml-auto gap-2 flex items-center">
          {/* <Button
            size="sm"
            variant="default"
            className="rounded-full cursor-pointer"
          >
            New +
          </Button> */}
          <div className="flex items-center">
            <Button
              size="icon"
              variant="ghost"
              className={`rounded-full text-muted-foreground cursor-pointer ${
                isSpeakerOn ? "text-foreground" : ""
              } relative`}
              onClick={toggleSpeaker}
              // disabled={messages.length === 0}
            >
              <Volume2 className="h-8 w-8" />
              {!isSpeakerOn && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-[60%] h-[1.5px] bg-current rotate-45 transform origin-center"></div>
                </div>
              )}
            </Button>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant="outline"
                  size="sm"
                  className="ml-1 h-8 px-2 cursor-pointer"
                >
                  {maleVoices.find((v) => v.value === voiceType)?.name ||
                    femaleVoices.find((v) => v.value === voiceType)?.name ||
                    voiceType}
                  <ChevronsUpDown className="ml-1 h-3 w-3 opacity-50" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-40">
                <div className="p-2 text-xs text-muted-foreground font-medium">
                  Male Voices
                </div>

                {maleVoices.map((voice) => (
                  <DropdownMenuItem
                    key={voice.name}
                    onClick={() => !voice.locked && selectVoice(voice.value)}
                    disabled={voice.locked}
                    className={
                      voice.locked
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }
                  >
                    <Check
                      className={`h-4 w-4 ${
                        voiceType === voice.value ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <img
                      src="/bondChat/man.svg"
                      alt="Male voice"
                      className="w-5 h-5"
                    />
                    {voice.name}
                    {voice.locked && (
                      <span className="ml-auto">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-lock text-muted-foreground"
                        >
                          <rect
                            width="18"
                            height="11"
                            x="3"
                            y="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}

                <div className="p-2 text-xs text-muted-foreground font-medium">
                  Female Voices
                </div>

                {femaleVoices.map((voice) => (
                  <DropdownMenuItem
                    key={voice.name}
                    onClick={() => !voice.locked && selectVoice(voice.value)}
                    disabled={voice.locked}
                    className={
                      voice.locked
                        ? "cursor-not-allowed opacity-60"
                        : "cursor-pointer"
                    }
                  >
                    <Check
                      className={`h-4 w-4 ${
                        voiceType === voice.value ? "opacity-100" : "opacity-0"
                      }`}
                    />
                    <img
                      src="/bondChat/woman.svg"
                      alt="Female voice"
                      className="w-5 h-5"
                    />
                    {voice.name}
                    {voice.locked && (
                      <span className="ml-auto">
                        <svg
                          xmlns="http://www.w3.org/2000/svg"
                          width="16"
                          height="16"
                          viewBox="0 0 24 24"
                          fill="none"
                          stroke="currentColor"
                          strokeWidth="2"
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          className="lucide lucide-lock text-muted-foreground"
                        >
                          <rect
                            width="18"
                            height="11"
                            x="3"
                            y="11"
                            rx="2"
                            ry="2"
                          />
                          <path d="M7 11V7a5 5 0 0 1 10 0v4" />
                        </svg>
                      </span>
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
          {/* <Button
            size="icon"
            variant="ghost"
            className="rounded-full text-muted-foreground cursor-pointer"
          >
            <History />
          </Button> */}
        </div>
      </div>

      <div className="flex-1 flex flex-col overflow-hidden h-full relative">
        {messages.length === 0 && !isLoading ? (
          <div className="flex-1 flex flex-col justify-center h-full p-4 mb-20 font-bold capitalize text-6xl space-y-3">
            <h3 className="">Welcome, </h3>
            <h3 className="">
              To <span className="grad">BondChat</span>
            </h3>
            <div className="flex flex-row items-center">
              <p className="text-muted-foreground font-normal text-xl">
                Choose your persona
              </p>
              <img
                src="/bondChat/man.svg"
                alt="Male voice"
                className="w-5 h-5 ml-1 -mr-1"
              />
              <img
                src="/bondChat/woman.svg"
                alt="Male voice"
                className="w-5 h-5"
              />
            </div>
          </div>
        ) : (
          <div className="flex-1 overflow-y-auto p-4 mb-20">
            {isLoading ? (
              <div className="flex flex-col justify-center h-full opacity-80 transition-opacity duration-300">
                <LogoLoader size="md" pulseSpeed={1.5} opacity={0.7} />
              </div>
            ) : (
              <div className="animate-in fade-in-0 duration-300">
                {messages.map((message, index) =>
                  message.isUser ? (
                    <UserMessage key={index} message={message} />
                  ) : (
                    <BotMessage
                      key={index}
                      message={message}
                      messageIndex={index}
                      onNavigate={handleNavigation}
                    />
                  )
                )}
                {isBotTyping && (
                  <div className="flex items-start gap-2 mb-4">
                    <Avatar className="h-8 w-8">
                      <AvatarImage src="/bondchat.svg" alt="Bond Chat" />
                      <AvatarFallback>BC</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 max-w-[80%]">
                      <TypingIndicator />
                    </div>
                  </div>
                )}
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0">
          <ChatInput
            onSendMessage={handleSendMessage}
            placeholder={
              isLoading
                ? "Loading conversation..."
                : isWaitingForResponse
                  ? "Waiting for response..."
                  : "Type Your Message Here..."
            }
            disabled={!!(isLoading || isWaitingForResponse)}
            isAudioPlaying={isAudioPlaying}
            expectAudioAfterSend={isSpeakerOn}
            onSpeechStateChange={handleSpeechStateChange}
            ref={chatInputRef}
          />
        </div>
      </div>

      {/* Add confirmation dialog */}
      <Dialog open={showExitDialog} onOpenChange={setShowExitDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Speech Recognition Active</DialogTitle>
            <DialogDescription>
              You currently have speech recognition (microphone) active. If you
              leave now, your recording will be stopped. Would you like to
              continue?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex justify-between sm:justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowExitDialog(false)}
            >
              Stay on Page
            </Button>
            <Button
              type="button"
              variant="destructive"
              onClick={handleConfirmExit}
            >
              Leave Anyway
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
