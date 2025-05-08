import React, { useRef, useEffect, useState } from "react";
import { useSocket } from "@/context/SocketContext";
import {
  Message,
  addMessage,
  setIsTyping,
  setLoadingMessages,
  setMessages,
  addReaction,
  removeReaction,
  updateMessageId,
} from "@/store/chatSlice";
import { useApiCall } from "@/apis/globalCatchError";
import { getMessages, getRandomText } from "@/apis/commonApiCalls/chatApi";
import { useAppDispatch, useAppSelector } from "@/store";
import { store } from "@/store"; // Import the store directly for advanced state access
import {
  blockUser as blockUserApi,
  leaveGroup as leaveGroupApi,
  inviteToGroup as inviteToGroupApi,
} from "@/apis/commonApiCalls/activityApi";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { EditGroupModal } from "../EditGroupModal";
import { Skeleton } from "@/components/ui/skeleton";
import { fetchFollowersList } from "@/apis/commonApiCalls/profileApi";
import { SimpleFollower } from "./InviteFollowers";
import { isPostShare, isStoryReply } from "@/utils/messageUtils";

// Components
import ChatHeader from "./ChatHeader";
import MessageList from "./MessageList";
import MessageInput from "./MessageInput";
import GroupProfile from "./GroupProfile";
import InviteFollowers from "./InviteFollowers";

// Import menu items
import {
  BlockMenuItem,
  ReportMenuItem,
  EditGroupMenuItem,
} from "@/components/global/ThreeDotsMenu";

// Define types for socket responses
interface MessageResponse {
  _id?: string;
  content: string;
  senderId: string;
  timestamp?: number;
  roomId?: string;
  senderName?: string;
  senderAvatar?: string;
  replyTo?: string;
  tempId?: string; // Original tempId field
  clientTempId?: string; // Add clientTempId for message matching
  deviceId?: string;
}

interface TypingResponse {
  chatId: string;
  senderId: string;
}

interface SendMessageResponse {
  success: boolean;
  message?: string;
  data?: {
    _id: string;
    content: string;
    timestamp: number;
    replyTo?: string;
  };
}

interface ChatInterfaceProps {
  chatId: string;
  name: string;
  avatar: string;
  onClose: () => void;
}

const ChatInterface: React.FC<ChatInterfaceProps> = ({
  chatId,
  name,
  avatar,
  onClose,
}) => {
  // State
  const [newMessage, setNewMessage] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [isEditGroupModalOpen, setIsEditGroupModalOpen] = useState(false);
  const [showGroupProfile, setShowGroupProfile] = useState(false);
  const [showInviteView, setShowInviteView] = useState(false);
  const [followers, setFollowers] = useState<SimpleFollower[]>([]);
  const [filteredFollowers, setFilteredFollowers] = useState<SimpleFollower[]>(
    []
  );
  const [searchTerm, setSearchTerm] = useState("");
  const [isLoadingFollowers, setIsLoadingFollowers] = useState(false);
  const [selectedFollowers, setSelectedFollowers] = useState<string[]>([]);
  const [isInviting, setIsInviting] = useState(false);
  const [replyToMessage, setReplyToMessage] = useState<Message | null>(null);

  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Hooks
  const { socket } = useSocket();
  const userId = localStorage.getItem("userId") || "";
  const deviceId = localStorage.getItem("deviceId") || "";

  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const {
    messages,
    isLoadingMessages,
    isTyping,
    activeChat: chat,
  } = useAppSelector((state) => state.chat);
  console.log(chat)

  // API calls
  const [executeGetMessages] = useApiCall(getMessages);
  const [executeGetRandomText] = useApiCall(getRandomText);
  const [executeBlockUser] = useApiCall(blockUserApi);
  const [executeLeaveGroup] = useApiCall(leaveGroupApi);
  const [executeFetchFollowers] = useApiCall(fetchFollowersList);
  const [executeInviteToGroup] = useApiCall(inviteToGroupApi);

  useEffect(() => {
    setReplyToMessage(null);
    setNewMessage("");
  }, [chatId]);

  // Find other user's ID in DM chat
  const otherUserId =
    chat?.type === "dm"
      ? chat.participants.find((p) => p.userId !== userId)?.userId
      : undefined;

  // Find current user's info from participants
  const currentUserInfo = chat?.participants.find((p) => p.userId === userId);
  const userName = currentUserInfo?.name || "You";
  const userAvatar = currentUserInfo?.profilePic || "";

  // Find if the current user has left the group
  const currentUserParticipant = chat?.participants.find(
    (p) => p.userId === userId
  );
  const hasLeftGroup = currentUserParticipant?.status === "left";

  // Combined useEffect for fetching messages and suggestions
  useEffect(() => {
    const fetchMessageHistory = async () => {
      if (!chatId) {
        console.error("Invalid chat ID:", chatId);
        return;
      }

      dispatch(setLoadingMessages(true));
      dispatch(setMessages([]));

      const result = await executeGetMessages({
        roomId: chatId,
        page: 1,
        limit: 50,
      });

      if (result.success && result.data) {
        const messageHistory = result.data.messages
          .map((msg) => {
            // Find sender info from participants
            const sender = chat?.participants.find(
              (p) => p.userId === msg.senderId
            );
            return {
              id: msg._id,
              text: msg.content,
              timestamp: new Date(msg.createdAt).toLocaleTimeString([], {
                hour: "2-digit",
                minute: "2-digit",
              }),
              senderId: msg.senderId,
              isUser: msg.senderId === userId,
              senderName:
                msg.senderId === userId ? userName : sender?.name || "Unknown",
              senderAvatar:
                msg.senderId === userId ? userAvatar : sender?.profilePic || "",
              replyTo: msg.replyTo || undefined,
            };
          })
          .reverse(); // Reverse the order of messages
        dispatch(setMessages(messageHistory));

        // If no messages were found, fetch suggestions
        if (messageHistory.length === 0 && chat) {
          await fetchSuggestions();
        } else {
          // Clear suggestions if there are messages
          setSuggestions([]);
        }
      }

      dispatch(setLoadingMessages(false));
    };

    const fetchSuggestions = async () => {
      setLoadingSuggestions(true);

      // For groups where otherUserId might not exist, find the first participant who isn't the current user
      let targetUserId = otherUserId;

      if (!targetUserId && chat?.participants && chat.participants.length > 0) {
        // Find the first non-current user participant
        const firstOtherParticipant = chat.participants.find(
          (p) => p.userId !== userId
        );
        if (firstOtherParticipant) {
          targetUserId = firstOtherParticipant.userId;
        }
      }

      // If we still don't have a target user ID, use a fallback or empty string
      targetUserId = targetUserId || "";

      const result = await executeGetRandomText(targetUserId);
      if (result.success && result.data?.topic) {
        // Parse the topic string into individual suggestions
        const suggestionText = result.data.topic;
        const parsedSuggestions = suggestionText
          .split("\n")
          .map((line: string) => {
            // Extract the text between quotes
            const match = line.match(/"([^"]+)"/);
            return match ? match[1] : "";
          })
          .filter(Boolean);

        setSuggestions(parsedSuggestions);
      }
      setLoadingSuggestions(false);
    };

    if (socket && chatId) {
      // Join the chat room
      socket.emit("join", chatId);
      
      // Check if user has left the group before fetching messages
      if (hasLeftGroup) {
        dispatch(setLoadingMessages(false));
      } else {
        fetchMessageHistory();
      }

      // Set up socket event listeners
      const handleReceiveMessage = (data: MessageResponse) => {
        // Clear suggestions when receiving a message
        setSuggestions([]);

        console.log("Received message:", data);

        // If this is not for our chat room, ignore it
        if (data.roomId !== chatId) {
          return;
        }

        // Check if the message is from current user
        const isFromCurrentUser = data.senderId === userId;
        const isPost = isPostShare(data.content);
        const isStoryReplyMessage = isStoryReply(data.content);
        let isFromSameDevice = true;
        if (data.deviceId) {
          isFromSameDevice = data.deviceId === deviceId;
        }

        // Check if this message has our clientTempId (special case for matching our own sent messages)
        if (
          isFromCurrentUser &&
          data._id &&
          (data.clientTempId || data.tempId)
        ) {
          const tempId = data.clientTempId || data.tempId;
          if (tempId && tempId.startsWith("temp-")) {
            // This is one of our messages that now has a server ID
            console.log("Found matching temp message with ID:", tempId);

            dispatch(
              updateMessageId({
                oldId: tempId,
                newId: data._id,
              })
            );
            return; // Don't add a duplicate message
          }
        }

        // For normal messages from us (no tempId), try to match based on content
        if (isFromCurrentUser && !isPost && !isStoryReplyMessage && data._id) {
          // Use the current redux state directly instead of the messages variable
          // which might be stale due to the async nature of hooks
          const state = store.getState();
          const currentMessages = state.chat.messages;

          // Try to find our temporary message with the same content
          const existingTempMsg = currentMessages.find((msg: Message) => {
            return (
              msg.senderId === userId &&
              msg.text === data.content &&
              msg.id.startsWith("temp-")
            );
          });

          console.log("DATA", data);
          console.log("Existing temp message:", existingTempMsg);

          if (existingTempMsg) {
            // Update the message ID with the server-generated one
            dispatch(
              updateMessageId({
                oldId: existingTempMsg.id,
                newId: data._id,
              })
            );
            return; // Don't add a duplicate message
          }
        }

        // If it's not a post share and it's from the current user, we've probably already added it
        if (!isPost && !isStoryReplyMessage && isFromCurrentUser && isFromSameDevice) {
          return;
        }

        const sender = chat?.participants.find(
          (p) => p.userId === data.senderId
        );

        const newMsg: Message = {
          id: data._id || `temp-${Date.now()}`,
          text: data.content,
          timestamp: new Date(
            data.timestamp ? data.timestamp * 1000 : Date.now()
          ).toLocaleTimeString([], {
            hour: "2-digit",
            minute: "2-digit",
          }),
          isUser: isFromCurrentUser,
          senderName:
            data.senderId === userId
              ? userName
              : sender?.name || data.senderName || "Unknown",
          senderAvatar:
            data.senderId === userId
              ? userAvatar
              : sender?.profilePic || data.senderAvatar || "",
          senderId: data.senderId,
          replyTo: data.replyTo,
        };

        // Add additional logging for post shares
        if (isPost) {
          console.log("Received a post share:", {
            from: data.senderId,
            isOwnPost: isFromCurrentUser,
          });
        }
        if(isStoryReplyMessage) {
          console.log("Received a story reply:", {
            from: data.senderId,
            isOwnPost: isFromCurrentUser,
          });
        }

        dispatch(addMessage(newMsg));
      };

      const handleTypingEvent = (data: TypingResponse) => {
        if (data.chatId === chatId && data.senderId !== userId) {
          dispatch(setIsTyping(true));
          if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
          }
          typingTimeoutRef.current = setTimeout(() => {
            dispatch(setIsTyping(false));
          }, 2000);
        }
      };

      // New handlers for reactions
      const handleMessageReaction = (data: {
        messageId: string;
        reaction: string;
        userId: string;
        timestamp: number;
      }) => {
        console.log("Received reaction:", data);
        const { messageId, reaction, userId: reactionUserId, timestamp } = data;

        // Find the message to add the reaction to
        dispatch(
          addReaction({
            messageId,
            reaction: { userId: reactionUserId, reaction, timestamp },
          })
        );
      };

      const handleReactionRemoved = (data: {
        messageId: string;
        userId: string;
      }) => {
        const { messageId, userId: reactionUserId } = data;

        // Remove the reaction from the message
        dispatch(removeReaction({ messageId, userId: reactionUserId }));
      };

      // Add event listeners
      socket.on("receiveMessage", handleReceiveMessage);
      socket.on("typing", handleTypingEvent);
      socket.on("messageReaction", handleMessageReaction);
      socket.on("reactionRemoved", handleReactionRemoved);

      // Clean up function
      return () => {
        socket.off("receiveMessage", handleReceiveMessage);
        socket.off("typing", handleTypingEvent);
        socket.off("messageReaction", handleMessageReaction);
        socket.off("reactionRemoved", handleReactionRemoved);
        if (typingTimeoutRef.current) {
          clearTimeout(typingTimeoutRef.current);
        }
        // Leave the room when component unmounts or chat changes
        socket.emit("leave", chatId);
      };
    }
  }, [socket, chatId, userId, chat, hasLeftGroup]);

  // Handlers
  const handleSendMessage = () => {
    if (newMessage.trim() && socket && chatId) {
      // Create a timestamp for consistency
      const now = new Date();
      const timestamp = now.toLocaleTimeString([], {
        hour: "2-digit",
        minute: "2-digit",
      });

      // Generate a unique temp ID for this message
      const tempId = `temp-${now.getTime()}`;

      // Create message data for sending to server
      const messageData = {
        senderId: userId,
        content: newMessage,
        entityId: chatId,
        media: null,
        entity: "chat",
        isBot: false,
        senderName: userName,
        senderAvatar: userAvatar,
        replyTo: replyToMessage?.id,
        // Add the tempId as a custom property to help with matching on server response
        clientTempId: tempId, // Use a different name to avoid conflicts with server fields
        deviceId: deviceId,
      };

      // Add message to local state immediately for better UX
      const tempMessage: Message = {
        id: tempId,
        text: newMessage,
        timestamp: timestamp,
        isUser: true,
        senderId: userId,
        senderName: userName,
        senderAvatar: userAvatar,
        replyTo: replyToMessage?.id,
        deviceId: deviceId,
      };

      // First dispatch the message addition
      dispatch(addMessage(tempMessage));

      // Then send message through socket
      socket.emit(
        "sendMessage",
        messageData,
        (response: SendMessageResponse) => {
          console.log("Message sent response:", response);

          // If we get an immediate response with an ID, update the message ID right away
          if (response.success && response.data && response.data._id) {
            // Update via Redux - this is synchronous and will work immediately
            dispatch(
              updateMessageId({
                oldId: tempId, // Use the tempId we saved earlier
                newId: response.data._id,
              })
            );
          }
        }
      );

      // Clear input and reset reply
      setNewMessage("");
      setReplyToMessage(null);
    }
  };

  const handleTyping = () => {
    if (socket && chatId) {
      socket.emit("typing", { chatId: chatId, senderId: userId });
    }
  };

  const handleReplyToMessage = (message: Message) => {
    // Toggle reply - if already replying to this message, cancel it
    if (replyToMessage && replyToMessage.id === message.id) {
      setReplyToMessage(null);
    } else {
      setReplyToMessage(message);
    }
  };

  const handleCancelReply = () => {
    setReplyToMessage(null);
  };

  const handleProfileClick = () => {
    if (chat?.type === "dm") {
      // Navigate to the other user's profile
      const otherParticipant = chat.participants.find(
        (p) => p.userId !== userId
      );
      if (otherParticipant) {
        navigate(`/profile/${otherParticipant.userId}`);
      }
    } else if (chat?.type === "group") {
      // Toggle group profile view
      setShowGroupProfile(true);
    }
  };

  const handleBlock = async () => {
    if (chat?.type === "dm") {
      const otherParticipant = chat.participants.find(
        (p) => p.userId !== userId
      );
      if (otherParticipant) {
        await executeBlockUser(otherParticipant.userId);
        toast.success(`${otherParticipant.name} has been blocked`);
        onClose();
      }
    }
  };

  const handleEditGroup = () => {
    setIsEditGroupModalOpen(true);
  };

  const handleGroupUpdated = () => {
    // Refresh chat data or update local state as needed
    // This will be called after successful group update
  };

  const handleLeaveGroup = async () => {
    if (!chat || chat.type !== "group") return;
    const result = await executeLeaveGroup(chatId);

    if (result.success) {
      toast.success("Left the group successfully");
      onClose(); // Close the chat window
    }
  };

  // Inviting followers functions
  const fetchInvitableFollowers = async () => {
    if (!chat) return;

    setIsLoadingFollowers(true);

    // Call API
    const response = await executeFetchFollowers();

    if (response.success && response.data) {
      // Get participant IDs for filtering
      const groupParticipantIds = chat.participants.map((p) => p.userId);

      // Extract and process followers
      const invitableFollowers: SimpleFollower[] = [];

      // Process followers array
      const followersList = response.data.data || [];

      for (let i = 0; i < followersList.length; i++) {
        const follower = followersList[i];

        // Skip if already in the group
        if (groupParticipantIds.includes(follower._id)) continue;

        // Add to invitable list
        invitableFollowers.push({
          _id: follower._id,
          name: follower.name,
          avatar: follower.avatar || follower.profilePic || "",
          selected: false,
        });
      }

      setFollowers(invitableFollowers);
      setFilteredFollowers(invitableFollowers);

      // Show toast if no followers to invite
      if (invitableFollowers.length === 0) {
        toast.info("You don't have any followers to add to this group");
      }
    } else {
      toast.error("Failed to load followers");
    }

    setIsLoadingFollowers(false);
  };

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const term = e.target.value;
    setSearchTerm(term);

    if (term.trim() === "") {
      setFilteredFollowers(followers);
    } else {
      const filtered = followers.filter((follower) =>
        follower.name.toLowerCase().includes(term.toLowerCase())
      );
      setFilteredFollowers(filtered);
    }
  };

  const toggleFollowerSelection = (followerId: string) => {
    setFollowers((prevFollowers) =>
      prevFollowers.map((follower) =>
        follower._id === followerId
          ? { ...follower, selected: !follower.selected }
          : follower
      )
    );

    setFilteredFollowers((prevFiltered) =>
      prevFiltered.map((follower) =>
        follower._id === followerId
          ? { ...follower, selected: !follower.selected }
          : follower
      )
    );

    setSelectedFollowers((prev) =>
      prev.includes(followerId)
        ? prev.filter((id) => id !== followerId)
        : [...prev, followerId]
    );
  };

  const inviteFollowersToGroup = async () => {
    if (selectedFollowers.length === 0 || !chat) return;

    setIsInviting(true);

    // Call the add API
    const result = await executeInviteToGroup(chat.id, selectedFollowers);

    if (result.success) {
      toast.success(`Added ${selectedFollowers.length} people to the group`);
      setShowInviteView(false);
      setSelectedFollowers([]);
      setFollowers([]);
      setFilteredFollowers([]);
    } else {
      toast.error(result.data?.message || "Failed to add users to the group");
    }

    setIsInviting(false);
  };

  const handleShowAddView = async () => {
    setShowInviteView(true);
    await fetchInvitableFollowers();
  };

  // Add reaction to a message
  const handleAddReaction = (messageId: string, reaction: string) => {
    if (socket && chatId) {
      socket.emit("reactToMessage", {
        messageId,
        reaction,
        entityId: chatId,
      });

      // Optimistically update UI
      dispatch(
        addReaction({
          messageId,
          reaction: {
            userId,
            reaction,
            timestamp: Math.floor(Date.now() / 1000),
          },
        })
      );
    }
  };

  // Remove reaction from a message
  const handleRemoveReaction = (messageId: string) => {
    if (socket && chatId) {
      socket.emit("removeReaction", {
        messageId,
        entityId: chatId,
      });

      // Optimistically update UI
      dispatch(removeReaction({ messageId, userId }));
    }
  };

  // Prepare menu items based on chat type
  const menuItems = [];

  if (chat?.type === "dm") {
    // For DM chats -> block
    menuItems.push({
      ...BlockMenuItem,
      onClick: handleBlock,
    });
  } else if (chat?.type === "group") {
    // For group chats -> report, edit group (only for admin)
    menuItems.push({
      ...ReportMenuItem,
      onClick: () => console.log("Report clicked"),
    });

    // Only add edit group option for the admin
    if (chat.admin === userId) {
      menuItems.push({
        ...EditGroupMenuItem,
        onClick: handleEditGroup,
      });
    }
  }

  if (!chat) {
    return (
      <div className="h-full w-full flex justify-center items-center">
        <Skeleton className="h-full w-full" />
      </div>
    );
  }

  // Find the typing user
  const typingUser = isTyping
    ? chat.participants.find((p) => p.userId !== userId)
    : null;

  const showSuggestions =
    messages.length === 0 && !isLoadingMessages && suggestions.length > 0;

  // Render the InviteFollowers view
  if (showInviteView) {
    return (
      <InviteFollowers
        filteredFollowers={filteredFollowers}
        isLoadingFollowers={isLoadingFollowers}
        searchTerm={searchTerm}
        selectedFollowers={selectedFollowers}
        isInviting={isInviting}
        onSearchChange={handleSearchChange}
        onFollowerClick={toggleFollowerSelection}
        onInvite={inviteFollowersToGroup}
        onClose={() => {
          setShowInviteView(false);
          setSelectedFollowers([]);
          setSearchTerm("");
        }}
      />
    );
  }

  // Render the GroupProfile view
  if (showGroupProfile && chat.type === "group") {
    return (
      <GroupProfile
        name={chat.name}
        avatar={chat.avatar}
        bio={chat.bio}
        participants={chat.participants}
        admin={chat.admin || ""}
        currentUserId={userId}
        hasLeftGroup={hasLeftGroup}
        onBack={() => setShowGroupProfile(false)}
        onLeaveGroup={handleLeaveGroup}
        onAddMembers={handleShowAddView}
        groupId={chatId}
        onClose={onClose}
      />
    );
  }

  // Render the main chat interface
  return (
    <div className="h-full flex flex-col bg-background border-l">
      <ChatHeader
        name={name}
        avatar={avatar}
        chatType={chat.type}
        participantsCount={
          chat.participants.filter((p) => p.status === "active").length
        }
        onClose={onClose}
        onProfileClick={handleProfileClick}
        menuItems={menuItems}
      />

      {/* Add a wrapper div with flex-1 and overflow handling */}
      <div className="flex-1 overflow-hidden relative">
        {hasLeftGroup ? (
          <div className="flex items-center justify-center h-full">
            <div className="bg-secondary/20 rounded-lg p-6 text-center">
              <h3 className="text-xl font-semibold">You have Left the Group</h3>
              <p className="text-muted-foreground text-sm mt-2">You can no longer send or receive messages in this group</p>
            </div>
          </div>
        ) : (
          <MessageList
            messages={messages}
            isLoadingMessages={isLoadingMessages}
            isTyping={isTyping}
            typingUser={typingUser || null}
            chatType={chat.type}
            userId={userId}
            onReplyToMessage={handleReplyToMessage}
            onAddReaction={handleAddReaction}
            onRemoveReaction={handleRemoveReaction}
          />
        )}
      </div>

      <MessageInput
        newMessage={newMessage}
        setNewMessage={setNewMessage}
        handleSendMessage={handleSendMessage}
        handleTyping={handleTyping}
        showSuggestions={showSuggestions}
        suggestions={suggestions}
        loadingSuggestions={loadingSuggestions}
        disabled={hasLeftGroup}
        disabledMessage="You can't send messages to this group"
        replyToMessage={replyToMessage}
        onCancelReply={handleCancelReply}
      />

      <EditGroupModal
        isOpen={isEditGroupModalOpen}
        onClose={() => setIsEditGroupModalOpen(false)}
        groupName={name}
        bio={chat?.bio || ""}
        image={avatar}
        groupId={chatId}
        onGroupUpdated={handleGroupUpdated}
      />
    </div>
  );
};

export default ChatInterface;
