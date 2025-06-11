import { useNavigate, useLocation, useParams } from 'react-router-dom';
import { ArrowLeft, Send, Play, Heart, Eye } from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Input } from '@/components/ui/input';
import { useState, useEffect, useCallback, useRef } from 'react';
import { saveStoryInteraction, getStoryForUser, archiveStory } from '@/apis/commonApiCalls/storyApi';
import { useApiCall } from '@/apis/globalCatchError';
import { StoryItem, StoryUser } from '@/types/story';
import ThreeDotsMenu, { DeleteMenuItem } from '@/components/global/ThreeDotsMenu';
import StoryViewersList from '@/components/StoryViewersList';
import { toast } from "sonner";
import { useSocket } from '@/context/SocketContext';
import { startMessage } from '@/apis/commonApiCalls/chatApi';
import { useAppSelector } from '@/store';

export default function StoryPage() {
    const navigate = useNavigate();
    const location = useLocation();
    const { userId } = useParams<{ userId: string }>();
    const [allStories, setAllStories] = useState<StoryUser[]>([]);
    const [currentUserIndex, setCurrentUserIndex] = useState(0);
    const [currentStoryIndex, setCurrentStoryIndex] = useState(0);
    const [isLoading, setIsLoading] = useState(true);
    const [isPaused, setIsPaused] = useState(false);
    const [videoDuration, setVideoDuration] = useState(5); // Default duration in seconds
    const [videoProgress, setVideoProgress] = useState(0); // 0 to 100 percentage
    const [isVideoPlaying, setIsVideoPlaying] = useState(false);
    const [videoEnded, setVideoEnded] = useState(false);
    const [showControls, setShowControls] = useState(true);
    const [hasShownControlsTooltip, setHasShownControlsTooltip] = useState(false);
    const [likedStories, setLikedStories] = useState<{[key: string]: boolean}>({});
    const [showViewers, setShowViewers] = useState(false);
    const videoRef = useRef<HTMLVideoElement>(null);
    const inputRef = useRef<HTMLInputElement>(null);
    const [animationEndDetector, setAnimationEndDetector] = useState(0);
    const [menuOpen, setMenuOpen] = useState(false);
    const currentLoggedInUserId = localStorage.getItem('userId') || "";
    const [replyText, setReplyText] = useState('');
    const { socket, isConnected } = useSocket();
    const [executeStartMessage] = useApiCall(startMessage);
    const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    
    // Use our custom hook for API calls
    const [executeSaveInteraction] = useApiCall(saveStoryInteraction);
    const [executeGetStoryForUser] = useApiCall(getStoryForUser);
    const [executeArchiveStory] = useApiCall(archiveStory);

    // Get current user data from Redux store
    const currentUserData = useAppSelector((state) => state.currentUser);

    // Initialize with the story data passed from the HomePage or fetch from API
    useEffect(() => {
        const initializeStories = async () => {
            setIsLoading(true);
            
            if (location.state) {
                const { currentStory, allStories: passedStories, initialUserIndex } = location.state;
                
                if (passedStories && passedStories.length > 0) {
                    // Map the API story data to our StoryUser format
                    // eslint-disable-next-line @typescript-eslint/no-explicit-any
                    const formattedStories = passedStories.map((story: any) => ({
                        user: story.name,
                        userId: story.userId,
                        avatar: story.profilePic || story.avatar,
                        hasStory: story.hasStory,
                        stories: story.stories,
                        latestStoryTime: story.latestStoryTime
                    }));
                    
                    setAllStories(formattedStories);
                    
                    // Set the initial user index
                    const userIndex = initialUserIndex || 0;
                    setCurrentUserIndex(userIndex);
                    
                    // Find the first unseen story for this user
                    const firstUnseenIndex = formattedStories[userIndex]?.stories.findIndex(
                        (story: StoryItem) => story.seen === 0
                    );
                    
                    // If there's an unseen story, start from there, otherwise start from the beginning
                    if (firstUnseenIndex !== -1) {
                        setCurrentStoryIndex(firstUnseenIndex);
                    } else {
                        setCurrentStoryIndex(0);
                    }
                } else if (currentStory) {
                    // If only a single story was passed
                    setAllStories([currentStory]);
                    
                    // Find the first unseen story for this user
                    const firstUnseenIndex = currentStory.stories.findIndex(
                        (story: StoryItem) => story.seen === 0
                    );
                    
                    // If there's an unseen story, start from there, otherwise start from the beginning
                    if (firstUnseenIndex !== -1) {
                        setCurrentStoryIndex(firstUnseenIndex);
                    } else {
                        setCurrentStoryIndex(0);
                    }
                } else if (userId) {
                    // If no story data is passed but we have userId, fetch from API
                    await fetchStoryData(userId);
                } else {
                    // If no location state and no userId, navigate back to home
                    navigate('/');
                }
            } else if (userId) {
                // If no location state but we have userId, fetch from API
                await fetchStoryData(userId);
            } else {
                // If no location state and no userId, navigate back to home
                navigate('/');
            }
            
            setIsLoading(false);
        };
        
        initializeStories();
    }, [location.state, navigate, userId]);
    
    // Function to fetch story data from API
    const fetchStoryData = async (userId: string) => {
        const { data, success } = await executeGetStoryForUser(userId);
        
        if (success && data && data.stories && data.stories.length > 0) {
            // Format the API response to match our StoryUser format
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            const formattedStories = data.stories.map((story: any) => ({
                user: story.name,
                userId: story.userId,
                avatar: story.profilePic || story.avatar,
                hasStory: story.hasStory,
                stories: story.stories,
                latestStoryTime: story.latestStoryTime
            }));
            
            setAllStories(formattedStories);
            
            // Find the first unseen story for this user
            const firstUnseenIndex = formattedStories[0]?.stories.findIndex(
                (story: StoryItem) => story.seen === 0
            );
            
            // If there's an unseen story, start from there, otherwise start from the beginning
            if (firstUnseenIndex !== -1) {
                setCurrentStoryIndex(firstUnseenIndex);
            } else {
                setCurrentStoryIndex(0);
            }
        } else {
            // If API call fails or returns no stories, navigate back to home
            navigate('/');
        }
    };

    // Define navigation functions with useCallback to prevent unnecessary re-renders
    const goToNextStory = useCallback(() => {
        if (allStories.length === 0) return;
        
        const totalStories = allStories[currentUserIndex]?.stories.length || 0;
        
        if (currentStoryIndex < totalStories - 1) {
            // Go to next story of the same user
            setCurrentStoryIndex(currentStoryIndex + 1);
        } else {
            // Move to next user if available
            if (currentUserIndex < allStories.length - 1) {
                setCurrentUserIndex(currentUserIndex + 1);
                
                // Find the first unseen story for the next user
                const nextUserIndex = currentUserIndex + 1;
                const firstUnseenIndex = allStories[nextUserIndex]?.stories.findIndex(
                    story => story.seen === 0
                );
                
                // If there's an unseen story, start from there, otherwise start from the beginning
                if (firstUnseenIndex !== -1) {
                    setCurrentStoryIndex(firstUnseenIndex);
                } else {
                    setCurrentStoryIndex(0);
                }
            } else {
                // If it's the last user's last story, go back to home
                navigate(-1);
            }
        }
        
        // Reset video state when moving to next story
        setVideoEnded(false);
        setVideoProgress(0);
        setIsPaused(false);
    }, [allStories, currentUserIndex, currentStoryIndex, navigate]);

    const goToPreviousStory = useCallback(() => {
        if (allStories.length === 0) return;
        
        if (currentStoryIndex > 0) {
            setCurrentStoryIndex(currentStoryIndex - 1);
        } else {
            // Move to the previous user if available
            if (currentUserIndex > 0) {
                const prevUserStories = allStories[currentUserIndex - 1].stories.length;
                setCurrentUserIndex(currentUserIndex - 1);
                setCurrentStoryIndex(prevUserStories - 1);
            }
        }
        
        // Reset video state when moving to previous story
        setVideoEnded(false);
        setVideoProgress(0);
        setIsPaused(false);
    }, [allStories, currentUserIndex, currentStoryIndex]);

    // Reset video progress when story changes
    useEffect(() => {
        setVideoProgress(0);
        setVideoEnded(false);
        setIsPaused(false);
    }, [currentUserIndex, currentStoryIndex]);

    // Log story ID when story changes
    useEffect(() => {
        if (!isLoading && allStories.length > 0) {
            const currentStoryItem = allStories[currentUserIndex]?.stories[currentStoryIndex];
            if (currentStoryItem) {
                console.log('Current Story ID:', currentStoryItem._id);
            }
        }
    }, [currentUserIndex, currentStoryIndex, isLoading, allStories]);

    // Mark story as seen when it's viewed
    useEffect(() => {
        if (!isLoading && allStories.length > 0) {
            const currentStoryItem = allStories[currentUserIndex]?.stories[currentStoryIndex];
            
            if (currentStoryItem && currentStoryItem.seen === 0) {
                // Call the API to mark the story as seen
                executeSaveInteraction(currentStoryItem._id);
                
                // Update the local state to mark the story as seen
                const updatedStories = [...allStories];
                updatedStories[currentUserIndex].stories[currentStoryIndex].seen = 1;
                setAllStories(updatedStories);
            }
        }
    }, [currentUserIndex, currentStoryIndex, isLoading, allStories, executeSaveInteraction]);

    // Handle video playback when story changes
    useEffect(() => {
        if (!isLoading && allStories.length > 0) {
            const currentStoryItem = allStories[currentUserIndex]?.stories[currentStoryIndex];
            
            if (currentStoryItem?.contentType === 'video' && videoRef.current) {
                // Reset video state
                videoRef.current.currentTime = 0;
                setVideoProgress(0);
                setVideoEnded(false);
                
                // Play the video
                const playPromise = videoRef.current.play();
                
                if (playPromise !== undefined) {
                    playPromise
                        .then(() => {
                            setIsVideoPlaying(true);
                            setIsPaused(false);
                        })
                        .catch(error => {
                            console.error("Video playback failed:", error);
                            // If autoplay is prevented, we need to show play button
                            setIsVideoPlaying(false);
                            setIsPaused(true);
                        });
                }
            }
        }
    }, [currentUserIndex, currentStoryIndex, isLoading, allStories]);

    // Handle video ended state to advance to next story
    useEffect(() => {
        if (videoEnded) {
            // Set progress to 100% before moving to next story
            setVideoProgress(100);
            
            // Reduce delay for faster forwarding
            const timer = setTimeout(() => {
                goToNextStory();
            }, 150);
            
            return () => clearTimeout(timer);
        }
    }, [videoEnded, goToNextStory]);

    // Auto-advance to the next story after duration (5s for images, video duration for videos)
    useEffect(() => {
        // Only set up the timer if we have stories loaded and not paused
        if (!isLoading && allStories.length > 0 && !isPaused) {
            const currentStoryItem = allStories[currentUserIndex]?.stories[currentStoryIndex];
            
            // Only use timer for image content types
            if (currentStoryItem?.contentType !== 'video') {
                const timer = setTimeout(() => {
                    goToNextStory();
                }, 5000);
                
                return () => clearTimeout(timer);
            }
        }
    }, [currentUserIndex, currentStoryIndex, isLoading, allStories.length, goToNextStory, isPaused]);

    // Handle animation end for image stories
    useEffect(() => {
        if (!isPaused && !isLoading && allStories.length > 0) {
            const currentStoryItem = allStories[currentUserIndex]?.stories[currentStoryIndex];
            
            // Only for image content types when story changes, not when resuming
            if (currentStoryItem?.contentType !== 'video') {
                // Only increment the detector when the story changes, not when resuming from pause
                if (currentUserIndex !== undefined && currentStoryIndex !== undefined) {
                    setAnimationEndDetector(currentUserIndex * 100 + currentStoryIndex);
                }
            }
        }
    }, [currentUserIndex, currentStoryIndex, isLoading, allStories.length]);

    // Toggle video play/pause
    const toggleVideoPlayback = useCallback(() => {
        if (!videoRef.current) return;
        
        if (videoRef.current.paused) {
            videoRef.current.play();
            setIsVideoPlaying(true);
            setIsPaused(false);
        } else {
            videoRef.current.pause();
            setIsVideoPlaying(false);
            setIsPaused(true);
        }
    }, []);

    // Update video progress
    const updateVideoProgress = useCallback(() => {
        if (!videoRef.current || videoDuration <= 0) return;
        
        const currentTime = videoRef.current.currentTime;
        const progressPercentage = (currentTime / videoDuration) * 100;
        setVideoProgress(progressPercentage);
    }, [videoDuration]);

    // Toggle play/pause for both image and video stories
    const toggleStoryPlayback = useCallback(() => {
        const currentStoryItem = allStories[currentUserIndex]?.stories[currentStoryIndex];
        
        // For video content, toggle video playback
        if (currentStoryItem?.contentType === 'video') {
            toggleVideoPlayback();
        } 
        // For image content, toggle the paused state
        else {
            setIsPaused(prev => !prev);
        }
    }, [allStories, currentUserIndex, currentStoryIndex, toggleVideoPlayback]);

    // Add keyboard event listener for arrow key navigation
    useEffect(() => {
        const handleKeyDown = (event: KeyboardEvent) => {
            // Skip handling spacebar if the input field is focused
            const isInputFocused = document.activeElement === inputRef.current;
            
            if (event.key === 'ArrowLeft') {
                goToPreviousStory();
            } else if (event.key === 'ArrowRight') {
                goToNextStory();
            } else if (event.key === 'Escape') {
                navigate(-1); // Go back to the previous page
            } else if (event.key === ' ' && !isInputFocused) { // Only toggle playback if input is not focused
                event.preventDefault(); // Prevent page scrolling
                toggleStoryPlayback();
            }
        };

        // Add event listener
        window.addEventListener('keydown', handleKeyDown);

        // Clean up
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [goToNextStory, goToPreviousStory, navigate, toggleStoryPlayback]);

    // Show controls tooltip only once when the page loads
    useEffect(() => {
        if (!isLoading && !hasShownControlsTooltip) {
            setShowControls(true);
            setHasShownControlsTooltip(true);
            
            const timer = setTimeout(() => {
                setShowControls(false);
            }, 3000); // Hide after 3 seconds
            
            return () => clearTimeout(timer);
        }
    }, [isLoading, hasShownControlsTooltip]);

    // Function to handle story deletion
    const handleDeleteStory = async () => {
        if (!allStories.length) return;
        
        const currentStoryItem = allStories[currentUserIndex]?.stories[currentStoryIndex];
        if (!currentStoryItem) return;
        
        const response = await executeArchiveStory(currentStoryItem._id);
        
        if (response.success) {
            toast.success("Story deleted successfully");
            
            // Remove the story from the local state
            const updatedStories = [...allStories];
            updatedStories[currentUserIndex].stories.splice(currentStoryIndex, 1);
            
            // If this was the last story for this user, remove the user
            if (updatedStories[currentUserIndex].stories.length === 0) {
                updatedStories.splice(currentUserIndex, 1);
                
                // If no more stories left at all, go back to home
                if (updatedStories.length === 0) {
                    navigate('/');
                    return;
                }
                
                // Otherwise set to the first story of the next user (or previous if at the end)
                const newUserIndex = currentUserIndex >= updatedStories.length 
                    ? updatedStories.length - 1 
                    : currentUserIndex;
                
                setCurrentUserIndex(newUserIndex);
                setCurrentStoryIndex(0);
            } else {
                // If there are more stories for this user, go to the next one or stay at the last
                const newStoryIndex = currentStoryIndex >= updatedStories[currentUserIndex].stories.length 
                    ? updatedStories[currentUserIndex].stories.length - 1 
                    : currentStoryIndex;
                
                setCurrentStoryIndex(newStoryIndex);
            }
            
            // Update state
            setAllStories(updatedStories);
            
            // Reset video state for the next story
            setVideoProgress(0);
            setVideoEnded(false);
            setIsPaused(false);
            
            // Reset video player if it's a video
            if (videoRef.current) {
                videoRef.current.currentTime = 0;
                
                // Attempt to play the video
                try {
                    const playPromise = videoRef.current.play();
                    if (playPromise !== undefined) {
                        playPromise
                            .then(() => {
                                setIsVideoPlaying(true);
                            })
                            .catch((error) => {
                                console.error("Video play error after deletion:", error);
                                setIsVideoPlaying(false);
                                setIsPaused(true);
                            });
                    }
                } catch (error) {
                    console.error("Error playing video after deletion:", error);
                }
            }
            
            // Reset animation for image stories
            if (currentUserIndex !== undefined && currentStoryIndex !== undefined) {
                setAnimationEndDetector(Math.random() * 1000); // Generate a new random value to trigger animation restart
            }
        } else {
            toast.error("Failed to delete story");
        }
    };

    // Toggle viewers panel
    const toggleViewers = useCallback(() => {
        setShowViewers(!showViewers);
        
        if (showViewers) {
            // Resume playback when closing the viewers panel
            setIsPaused(false);
        } else {
            // Pause the story when viewing the viewers list
            setIsPaused(true);
        }
    }, [showViewers]);

    // Close viewers panel when changing story
    useEffect(() => {
        setShowViewers(false);
    }, [currentUserIndex, currentStoryIndex]);

    // Add an effect to detect when the dropdown menu is closed
    useEffect(() => {
        // We'll use a mutation observer to detect when the dropdown menu is added/removed from the DOM
        const observer = new MutationObserver((mutations) => {
            for (const mutation of mutations) {
                if (mutation.type === 'childList') {
                    // Check if a menu was added
                    const menuContent = document.querySelector('[role="menu"]');
                    if (menuContent && !menuOpen) {
                        setMenuOpen(true);
                        // Pause the story/video
                        const currentStoryItem = allStories[currentUserIndex]?.stories[currentStoryIndex];
                        if (currentStoryItem?.contentType === 'video' && videoRef.current) {
                            videoRef.current.pause();
                            setIsVideoPlaying(false);
                        }
                        setIsPaused(true);
                    } 
                    // Check if menu was removed
                    else if (!menuContent && menuOpen) {
                        setMenuOpen(false);
                        // Only resume if viewers panel is also closed
                        if (!showViewers) {
                            // Resume playback
                            const currentStoryItem = allStories[currentUserIndex]?.stories[currentStoryIndex];
                            if (currentStoryItem?.contentType === 'video' && videoRef.current) {
                                videoRef.current.play()
                                    .then(() => {
                                        setIsVideoPlaying(true);
                                        setIsPaused(false);
                                    })
                                    .catch(error => {
                                        console.error("Video playback failed:", error);
                                    });
                            } else {
                                setIsPaused(false);
                            }
                        }
                    }
                }
            }
        });

        // Observe the document body for changes
        observer.observe(document.body, { childList: true, subtree: true });
        
        return () => {
            observer.disconnect();
        };
    }, [menuOpen, allStories, currentUserIndex, currentStoryIndex, showViewers]);

    const handleSendReply = async (e: React.MouseEvent<HTMLButtonElement>) => {
        e.stopPropagation();
        console.log("Sending reply");
        
        if (!replyText.trim()) {
            toast.error("Please enter a reply");
            return;
        }

        if (!socket || !isConnected) {
            toast.error("Not connected to chat server");
            return;
        }

        try {
            const userId = currentUserData.userId;
            const storyAuthorId = currentStoryItem.author;
            console.log("finding chat with ", storyAuthorId)

            // Start or get conversation with story author
            const startChatResult = await executeStartMessage({ userId2: storyAuthorId });
            
            if (!startChatResult.success || !startChatResult.data) {
                throw new Error("Failed to start conversation");
            }
            console.log("chat" ,startChatResult.data)

            const chatId = startChatResult.data.chatRoom.chatRoomId;
    
            const userName = currentUserData.username;
            const userAvatar = currentUserData.profilePic;

            // Create story reply message data
            const messageData = {
                senderId: userId,
                content: JSON.stringify({
                    senderId: userId,
                    content: replyText,
                    entityId: currentStoryItem._id,
                    media: null,
                    entity: {
                        _id: currentStoryItem._id,
                        author: currentStoryItem.author,
                        createdAt: currentStoryItem.createdAt,
                        storyReply: true,
                        url: currentStoryItem.url,
                        ago_time: currentStoryItem.ago_time
                    },
                    isBot: false
                }),
                entityId: chatId,
                media: null,
                entity: "chat",
                isBot: false,
                senderName: userName,
                senderAvatar: userAvatar
            };

            // Join the chat room
            socket.emit("join", chatId);
            console.log("Joined chat room", chatId);
            
            // Wait a moment for join to complete
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Send the message
            socket.emit("sendMessage", messageData);
            console.log("Sent message", messageData);
            
            // Wait to ensure message is sent
            await new Promise(resolve => setTimeout(resolve, 300));
            
            // Leave the chat room
            socket.emit("leave", chatId);

            // Clear the input and show success message
            setReplyText('');
            toast.success("Reply sent successfully");

        } catch (error) {
            console.error("Error sending story reply:", error);
            toast.error("Failed to send reply");
        }
    };

    // Handle typing in reply input
    const handleReplyChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setReplyText(e.target.value);
        
        // Clear any existing timeout
        if (typingTimeoutRef.current) {
            clearTimeout(typingTimeoutRef.current);
        }
        
        // Pause the story when typing
        setIsPaused(true);
        if (isVideo) {
            videoRef.current?.pause();
            setIsVideoPlaying(false);
        }
        
        // Set a timeout to resume after 5 seconds of no typing
        typingTimeoutRef.current = setTimeout(() => {
            // Only resume if viewers panel and menu are closed
            if (!showViewers && !menuOpen) {
                setIsPaused(false);
                if (isVideo && videoRef.current) {
                    videoRef.current.play()
                        .then(() => {
                            setIsVideoPlaying(true);
                        })
                        .catch(error => {
                            console.error("Video playback failed:", error);
                        });
                }
            }
        }, 5000);
    };

    // Cleanup timeout on unmount
    useEffect(() => {
        return () => {
            if (typingTimeoutRef.current) {
                clearTimeout(typingTimeoutRef.current);
            }
        };
    }, []);

    // If still loading or no stories, show a loading state
    if (isLoading || allStories.length === 0) {
        return <div className="flex items-center justify-center h-screen">Loading stories...</div>;
    }

    const currentUser = allStories[currentUserIndex];
    // Check if currentUser exists before accessing properties
    if (!currentUser || !currentUser.stories || currentUser.stories.length === 0) {
        // Navigate back to home if no stories are available
        navigate('/');
        return <div className="flex items-center justify-center h-screen">No stories available</div>;
    }
    
    const totalStories = currentUser.stories.length;
    const currentStoryItem = currentUser.stories[currentStoryIndex];
    
    // If somehow currentStoryItem is undefined, safely navigate back
    if (!currentStoryItem) {
        navigate('/');
        return <div className="flex items-center justify-center h-screen">Story not found</div>;
    }
    
    const isVideo = currentStoryItem.contentType === 'video';
    const isCurrentUserStory = currentUser.userId === currentLoggedInUserId;

    return (
        <div className="max-w-sm mx-auto py-5 h-[calc(100vh-64px)] relative">
            {/* Left Navigation Arrow */}
            <button
                className="absolute left-[-80px] top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-background shadow-md border border-border hover:bg-muted transition-colors duration-200 cursor-pointer"
                onClick={goToPreviousStory}
            >
                <ArrowLeft className="h-5 w-5 text-foreground" />
            </button>

            {/* Right Navigation Arrow */}
            <button
                className="absolute right-[-80px] top-1/2 -translate-y-1/2 w-10 h-10 flex items-center justify-center rounded-full bg-background shadow-md border border-border hover:bg-muted transition-colors duration-200 cursor-pointer"
                onClick={goToNextStory}
            >
                <ArrowLeft className="h-5 w-5 text-foreground rotate-180" />
            </button>

            <div className='bg-background relative border border-border rounded-lg shadow-sm overflow-hidden'>
                {/* Keyboard Controls Tooltip */}
                {showControls && (
                    <div className="absolute bottom-20 left-0 right-0 z-20 flex justify-center">
                        <div className="px-4 py-2 bg-background/90 rounded-md border border-border shadow-sm text-xs text-foreground animate-fade-in-out">
                            <p>Space: Pause/Play | ← →: Navigate | Esc: Exit</p>
                        </div>
                    </div>
                )}
                
                <div className="absolute top-0 left-0 right-0 flex gap-1 z-10">
                    {Array.from({ length: totalStories }).map((_, index) => {
                        return (
                            <div
                                key={`progress-${index}-${animationEndDetector}`}
                                className="h-1 flex-1 rounded-full overflow-hidden bg-muted"
                            >
                                <div
                                    className={`h-full bg-primary transition-all duration-300 ${
                                        index < currentStoryIndex ? 'w-full' :
                                        index === currentStoryIndex && !isVideo ? 'w-full animate-progress' : 
                                        index === currentStoryIndex && isVideo ? '' : 'w-0'
                                    }`}
                                    style={{
                                        width: index === currentStoryIndex && isVideo ? `${videoProgress}%` : undefined,
                                        animationDuration: index === currentStoryIndex && !isVideo ? '5s' : '0s',
                                        animationPlayState: isPaused ? 'paused' : 'running',
                                        animationFillMode: 'forwards'
                                    }}
                                    onAnimationEnd={() => {
                                        if (index === currentStoryIndex && !isVideo && !isPaused) {
                                            goToNextStory();
                                        }
                                    }}
                                />
                            </div>
                        );
                    })}
                </div>

                {/* Header */}
                <div className="absolute top-5 left-0 right-0 z-10 flex items-center justify-between p-4">
                    <div className="flex items-center gap-3">
                        <button onClick={() => navigate(-1)} className="p-1">
                            <ArrowLeft className="h-5 w-5 text-white cursor-pointer" />
                        </button>
                        <div className="flex items-center gap-2">
                            <Avatar className="h-8 w-8">
                                <AvatarImage src={currentUser.avatar} />
                                <AvatarFallback>{currentUser?.user?.charAt(0) ?? "U"}</AvatarFallback>
                            </Avatar>
                            <div 
                                className="cursor-pointer" 
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the parent's onClick
                                    navigate(`/profile/${currentUser.userId}`);
                                }}
                            >
                                <p className="font-semibold text-sm text-white">{currentUser.user}</p>
                                <p className="text-xs text-white/60">{currentStoryItem.ago_time}</p>
                            </div>
                        </div>
                    </div>
                    
                    <div className="flex items-center gap-2">
                        {/* View counter - only show for current user's stories */}
                        {isCurrentUserStory && (
                            <button 
                                className="p-2 rounded-full bg-background/20 hover:bg-background/30 transition-colors text-white flex items-center gap-1 cursor-pointer"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the parent's onClick
                                    toggleViewers();
                                }}
                            >
                                <Eye className="h-4 w-4" />
                            </button>
                        )}
                    
                        {/* Three Dots Menu - only show for current user's stories */}
                        {isCurrentUserStory && (
                            <div onClick={(e) => e.stopPropagation()}>
                                <ThreeDotsMenu 
                                    items={[
                                        {
                                            ...DeleteMenuItem,
                                            onClick: handleDeleteStory
                                        }
                                    ]} 
                                />
                            </div>
                        )}
                    </div>
                </div>

                {/* Top Gradient Overlay for better visibility */}
                <div className="absolute top-0 left-0 right-0 h-40 z-[5] bg-gradient-to-b from-black/70 to-transparent pointer-events-none"></div>

                {/* Story Content */}
                <div
                    className="h-[calc(100vh-104px)] w-full flex items-center justify-center bg-background relative rounded-2xl"
                    onClick={() => {
                        // Only toggle playback if the menu is not open and viewers panel is not open
                        if (!menuOpen && !showViewers) {
                            toggleStoryPlayback();
                        }
                    }}
                >
                    {isVideo ? (
                        <>
                            <video
                                ref={videoRef}
                                src={currentStoryItem.url}
                                className="w-full h-full p-4 object-contain"
                                playsInline
                                preload="auto"
                                onLoadedMetadata={(e) => {
                                    const target = e.target as HTMLVideoElement;
                                    setVideoDuration(target.duration);
                                }}
                                onTimeUpdate={updateVideoProgress}
                                onEnded={() => {
                                    // When video ends, set videoEnded flag to true and ensure progress is 100%
                                    setVideoEnded(true);
                                    setVideoProgress(100);
                                }}
                                onPlay={() => {
                                    setIsVideoPlaying(true);
                                    setIsPaused(false);
                                }}
                                onPause={() => {
                                    // Only set video as paused if it hasn't ended
                                    if (!videoEnded) {
                                        setIsVideoPlaying(false);
                                        setIsPaused(true);
                                    }
                                }}
                            />
                            {/* Video Controls Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                {!isVideoPlaying && !videoEnded && (
                                    <button 
                                        className="w-12 h-12 bg-primary/80 rounded-full flex items-center justify-center pointer-events-auto"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleVideoPlayback();
                                        }}
                                    >
                                        <Play className="h-6 w-6 text-primary-foreground" />
                                    </button>
                                )}
                            </div>
                        </>
                    ) : (
                        <>
                            <img
                                src={currentStoryItem.url}
                                alt="Story content"
                                className="w-full h-full p-2 pb-16 object-contain"
                            />
                            {/* Image Controls Overlay */}
                            <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                                {isPaused && (
                                    <button 
                                        className="w-12 h-12 bg-primary/80 rounded-full flex items-center justify-center pointer-events-auto"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            toggleStoryPlayback();
                                        }}
                                    >
                                        <Play className="h-6 w-6 text-primary-foreground" />
                                    </button>
                                )}
                            </div>
                        </>
                    )}
                </div>

                {/* Story Viewers Panel */}
                {showViewers && (
                    <StoryViewersList 
                        storyId={currentStoryItem._id}
                        onClose={toggleViewers}
                    />
                )}

                {/* Reply Input */}
                <div className="absolute bottom-0 left-0 right-0 p-4 bg-background/80 backdrop-blur-sm">
                    <div className="flex gap-1 items-center">
                        <Input
                            ref={inputRef}
                            placeholder="What's on your mind..."
                            className="bg-muted border-none rounded-full text-sm"
                            onClick={(e) => e.stopPropagation()}
                            value={replyText}
                            onChange={handleReplyChange}
                            onKeyDown={(e: React.KeyboardEvent<HTMLInputElement>) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSendReply(e as unknown as React.MouseEvent<HTMLButtonElement>);
                                }
                            }}
                        />
                        <button 
                            className="p-2 rounded-full text-primary-foreground flex-shrink-0"
                            onClick={handleSendReply}
                        >
                            <Send className="h-5 w-5" />
                        </button>
                        {/* like story button - only show if not the current user's story */}
                        {!isCurrentUserStory && (
                            <button 
                                className="p-2 rounded-full text-primary-foreground flex-shrink-0"
                                onClick={(e) => {
                                    e.stopPropagation(); // Prevent triggering the parent's onClick
                                    // Toggle like status for current story
                                    const storyId = currentStoryItem._id;
                                    setLikedStories(prev => ({
                                        ...prev,
                                        [storyId]: !prev[storyId]
                                    }));
                                    // Here you would also call API to update like status
                                }}
                            >
                                <Heart 
                                    className={`h-5 w-5 ${likedStories[currentStoryItem._id] ? 'fill-red-500 text-red-500' : ''}`} 
                                />
                            </button>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}
