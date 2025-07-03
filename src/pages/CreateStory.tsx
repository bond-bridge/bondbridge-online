import { useState, useRef, useEffect } from "react";
import { Button } from "../components/ui/button";
import {
  Type,
  Image,
  Video,
  Palette,
  Smile,
  ChevronLeft,
  ChevronRight,
  Trash2,
} from "lucide-react";
import EmojiPicker from "emoji-picker-react";
import { Avatar, AvatarImage, AvatarFallback } from "../components/ui/avatar";
import { useNavigate } from "react-router-dom";
import { uploadStory } from "../apis/commonApiCalls/storyApi";
import { useApiCall } from "../apis/globalCatchError";
import { Story, StoryData } from "../apis/apiTypes/request";
import { useAppSelector } from "../store";
import { WORD_LIMIT } from "@/lib/constants";
import { countCharacters, exceededCharLimit } from "@/lib/utils";
import { toast } from "sonner";
import { rewriteWithBondChat } from "../apis/commonApiCalls/createPostApi";

type StoryTheme = {
  name: string;
  bgColor: string;
  textColor: string;
  thumbnailColor: string;
};
const storyThemes: StoryTheme[] = [
  {
    name: "Purple",
    bgColor: "#4A148C", // Deep purple
    textColor: "#FFFFFF", // White
    thumbnailColor: "#6A1B9A",
  },
  {
    name: "Blue",
    bgColor: "#1A237E", // Dark blue
    textColor: "#FFFFFF", // White
    thumbnailColor: "#283593",
  },
  {
    name: "Orange",
    bgColor: "#E65100", // Deep orange
    textColor: "#FFFFFF", // White text for contrast
    thumbnailColor: "#F57C00",
  },
  {
    name: "Green",
    bgColor: "#1B5E20", // Dark green
    textColor: "#FFFFFF", // White text for contrast
    thumbnailColor: "#2E7D32", // Slightly lighter dark green for thumbnail
  },
  // {
  //   name: 'Yellow',
  //   bgColor: '#FFD700', // Brighter yellow
  //   textColor: '#000000', // Black text for contrast
  //   thumbnailColor: '#FFE44D' // Slightly darker bright yellow
  // },
  {
    name: "Grey",
    bgColor: "#424242", // Dark grey
    textColor: "#FFFFFF", // White text for contrast
    thumbnailColor: "#616161", // Slightly lighter grey for thumbnail
  },
  // {
  //   name: 'Cream',
  //   bgColor: '#FFF5E1', // Light cream color
  //   textColor: '#2C1810', // Dark brown text for contrast
  //   thumbnailColor: '#F5E6D3' // Slightly darker cream for thumbnail
  // }
];

const CreateStory = () => {
  const { avatar, username, profilePic } = useAppSelector(
    (state) => state.currentUser
  );
  const [stories, setStories] = useState<Story[]>([
    {
      type: "text",
      content: "",
      theme: {
        bgColor: storyThemes[0].bgColor,
        textColor: storyThemes[0].textColor,
      },
      privacy: 1,
    },
  ]);
  const [currentPage, setCurrentPage] = useState(0);
  const [showEmojiPicker, setShowEmojiPicker] = useState(false);
  const [showColorPicker, setShowColorPicker] = useState(false);
  const [rewriteError, setRewriteError] = useState<string>("");

  const [executeUploadStory, isUploading] = useApiCall(uploadStory);
  const [executeRewriteWithBondChat, isRewritingWithBondChat] = useApiCall(rewriteWithBondChat);

  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleTextChange = (newText: string) => {
    if (textareaRef.current) {
      const textarea = textareaRef.current;
      
      // Temporarily update value to check if it would cause overflow
      textarea.value = newText;
      
      // If adding this text would exceed 5 lines (5 × line height)
      const lineHeight = 24; // Line height as set in the textarea style
      const maxHeight = lineHeight * 5;
      
      if (textarea.scrollHeight > maxHeight) {
        // Revert to previous text
        textarea.value = currentContentText;
        return;
      }
      
      // If no overflow, update the state
      setStories((prev) =>
        prev.map((story, idx) =>
          idx === currentPage ? { ...story, content: newText } : story
        )
      );
    }
  };

  const handleClear = () => {
    setStories((prev) =>
      prev.map((story, idx) => {
        if (idx === currentPage) {
          // Create default empty content based on story type
          let emptyContent: string | File | Blob = "";

          if (story.type === "text") {
            emptyContent = "";
          }
          // For other types, keep the type but reset content properties
          return {
            ...story,
            content: emptyContent,
            previewUrl: undefined,
          };
        }
        return story;
      })
    );
  };

  const handleThemeChange = (theme: StoryTheme) => {
    setStories((prev) =>
      prev.map((story, idx) =>
        idx === currentPage
          ? {
              ...story,
              theme: {
                bgColor: theme.bgColor,
                textColor: theme.textColor,
              },
            }
          : story
      )
    );
  };

  // not showing add page and delete page buttons for now as multiple stories not working
  // const handleAddPage = () => {
  //   if (stories.length < 10) {
  //     const currentTheme = stories[currentPage].theme;
  //     setStories(prev => [...prev, { type: 'text', content: '', theme: currentTheme, privacy: 1 }]);
  //     setCurrentPage(stories.length);
  //   }
  // };

  // const handleDeletePage = () => {
  //   if (stories.length > 1) {
  //     setStories(prev => prev.filter((_, idx) => idx !== currentPage));
  //     if (currentPage === stories.length - 1) {
  //       setCurrentPage(currentPage - 1);
  //     }
  //   }
  // };

  // Use these values from stories state
  const currentStory = stories[currentPage];
  const currentTheme = currentStory.theme;
  const currentContentText =
    typeof currentStory.content === "string" ? currentStory.content : "";
  const currentPreviewUrl = currentStory.previewUrl || "";

  const handleMediaUpload = (
    e: React.ChangeEvent<HTMLInputElement>,
    type: "photo" | "video"
  ) => {
    const file = e.target.files?.[0];
    if (file) {
      const maxSize = 50 * 1024 * 1024; // 50MB in bytes
      if (file.size > maxSize) {
        toast.error(`File ${file.name} exceeds maximum size of 50MB`);
        return;
      }
      
      const newStories = [...stories];

      const reader = new FileReader();
      reader.onloadend = () => {
        if (reader.result) {
          newStories[currentPage] = {
            type,
            content: file,
            theme: currentTheme,
            privacy: 1,
            previewUrl: reader.result as string,
          };
          setStories(newStories);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const navigate = useNavigate();
  const handleCancel = () => {
    navigate("/");
  };

  // New utility function to render text to canvas and return as image
  const renderTextToImage = (
    text: string,
    theme: { bgColor: string; textColor: string }
  ): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      canvas.width = 400;
      canvas.height = 600;
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Fill background with the theme color
      ctx.fillStyle = theme.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set text properties
      ctx.fillStyle = theme.textColor;
      ctx.textAlign = "center";
      ctx.font = "24px sans-serif";

      // Word wrap text
      const words = text.split(" ");
      const lines = [];
      let currentLine = "";
      const maxWidth = canvas.width - 40; // Padding on both sides

      for (const word of words) {
        const testLine = currentLine ? `${currentLine} ${word}` : word;
        const metrics = ctx.measureText(testLine);

        if (metrics.width > maxWidth && currentLine) {
          lines.push(currentLine);
          currentLine = word;
        } else {
          currentLine = testLine;
        }
      }

      if (currentLine) {
        lines.push(currentLine);
      }

      // Draw text
      const lineHeight = 30;
      const startY = (canvas.height - lines.length * lineHeight) / 2;

      lines.forEach((line, index) => {
        ctx.fillText(line, canvas.width / 2, startY + index * lineHeight);
      });

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          // Fallback if toBlob fails
          canvas.toDataURL("image/png").replace(/^data:image\/png;base64,/, "");
          fetch(canvas.toDataURL("image/png"))
            .then((res) => res.blob())
            .then(resolve);
        }
      }, "image/png");
    });
  };

  // Utility function to process image with theme
  const renderImageWithTheme = (
    file: File,
    theme: { bgColor: string; textColor: string }
  ): Promise<Blob> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Set canvas dimensions (9:16 aspect ratio)
      canvas.width = 400;
      canvas.height = 711;

      // Fill background with theme color
      ctx.fillStyle = theme.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Create image element and load file
      const img = document.createElement("img");
      const reader = new FileReader();

      reader.onload = () => {
        img.src = reader.result as string;
      };

      img.onload = () => {
        // Calculate dimensions to maintain aspect ratio
        const scale = Math.min(
          canvas.width / img.width,
          canvas.height / img.height
        );
        const x = (canvas.width - img.width * scale) / 2;
        const y = (canvas.height - img.height * scale) / 2;

        // Draw image maintaining aspect ratio
        ctx.drawImage(img, x, y, img.width * scale, img.height * scale);

        // Convert canvas to blob
        canvas.toBlob((blob) => {
          if (blob) {
            resolve(blob);
          } else {
            // Fallback if toBlob fails
            fetch(canvas.toDataURL("image/png"))
              .then((res) => res.blob())
              .then(resolve);
          }
        }, "image/png");
      };

      reader.readAsDataURL(file);
    });
  };

  // Utility function to process video and create thumbnail
  const renderVideoWithTheme = (
    file: File,
    theme: { bgColor: string; textColor: string }
  ): Promise<{
    thumbnail: Blob;
    video: File;
  }> => {
    return new Promise((resolve) => {
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      const videoElement = document.createElement("video");

      if (!ctx) {
        throw new Error("Could not get canvas context");
      }

      // Set canvas dimensions (10:16 aspect ratio)
      canvas.width = 400;
      canvas.height = 640;

      // Fill background with theme color
      ctx.fillStyle = theme.bgColor;
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Load video and capture first frame
      videoElement.src = URL.createObjectURL(file);

      videoElement.onloadeddata = () => {
        videoElement.currentTime = 0;
      };

      videoElement.onseeked = () => {
        // Calculate video dimensions to maintain aspect ratio
        const scale = Math.min(
          canvas.width / videoElement.videoWidth,
          canvas.height / videoElement.videoHeight
        );
        const x = (canvas.width - videoElement.videoWidth * scale) / 2;
        const y = (canvas.height - videoElement.videoHeight * scale) / 2;

        // Draw video frame
        ctx.drawImage(
          videoElement,
          x,
          y,
          videoElement.videoWidth * scale,
          videoElement.videoHeight * scale
        );

        // Convert canvas to blob for thumbnail
        canvas.toBlob((blob) => {
          if (blob) {
            resolve({
              thumbnail: blob,
              video: file,
            });
          } else {
            // Fallback if toBlob fails
            fetch(canvas.toDataURL("image/png"))
              .then((res) => res.blob())
              .then((blob) =>
                resolve({
                  thumbnail: blob,
                  video: file,
                })
              );
          }
        }, "image/png");
      };
    });
  };

  const handleCreateStory = async () => {
    // Validate stories content exists
    const emptyStory = stories.find((story) => {
      if (typeof story.content === "string") {
        return !story.content.trim();
      }
      if (story.content instanceof File || story.content instanceof Blob) {
        return story.content.size === 0;
      }
      return false;
    });

    if (emptyStory) {
      toast.error("Please add content to your story");
      return;
    }

    // Validate character count for text stories
    const textStoryExceedingLimit = stories.find(
      (story) =>
        story.type === "text" &&
        typeof story.content === "string" &&
        exceededCharLimit(story.content, WORD_LIMIT)
    );

    if (textStoryExceedingLimit) {
      toast.error(
        `Your story exceeds the ${WORD_LIMIT} word limit. Please shorten your text.`
      );
      return;
    }

    // Process all stories and store rendered images
    const processedStories = await Promise.all(
      stories.map(async (story) => {
        try {
          if (story.type === "text" && typeof story.content === "string") {
            const imageBlob = await renderTextToImage(
              story.content,
              story.theme
            );
            const filename = `story-text-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}.png`;
            const imageFile = new File([imageBlob], filename, {
              type: "image/png",
            });

            return {
              ...story,
              type: "photo",
              content: imageFile,
              originalText: story.content,
            };
          } else if (story.type === "photo" && story.content instanceof File) {
            const processedBlob = await renderImageWithTheme(
              story.content,
              story.theme
            );
            const filename = `story-photo-${Date.now()}-${Math.random()
              .toString(36)
              .substr(2, 9)}.png`;
            const processedFile = new File([processedBlob], filename, {
              type: "image/png",
            });

            return {
              ...story,
              content: processedFile,
              originalImage: story.content,
            };
          } else if (story.type === "video" && story.content instanceof File) {
            const { thumbnail, video } = await renderVideoWithTheme(
              story.content,
              story.theme
            );
            const thumbnailFile = new File(
              [thumbnail],
              `thumbnail-${Date.now()}-${Math.random()
                .toString(36)
                .substr(2, 9)}.png`,
              { type: "image/png" }
            );

            return {
              ...story,
              content: video,
              thumbnail: thumbnailFile,
            };
          }

          return story;
        } catch (error) {
          console.error("Error processing story:", error);
          return story;
        }
      })
    );

    // Ensure all stories have a privacy value
    const storiesWithPrivacy = processedStories.map((story) => ({
      ...story,
      privacy: story.privacy || 1,
    }));

    // Call the API using the useApiCall hook
    const result = await executeUploadStory(storiesWithPrivacy as StoryData[]);

    if (result.success && result.data) {
      navigate("/");
    }
  };

  const handleSetTextType = () => {
    // Set the current story type to text
    setStories((prev) =>
      prev.map((story, idx) =>
        idx === currentPage
          ? {
              ...story,
              type: "text",
              content: typeof story.content === "string" ? story.content : "",
            }
          : story
      )
    );
  };

  const emojiPickerRef = useRef<HTMLDivElement>(null);
  const emojiButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        showEmojiPicker &&
        emojiPickerRef.current &&
        emojiButtonRef.current &&
        !emojiPickerRef.current.contains(event.target as Node) &&
        !emojiButtonRef.current.contains(event.target as Node)
      ) {
        setShowEmojiPicker(false);
      }
    };

    // Use mousedown instead of click to handle the event before the emoji picker's click event
    document.addEventListener("mousedown", handleClickOutside);

    // Cleanup function to remove event listener
    return () => {
      document.removeEventListener("mousedown", handleClickOutside);
    };
  }, [showEmojiPicker]);

  const handleRewriteWithBondChat = async () => {
    // Clear any previous error
    setRewriteError("");
    
    // Only proceed if there's content to rewrite
    if (!currentContentText.trim()) {
      setRewriteError("Please add some text to rewrite");
      return;
    }

    // Execute the API call with error handling
    const { data, success } = await executeRewriteWithBondChat(currentContentText);

    if (success && data) {
      // Update the content with the rewritten text
      setStories((prev) =>
        prev.map((story, idx) =>
          idx === currentPage ? { ...story, content: data.rewritten } : story
        )
      );
    }
  };

  return (
    <div className="relative h-full bg-background text-foreground">
      {/* Top Controls */}
      <div className="flex items-center justify-between p-4">
        <Avatar className="h-8 w-8">
          <AvatarImage src={profilePic || avatar} alt="Profile" />
          <AvatarFallback>
            {username ? username.charAt(0).toUpperCase() : "U"}
          </AvatarFallback>
        </Avatar>

        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="sm"
            className="text-muted-foreground hover:text-foreground cursor-pointer border border-primary"
            onClick={handleCancel}
          >
            Cancel
          </Button>
          <Button
            size="sm"
            className="bg-primary hover:bg-primary/90 text-primary-foreground rounded-full px-6 cursor-pointer"
            onClick={handleCreateStory}
            disabled={isUploading}
          >
            {isUploading ? "Posting..." : "Post"}
          </Button>
        </div>
      </div>
      <div className="h-px bg-border" /> {/* Separator */}
      <div className="flex h-[calc(100vh-145px)]">
        {/* Left Sidebar Tools */}
        <div className="w-16 flex flex-col gap-8 p-4 pt-16">
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground h-auto p-2 cursor-pointer"
              onClick={handleSetTextType}
            >
              <Type className="w-5 h-5" />
            </Button>
            <span className="text-xs">Text</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <label className="cursor-pointer">
              <input
                type="file"
                // accept="image/*"
                accept=".png,.jpg,.jpeg,.gif,.webp,.svg"
                className="hidden"
                onChange={(e) => handleMediaUpload(e, "photo")}
              />
              <Image className="w-5 h-5 text-foreground" />
            </label>
            <span className="text-xs">Photo</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <label className="cursor-pointer">
              <input
                type="file"
                accept="video/*"
                className="hidden"
                onChange={(e) => handleMediaUpload(e, "video")}
              />
              <Video className="w-5 h-5 text-foreground" />
            </label>
            <span className="text-xs">Video</span>
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground h-auto p-2 cursor-pointer"
              onClick={() => {
                setShowColorPicker(!showColorPicker);
              }}
            >
              <Palette className="w-5 h-5" />
            </Button>
            <span className="text-xs">Theme</span>
            <input
              type="color"
              id="color-picker"
              className="hidden"
              onChange={() => {
                handleThemeChange(storyThemes[0]);
                setShowColorPicker(false);
              }}
            />
          </div>

          <div className="flex flex-col items-center gap-1">
            <Button
              ref={emojiButtonRef}
              variant="ghost"
              size="icon"
              className="text-foreground h-auto p-2 cursor-pointer"
              onClick={() => setShowEmojiPicker(!showEmojiPicker)}
            >
              <Smile className="w-5 h-5" />
            </Button>
            <span className="text-xs">Emoji</span>
            {showEmojiPicker && (
              <div
                ref={emojiPickerRef}
                className="absolute left-20 top-1/2 -translate-y-1/2 z-96"
              >
                <EmojiPicker
                  onEmojiClick={(emojiObject) => {
                    handleTextChange(currentContentText + emojiObject.emoji);
                    setShowEmojiPicker(false);
                  }}
                  width={300}
                  height={400}
                />
              </div>
            )}
          </div>
          <div className="flex flex-col items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              className="text-foreground h-auto p-2 cursor-pointer"
              onClick={handleClear}
            >
              <Trash2 className="w-5 h-5" />
            </Button>
            <span className="text-xs">Clear</span>
          </div>
        </div>

        {/* Story Content Area */}
        <div className="flex-1 p-4 relative z-50">         
          <div className="flex justify-center  absolute -bottom-1.5 left-1/2 -translate-x-1/2">
            <span
              className="text-xs"
              style={{
                color: exceededCharLimit(currentContentText, WORD_LIMIT)
                  ? "hsl(var(--destructive))"
                  : currentTheme.textColor,
              }}
            >
              {countCharacters(currentContentText)}/{WORD_LIMIT} characters
            </span>
          </div>
          <div
            className={`max-w-xs mx-auto rounded-lg h-full relative`}
            style={{ backgroundColor: currentTheme.bgColor }}
          >
            {currentTheme.bgColor.startsWith("bg-") && (
              <div
                className={`absolute inset-0 ${currentTheme.bgColor} rounded-lg`}
              ></div>
            )}

            {/* Story Content - Incorporating improved media handling from first file */}
            <div className="h-full w-full flex items-center justify-center relative z-10">
            {currentStory.type === "text" && (
            <div className="absolute top-4 right-4 z-50">
              <Button
                variant="ghost"
                size="sm"
                className="text-xs flex items-center gap-1 cursor-pointer border-2 border-primary bg-background"
                onClick={handleRewriteWithBondChat}
                disabled={isRewritingWithBondChat}
              >
                {isRewritingWithBondChat ? (
                  <div className="flex items-center gap-1">
                    <div className="h-4 w-4 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent"></div>
                    <span className="text-foreground border-primary">
                      Rewriting...
                    </span>
                  </div>
                ) : (
                  <>
                    <img src="/bondchat.svg" alt="BondChat" className="w-4 h-4" />
                    <div className="text-foreground">
                      Re-write with{" "}
                      <span className="grad font-bold">BondChat </span>
                    </div>
                  </>
                )}
              </Button>
              {rewriteError && (
                <p className="text-white font-bold text-xs mt-1">{rewriteError}</p>
              )}
            </div>
          )}
              {currentStory.type === "text" && (
                <div className="w-full px-4">
                  {isRewritingWithBondChat ? (
                    <div className="w-full animate-pulse pb-2">
                      <div className="h-6 bg-[var(--secondary)] opacity-40 rounded mb-2 w-3/4"></div>
                      <div className="h-6 bg-[var(--secondary)] opacity-40 rounded mb-2 w-5/6"></div>
                      <div className="h-6 bg-[var(--secondary)] opacity-40 rounded w-2/3"></div>
                  </div>
                  ) : (
                    <textarea
                      ref={textareaRef}
                      value={currentContentText}
                      onChange={(e) => {
                        handleTextChange(e.target.value);
                      }}
                      placeholder="What's on your mind..."
                      className="w-full bg-transparent resize-none outline-none text-center overflow-hidden"
                      style={{
                        color: currentTheme.textColor,
                        height: "120px", // Fixed height for 5 lines
                        lineHeight: "24px",
                        padding: "0",
                        boxSizing: "border-box",
                      }}
                      rows={5}
                      autoFocus
                    />
                  )}
                </div>
              )}

              {/* Improved image handling from first file */}
              {currentStory.type === "photo" && (
                <div className="w-full h-full px-4 py-18 overflow-y-auto flex items-center justify-center">
                  <img
                    src={currentPreviewUrl}
                    alt="Story"
                    className="max-w-full object-contain"
                    style={{ maxHeight: "calc(100% - 40px)" }} // Subtract space for buttons
                  />
                </div>
              )}

              {/* Improved video handling from first file */}
              {currentStory.type === "video" && (
                <div className="w-full h-full px-4 py-18 overflow-y-auto flex items-center justify-center">
                  <video
                    src={currentPreviewUrl}
                    className="max-w-full object-contain"
                    style={{ maxHeight: "calc(100% - 40px)" }} // Subtract space for buttons
                    controls
                  />
                </div>
              )}

              {/* Show color picker only for text type */}
              {showColorPicker && (
                <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-2 p-2 bg-background/50 rounded-full animate-in fade-in duration-200">
                  {storyThemes.map((theme) => (
                    <button
                      key={theme.name}
                      className={`w-6 h-6 rounded-full ${
                        currentTheme.bgColor === theme.bgColor
                          ? "ring-2 ring-foreground"
                          : ""
                      }`}
                      style={{
                        backgroundColor: theme.bgColor,
                        border: `1px solid ${theme.textColor}`,
                      }}
                      onClick={() => {
                        handleThemeChange(theme);
                        setShowColorPicker(false);
                      }}
                    />
                  ))}
                </div>
              )}

              {/* Navigation Arrows - Keeping EXACTLY as in the second file */}
              {currentPage > 0 && (
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-[calc(100%+10px)] bg-accent/60 p-2 rounded-full z-20 hover:bg-accent/20"
                >
                  <ChevronLeft className="w-6 h-6 text-foreground" />
                </button>
              )}

              {currentPage < stories.length - 1 && (
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  className="absolute right-0 top-1/2 -translate-y-1/2 translate-x-[calc(100%+10px)] bg-accent/60 p-2 rounded-full z-20 hover:bg-accent/20"
                >
                  <ChevronRight className="w-6 h-6 text-foreground" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CreateStory;
