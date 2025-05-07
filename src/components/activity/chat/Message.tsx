import React, { useRef, useEffect, useState } from "react";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { Link } from "react-router-dom";
import { Message as MessageType, Reaction } from "@/store/chatSlice";
import { isPostShare, parsePostShare, isStoryReply, parseStoryReply } from "@/utils/messageUtils";
import { CornerUpLeft, Image, Video } from "lucide-react";
import EmojiPicker from "emoji-picker-react";

// Default quick reactions
const DEFAULT_REACTIONS = ["👍", "❤️", "😂", "😮", "😢"];

interface MessageProps {
  message: MessageType;
  isFirstInSequence: boolean;
  isGroupChat: boolean;
  userId: string;
  onReply?: (message: MessageType) => void;
  messages?: MessageType[]; // All messages to find the replied message
  onAddReaction?: (messageId: string, reaction: string) => void;
  onRemoveReaction?: (messageId: string) => void;
}

// Interface for shared post data
interface SharedPostData {
  _id: string;
  author: string;
  data: {
    content: string;
    media?: Array<{
      url: string;
      type: string;
    }>;
  };
  feedId: string;
  name: string;
  isCommunity?: boolean;
  communityId?: string;
}

// Interface for story reply data
interface StoryReplyData {
  senderId: string;
  content: string;
  entityId: string;
  media: null | string;
  entity: {
    _id: string;
    author: string;
    createdAt: number;
    storyReply: boolean;
    url: string;
    ago_time: string;
  };
}

const Message: React.FC<MessageProps> = ({
  message,
  isFirstInSequence,
  isGroupChat,
  userId,
  onReply,
  messages = [],
  onAddReaction,
  onRemoveReaction,
}) => {
  // Check if message is a shared post or story reply using useState
  const [sharedPost, setSharedPost] = useState<SharedPostData | null>(null);
  const [storyReply, setStoryReply] = useState<StoryReplyData | null>(null);
  // State to track media loading status
  const [mediaLoaded, setMediaLoaded] = useState(false);
  const [mediaError, setMediaError] = useState(false);
  const [isVideoLoading, setIsVideoLoading] = useState(false);

  // State to track if the message is "long" and needs timestamp on new line
  const [isLongMessage, setIsLongMessage] = useState(false);
  const textRef = useRef<HTMLParagraphElement>(null);

  // Reaction states
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [showFullEmojiPicker, setShowFullEmojiPicker] = useState(false);
  const reactionButtonRef = useRef<HTMLButtonElement>(null);
  const reactionMenuRef = useRef<HTMLDivElement>(null);
  const emojiPickerRef = useRef<HTMLDivElement>(null);

  // Find the replied to message if this message is a reply
  const repliedToMessage = React.useMemo(() => {
    if (!message.replyTo) return null;
    return messages.find((msg) => msg.id === message.replyTo);
  }, [message.replyTo, messages]);

  // Parse replied-to post data if it's a post share
  const repliedPostData = React.useMemo(() => {
    if (!repliedToMessage || !isPostShare(repliedToMessage.text)) return null;
    
    try {
      return parsePostShare(repliedToMessage.text as string);
    } catch (error) {
      console.error("Error parsing replied post:", error);
      return null;
    }
  }, [repliedToMessage]);

  // Check if the replied post has media
  const repliedPostMedia = React.useMemo(() => {
    if (!repliedPostData?.data?.media?.length) return null;
    
    const media = repliedPostData.data.media[0];
    if (!media || !media.url || media.url.trim() === "") return null;
    
    return {
      url: media.url,
      type: media.type || "image" // Default to image if type is not specified
    };
  }, [repliedPostData]);

  // Group reactions by emoji for display
  const groupedReactions = React.useMemo(() => {
    if (!message.reactions || message.reactions.length === 0) return {};

    return message.reactions.reduce<Record<string, Reaction[]>>(
      (acc, reaction) => {
        if (!acc[reaction.reaction]) {
          acc[reaction.reaction] = [];
        }
        acc[reaction.reaction].push(reaction);
        return acc;
      },
      {}
    );
  }, [message.reactions]);

  // Check if the current user has reacted
  const userReaction = React.useMemo(() => {
    if (!message.reactions || message.reactions.length === 0) return null;
    return (
      message.reactions.find((reaction) => reaction.userId === userId)
        ?.reaction || null
    );
  }, [message.reactions, userId]);

  useEffect(() => {
    console.log("message", message)
    // Check if the message is a post share or story reply
    if (isPostShare(message.text)) {
      try {
        const parsedPost = parsePostShare(message.text as string);
        console.log("Parsed shared post:", parsedPost);
        setSharedPost(parsedPost);
        setStoryReply(null);
        
        // Reset media states when post changes
        setMediaLoaded(false);
        setMediaError(false);
        setIsVideoLoading(false);
      } catch (error) {
        console.error("Error parsing shared post in Message component:", error);
        setSharedPost(null);
      }
    } else if (isStoryReply(message.text)) {
      try {
        const parsedStory = parseStoryReply(message.text as string);
        console.log("Parsed story reply:", parsedStory);
        setStoryReply(parsedStory);
        setSharedPost(null);
        
        // Reset media states when story changes
        setMediaLoaded(false);
        setMediaError(false);
        setIsVideoLoading(false);
      } catch (error) {
        console.error("Error parsing story reply in Message component:", error);
        setStoryReply(null);
      }
    } else {
      setSharedPost(null);
      setStoryReply(null);
    }
  }, [message.text]);

  // Get post media details (image or video)
  const postMedia = React.useMemo(() => {
    if (!sharedPost?.data?.media?.length) return null;
    
    const media = sharedPost.data.media[0];
    if (!media || !media.url || media.url.trim() === "") return null;
    
    return {
      url: media.url,
      type: media.type || "image" // Default to image if type is not specified
    };
  }, [sharedPost]);

  // Check if post has valid media
  const hasMedia = !!postMedia;
  const isVideo = postMedia?.type === "video";
  const isImage = postMedia?.type === "image";

  // Check if message is long enough to need timestamp on a new line
  useEffect(() => {
    const measureTextWidth = () => {
      if (!textRef.current || typeof message.text !== "string") return;

      const messageText = message.text;
      const timestamp = message.timestamp;

      // Create a temporary span to measure the text width accurately
      const span = document.createElement("span");
      span.style.visibility = "hidden";
      span.style.position = "absolute";
      span.style.whiteSpace = "nowrap";
      span.style.font = window.getComputedStyle(textRef.current).font;
      span.innerHTML = messageText;
      document.body.appendChild(span);

      // Create another span for the timestamp
      const timeSpan = document.createElement("span");
      timeSpan.style.visibility = "hidden";
      timeSpan.style.position = "absolute";
      timeSpan.style.whiteSpace = "nowrap";
      timeSpan.style.font = "0.75rem/1 sans-serif"; // Approximate the timestamp font
      timeSpan.innerHTML = timestamp;
      document.body.appendChild(timeSpan);

      // Get the available container width (estimate)
      const containerWidth =
        textRef.current.parentElement?.parentElement?.offsetWidth || 250;
      const availableWidth = containerWidth * 0.8; // Leave some margin

      // Calculate widths
      const textWidth = span.offsetWidth;
      const timestampWidth = timeSpan.offsetWidth + 16; // Add some padding

      // Clean up the temporary elements
      document.body.removeChild(span);
      document.body.removeChild(timeSpan);

      // Check if both the text and timestamp can fit on the same line
      const isLong = textWidth + timestampWidth > availableWidth;
      setIsLongMessage(isLong);
    };

    // Run the measurement after the component has rendered
    requestAnimationFrame(measureTextWidth);
  }, [message.text, message.timestamp]);

  // Handle click outside for reaction menu
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showReactionMenu &&
        reactionMenuRef.current &&
        reactionButtonRef.current &&
        !reactionMenuRef.current.contains(event.target as Node) &&
        !reactionButtonRef.current.contains(event.target as Node)
      ) {
        setShowReactionMenu(false);
      }

      if (
        showFullEmojiPicker &&
        emojiPickerRef.current &&
        !emojiPickerRef.current.contains(event.target as Node)
      ) {
        setShowFullEmojiPicker(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showReactionMenu, showFullEmojiPicker]);

  // Handle double click on horizontal area to toggle reply
  const handleDoubleClick = (e: React.MouseEvent) => {
    // Only trigger when onReply is available
    if (onReply) {
      // Make sure we're not clicking on the message content itself
      const target = e.target as HTMLElement;
      if (
        target.classList.contains("message-horizontal-area") ||
        target.classList.contains("message-container")
      ) {
        e.preventDefault();
        e.stopPropagation();
        onReply(message);
      }
    }
  };

  // Handle reaction selection
  const handleReactionClick = (reaction: string) => {
    if (!onAddReaction || !onRemoveReaction) return;

    // If user has already selected this reaction, remove it
    if (userReaction === reaction) {
      onRemoveReaction(message.id);
    } else {
      // Otherwise add the new reaction
      onAddReaction(message.id, reaction);
    }

    // Close the menu
    setShowReactionMenu(false);
  };

  // Handle emoji picker selection
  const handleEmojiSelect = (emojiData: { emoji: string }) => {
    if (onAddReaction) {
      onAddReaction(message.id, emojiData.emoji);
      setShowFullEmojiPicker(false);
      setShowReactionMenu(false);
    }
  };

  return (
    <div
      className={`flex items-start w-full gap-2 max-w-xl ${
        message.isUser ? "flex-row-reverse" : "flex-row"
      }`}
    >
      {/* Only show avatar for group chats and for the first message in a sequence from each sender */}
      {isGroupChat && isFirstInSequence && !message.isUser && (
        <Link to={`/profile/${message.senderId}`}>
          <Avatar className="h-6 w-6 mt-1">
            <AvatarImage
              src={message.senderAvatar || ""}
              alt={message.senderName || "Unknown"}
            />
            <AvatarFallback>{(message.senderName || "?")[0]}</AvatarFallback>
          </Avatar>
        </Link>
      )}
      {/* Use userId in the profile link for the user's own messages */}
      {/* {isGroupChat && isFirstInSequence && message.isUser && (
        <Link to={`/profile/${userId}`}>
          <Avatar className="h-6 w-6 mt-1">
            <AvatarImage
              src={message.senderAvatar || ""}
              alt={message.senderName || "Unknown"}
            />
            <AvatarFallback>{(message.senderName || "?")[0]}</AvatarFallback>
          </Avatar>
        </Link>
      )} */}
      {/* Add a spacer when we don't show the avatar to keep alignment */}
      {isGroupChat && !isFirstInSequence && !message.isUser && (
        <div className="w-7" />
      )}
      <div
        className={`flex flex-col ${
          message.isUser ? "items-end" : "items-start"
        } group w-full message-container message-horizontal-area relative max-w-xl`}
        onDoubleClick={handleDoubleClick}
      >
        <div
          className={`flex w-fit items-center message-horizontal-area max-w-xl group ${
            message.isUser ? "justify-end" : "justify-start"
          }`}
        >
          {/* Reply button for other user's messages - appears on left */}
          {onReply && message.isUser && (
            <button
              onClick={() => onReply(message)}
              className="text-xs cursor-pointer opacity-0 group-hover:opacity-70 hover:opacity-100 p-1 h-6 w-6 flex items-center justify-center rounded-full bg-background/80 transition-opacity"
              aria-label="Reply to message"
            >
              <CornerUpLeft size={14} />
            </button>
          )}

          {/* Reaction button for user's messages - appears on left */}
          {/* {onAddReaction && message.isUser && (
            <button
              ref={reactionButtonRef}
              onClick={() => setShowReactionMenu(!showReactionMenu)}
              className="text-xs cursor-pointer opacity-0 group-hover:opacity-70 hover:opacity-100 p-1 h-6 w-6 flex items-center justify-center rounded-full bg-background/80 transition-opacity"
              aria-label="Add reaction"
            >
              <Smile size={14} />
            </button>
          )} */}

          <div
            className={`p-[0.35rem] break-words min-w-[7rem] max-w-[75%] ${
              message.isUser
                ? `bg-primary text-primary-foreground ${
                    isFirstInSequence
                      ? "rounded-md rounded-tr-none mt-1"
                      : "rounded-md"
                  }`
                : `bg-muted text-foreground ${
                    isFirstInSequence
                      ? "rounded-md rounded-tl-none"
                      : "rounded-md"
                  }`
            }`}
          >
            {/* Show sender name only for group chats and first message from each sender */}
            {isGroupChat && !message.isUser && isFirstInSequence && (
              <p className="text-xs font-medium mb-1 text-foreground">
                {message.senderName || "Unknown"}
              </p>
            )}

            {/* Display the message this is replying to, if any */}
            {repliedToMessage && (
              <div
                className={`flex flex-col w-full ${
                  message.isUser ? "items-end" : "items-start"
                } mb-1`}
              >
                <div
                  className={`flex w-full items-center text-xs gap-1 ${
                    message.isUser ? "flex-row-reverse" : "flex-row"
                  }`}
                >
                  <div
                    className={`border-l-4 w-full ${
                      message.isUser
                        ? "border-l-gray-400 bg-gray-700"
                        : "border-l-primary bg-primary/40"
                    } rounded-sm pl-2 py-1 pr-3 overflow-hidden`}
                  >
                    <div className="text-xs font-semibold">
                      {repliedToMessage.isUser
                        ? "You"
                        : repliedToMessage.senderName || "Unknown"}
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="text-xs truncate flex-1">
                        {isPostShare(repliedToMessage.text)
                          ? "POST"
                          : typeof repliedToMessage.text === "string"
                            ? repliedToMessage.text
                            : "Shared content"}
                      </div>
                      
                      {/* Show media thumbnail for replied post if available */}
                      {isPostShare(repliedToMessage.text) && repliedPostMedia && (
                        <div className="h-5 w-5 overflow-hidden rounded-sm flex items-center justify-center bg-muted/30">
                          {repliedPostMedia.type === "video" ? (
                            <video 
                              src={repliedPostMedia.url}
                              className="h-full w-full object-cover"
                              muted
                            />
                          ) : (
                            <img 
                              src={repliedPostMedia.url}
                              alt="Post"
                              className="h-full w-full object-cover"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Render shared post or story reply if available */}
            {sharedPost ? (
              <div className="shared-post">
                <div className="border rounded-md overflow-hidden bg-background text-foreground mb-2 cursor-pointer">
                  <Link
                    to={
                      sharedPost.isCommunity && sharedPost.communityId
                        ? `/community/${sharedPost.communityId}/${sharedPost._id}`
                        : `/post/${sharedPost._id}`
                    }
                  >
                    {/* Post media container */}
                    {hasMedia && !mediaError && (
                      <div className="w-full h-[150px] overflow-hidden bg-muted/30 flex items-center justify-center relative">
                        {/* Loading indicator */}
                        {!mediaLoaded && !isVideo && (
                          <div className="absolute inset-0 flex items-center justify-center z-10">
                            <Image size={24} className="text-muted-foreground animate-pulse" />
                          </div>
                        )}
                        
                        {isVideoLoading && (
                          <div className="absolute inset-0 flex items-center justify-center z-10">
                            <Video size={24} className="text-muted-foreground animate-pulse" />
                          </div>
                        )}

                        {/* Render image or video based on type */}
                        {isImage ? (
                          <img
                            src={postMedia.url}
                            alt="Shared post"
                            className={`w-full h-full object-cover transition-opacity duration-200 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`}
                            onLoad={() => {
                              console.log("Shared post image loaded successfully");
                              setMediaLoaded(true);
                            }}
                            onError={(e) => {
                              console.error("Failed to load shared post image:", postMedia.url);
                              setMediaError(true);
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : isVideo ? (
                          <video
                            src={postMedia.url}
                            className="w-full h-full object-cover"
                            autoPlay
                            muted
                            loop
                            playsInline
                            onLoadStart={() => setIsVideoLoading(true)}
                            onCanPlay={() => {
                              setIsVideoLoading(false);
                              setMediaLoaded(true);
                            }}
                            onError={(e) => {
                              console.error("Failed to load shared post video:", postMedia.url);
                              setMediaError(true);
                              setIsVideoLoading(false);
                              e.currentTarget.style.display = "none";
                            }}
                          />
                        ) : null}
                      </div>
                    )}

                    {/* Fallback for media error */}
                    {(hasMedia && mediaError) && (
                      <div className="w-full h-[80px] overflow-hidden bg-muted/30 flex items-center justify-center">
                        {isVideo ? (
                          <Video size={24} className="text-muted-foreground" />
                        ) : (
                          <Image size={24} className="text-muted-foreground" />
                        )}
                      </div>
                    )}

                    {/* Post content */}
                    <div className="p-2 cursor-pointer">
                      <p className="text-xs font-medium mb-1">
                        Shared a post from {sharedPost.name || "Unknown"}
                      </p>
                      <p className="text-sm line-clamp-2">
                        {sharedPost.data?.content || "No caption"}
                      </p>
                    </div>
                  </Link>
                </div>
                <span className="text-xs opacity-70 block text-right">
                  {message.timestamp}
                </span>
              </div>
            ) : storyReply ? (
              <div className="story-reply">
                <div className="border rounded-md overflow-hidden bg-background text-foreground mb-2">
                  {/* Story image */}
                  <div className="w-full h-[250px] overflow-hidden bg-muted/30 flex items-center justify-center relative">
                    {/* Loading indicator */}
                    {!mediaLoaded && (
                      <div className="absolute inset-0 flex items-center justify-center z-10">
                        <Image size={24} className="text-muted-foreground animate-pulse" />
                      </div>
                    )}

                    <img
                      src={storyReply.entity.url}
                      alt="Story"
                      className={`w-[400px] h-full object-cover transition-opacity duration-200 ${mediaLoaded ? 'opacity-100' : 'opacity-0'}`}
                      onLoad={() => {
                        console.log("Story image loaded successfully");
                        setMediaLoaded(true);
                      }}
                      onError={(e) => {
                        console.error("Failed to load story image:", storyReply.entity.url);
                        setMediaError(true);
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  </div>

                  {/* Story reply content */}
                  <div className="p-2">
                    <p className="text-xs font-medium mb-1">
                      Replied to a story 
                    </p>
                    <p className="text-sm">
                      {JSON.parse(message.text as string).content}
                    </p>
                  </div>
                </div>
                <span className="text-xs opacity-70 block text-right">
                  {message.timestamp}
                </span>
              </div>
            ) : (
              <div className="px-2 py-1">
                <div className="flex flex-wrap items-end justify-between gap-1">
                  <p
                    ref={textRef}
                    className={`break-words whitespace-pre-wrap overflow-hidden ${
                      !isLongMessage ? "pr-2" : "w-full"
                    }`}
                  >
                    {typeof message.text === "string"
                      ? message.text
                      : JSON.stringify(message.text)}
                  </p>

                  {/* Inline timestamp for short messages */}
                  {!isLongMessage && (
                    <span className="text-xs opacity-70 whitespace-nowrap ml-1">
                      {message.timestamp}
                    </span>
                  )}
                </div>

                {/* Bottom timestamp for long messages */}
                {isLongMessage && (
                  <span className="text-xs opacity-70 block text-right mt-1">
                    {message.timestamp}
                  </span>
                )}
              </div>
            )}

            {/* Display reactions if any */}
            {message.reactions && message.reactions.length > 0 && (
              <div
                className={`flex flex-wrap absolute -bottom-5 gap-1 mt-1 ${
                  message.isUser ? "justify-end" : "justify-start"
                }`}
              >
                {Object.entries(groupedReactions).map(([emoji, reactions]) => (
                  <button
                    key={emoji}
                    onClick={() => handleReactionClick(emoji)}
                    className={`text-xs px-2 cursor-pointer py-0.5 rounded-full flex items-center gap-1
                      ${
                        reactions.some((r) => r.userId === userId)
                          ? "bg-foreground/30 border border-primary/30"
                          : "bg-foreground/50 border border-muted-foreground/20"
                      } hover:bg-primary/30 transition-colors`}
                  >
                    <span>{emoji}</span>
                    <span className="text-xs">{reactions.length}</span>
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Reply button for other user's messages - appears on right */}
          {onReply && !message.isUser && (
            <button
              onClick={() => onReply(message)}
              className="text-xs opacity-0 cursor-pointer group-hover:opacity-70 hover:opacity-100 p-1 h-6 w-6 flex items-center justify-center rounded-full bg-background/80 transition-opacity"
              aria-label="Reply to message"
            >
              <CornerUpLeft size={14} />
            </button>
          )}

          {/* Reaction button for other user's messages - appears on right */}
          {/* {!!onAddReaction && !message.isUser && (
            <button
              ref={reactionButtonRef}
              onClick={() => setShowReactionMenu(!showReactionMenu)}
              className="text-xs opacity-0 cursor-pointer group-hover:opacity-70 hover:opacity-100 p-1 h-6 w-6 flex items-center justify-center rounded-full bg-background/80 transition-opacity"
              aria-label="Add reaction"
            >
              <Smile size={14} />
            </button>
          )} */}
        </div>

        {/* Reaction menu */}
        {showReactionMenu && !!onAddReaction && (
          <div
            ref={reactionMenuRef}
            className={`absolute z-10 -top-5 bg-popover shadow-md rounded-full py-1 px-2 flex items-center gap-1 animate-in slide-in-from-bottom-2 duration-200
            ${message.isUser ? "right-20" : "right-15"}`}
          >
            {DEFAULT_REACTIONS.map((emoji) => (
              <button
                key={emoji}
                onClick={() => handleReactionClick(emoji)}
                className={`text-lg hover:scale-125 cursor-pointer transition-transform p-1 rounded-full ${
                  userReaction === emoji
                    ? "bg-primary/20 border-2 border-foreground"
                    : ""
                }`}
              >
                {emoji}
              </button>
            ))}
            <div className="w-px h-5 bg-border mx-1"></div>
            <button
              onClick={() => {
                setShowFullEmojiPicker(true);
                setShowReactionMenu(false);
              }}
              className="text-lg cursor-pointer hover:scale-125 transition-transform p-1"
            >
              +
            </button>
          </div>
        )}

        {/* Full emoji picker */}
        {showFullEmojiPicker && onAddReaction && (
          <div
            ref={emojiPickerRef}
            className="absolute z-20 animate-in zoom-in-90 duration-200"
            style={{
              boxShadow: "0 4px 20px rgba(0, 0, 0, 0.2)",
              top: "100%",
              marginTop: "8px",
              ...(message.isUser ? { right: "0" } : { left: "0" }),
            }}
          >
            <EmojiPicker
              onEmojiClick={handleEmojiSelect}
              width={300}
              height={400}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default Message;
