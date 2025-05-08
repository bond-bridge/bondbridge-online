import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { cn, getRelativeTime } from "@/lib/utils";
import { setActiveChat, ChatItem } from "@/store/chatSlice";
import { useAppDispatch } from "../../store";
import { isPostShare, isStoryReply } from "@/utils/messageUtils";

interface ChatListProps {
  chats: ChatItem[];
  isLoading: boolean;
  onSelectChat: (chat: ChatItem) => void;
}

const ChatList = ({ chats, isLoading, onSelectChat }: ChatListProps) => {
  const dispatch = useAppDispatch();

  const handleChatSelect = (chat: ChatItem) => {
    dispatch(setActiveChat(chat));
    onSelectChat(chat);
  };

  // Function to format the last message
  const formatLastMessage = (message: string) => {
    try {
      // Check if message is a shared post
      if (isPostShare(message)) {
        return "Shared a post";
      }
      
      // Check if message is a story reply
      if (isStoryReply(message)) {
        return "Replied to a story";
      }

      // If message is a JSON string, try to parse it
      if (typeof message === 'string' && message.startsWith('{')) {
        const parsedMessage = JSON.parse(message);
        if (parsedMessage.content) {
          return parsedMessage.content;
        }
      }

      // Return original message if none of the above conditions are met
      return message;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (error : any) {
      // If any parsing fails, return the original message
      console.error("Error parsing message:", error);
      return message;
    }
  };

  if (isLoading) {
    return <div className="flex justify-center p-4">Loading chats...</div>;
  }

  return (
    <div className="space-y-1 ">
      {chats.map((chat) => (
        <div
          key={chat.id}
          className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer"
          onClick={() => handleChatSelect(chat)}
        >
          <div className="flex items-center gap-3 max-w-[calc(100%-70px)]">
            <Avatar className="h-12 w-12">
              <AvatarImage src={chat.avatar} alt={chat.name} />
              <AvatarFallback>{chat.name?.[0]}</AvatarFallback>
            </Avatar>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <h3
                  className={cn("font-medium", chat.unread && "font-semibold")}
                >
                  {chat.name}
                </h3>
                {chat.unread && (
                  <div className="w-2 h-2 rounded-full bg-primary"></div>
                )}
              </div>
              <p className="text-sm text-muted-foreground truncate">
                {formatLastMessage(chat.lastMessage)}
              </p>
            </div>
          </div>
          <span className="text-xs text-muted-foreground">
            {getRelativeTime(chat.updatedAt)}
          </span>
        </div>
      ))}
    </div>
  );
};

export default ChatList;
