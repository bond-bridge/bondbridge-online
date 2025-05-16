import { useEffect, useState, useRef, useCallback } from "react";
import { Link } from "react-router-dom";
import FriendRequest from "@/components/notifications/FriendRequest";
import SentRequest from "@/components/notifications/SentRequest";
import Notification from "@/components/notifications/Notification";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  FollowRequest,
  fetchNotifications,
  fetchFollowRequests,
  fetchSentRequests,
  markNotificationAsSeen,
  clearAllNotifications,
} from "@/apis/commonApiCalls/notificationsApi";
import { useApiCall } from "@/apis/globalCatchError";
import LogoLoader from "@/components/LogoLoader";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, UserPlus, AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

// Define the actual notification structure from the API
interface ApiNotification {
  _id: string;
  type: string;
  sender: {
    id: string;
    name: string;
    profilePic: string;
  };
  receiverId: string;
  details: {
    notificationText: string;
    notificationImage: string;
    entityType: string;
    entityId: string;
    headerId: string;
    entity: {
      _id: string;
      feedId?: string;
      [key: string]: unknown;
    };
    content: string | null;
  };
  timestamp: string;
  seen: boolean;
}

// New interface to match the updated API response structure
interface UpdatedNotificationsResponse {
  success: boolean;
  message: string;
  data: {
    currentPage: number;
    hasMore: boolean;
    seen: ApiNotification[];
    unseen: ApiNotification[];
    totalCount: number;
    totalPages: number;
    unseenCount: number;
  };
}

const Notifications = () => {
  const [unseenNotifications, setUnseenNotifications] = useState<ApiNotification[]>([]);
  const [seenNotifications, setSeenNotifications] = useState<ApiNotification[]>([]);
  const [friendRequests, setFriendRequests] = useState<FollowRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FollowRequest[]>([]);
  const [unseenCount, setUnseenCount] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollPositionRef = useRef<number>(0);
  const notificationsContainerRef = useRef<HTMLDivElement>(null);

  const [executeNotificationsFetch, isLoadingNotifications] = useApiCall(fetchNotifications);
  const [executeFollowRequestsFetch, isLoadingFollowRequests] = useApiCall(fetchFollowRequests);
  const [executeSentRequestsFetch, isLoadingSentRequests] = useApiCall(fetchSentRequests);
  const [executeMarkAsSeen] = useApiCall(markNotificationAsSeen);
  const [executeClearAll] = useApiCall(clearAllNotifications);

  // Only show full screen loader on initial load
  const isInitialLoading = isLoadingNotifications && page === 1 && !isFetchingMore;
  const isLoading = isLoadingFollowRequests || isLoadingSentRequests || isInitialLoading;

  const handleMarkAsSeen = async (notificationId: string) => {
    const result = await executeMarkAsSeen(notificationId);
    
    if (result.success) {
      // Move the notification from unseen to seen
      const notificationToMove = unseenNotifications.find(n => n._id === notificationId);
      if (notificationToMove) {
        const updatedNotification = { ...notificationToMove, seen: true };
        setUnseenNotifications(prev => prev.filter(n => n._id !== notificationId));
        setSeenNotifications(prev => [updatedNotification, ...prev]);
        // Decrement unseen count
        setUnseenCount(prev => Math.max(0, prev - 1));
      }
    }
  };

  // Handle optimistic notification deletion
  const handleDeleteNotification = (notificationId: string) => {
    // Check if the notification is unseen before removing
    const isUnseen = unseenNotifications.some(n => n._id === notificationId);
    if (isUnseen) {
      setUnseenCount(prev => Math.max(0, prev - 1));
    }
    
    // Optimistically remove the notification from both unseen and seen lists
    setUnseenNotifications(prev => prev.filter(n => n._id !== notificationId));
    setSeenNotifications(prev => prev.filter(n => n._id !== notificationId));
  };

  const handleClearAll = async () => {
    // Store current state for potential rollback
    const originalUnseen = [...unseenNotifications];
    const originalSeen = [...seenNotifications];
    const originalUnseenCount = unseenCount;

    // Optimistically clear notifications
    setUnseenNotifications([]);
    setSeenNotifications([]);
    setUnseenCount(0);

    const result = await executeClearAll();
    if (result.status === 404 || !result.success) {
      // Revert to original state on error
      toast.error("Failed to Clear Notifications");
      setUnseenNotifications(originalUnseen);
      setSeenNotifications(originalSeen);
      setUnseenCount(originalUnseenCount);
    }
  };

  const saveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
  };

  const restoreScrollPosition = () => {
    // Use requestAnimationFrame to ensure the DOM has updated
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);
    });
  };

  const loadData = async (currentPage = 1, append = false) => {
    // If appending data, save current scroll position
    if (append) {
      saveScrollPosition();
    }
    
    // Fetch notifications with pagination
    const notificationsResult = await executeNotificationsFetch({
      page: currentPage,
      limit: 10,
    });
    
    if (notificationsResult.success && notificationsResult.data?.success) {
      // Cast the response to our updated interface
      const response = notificationsResult.data as unknown as UpdatedNotificationsResponse;
      
      if (response.data) {
        // Set unseen count from API response
        if (!append) {
          setUnseenCount(response.data.unseenCount);
        }
        
        // Filter out notifications of type "call"
        const filteredUnseen = Array.isArray(response.data.unseen) 
          ? response.data.unseen.filter(notification => notification.type !== "call")
          : [];
          
        const filteredSeen = Array.isArray(response.data.seen)
          ? response.data.seen.filter(notification => notification.type !== "call") 
          : [];
        
        if (append) {
          // Append new notifications to existing ones
          setUnseenNotifications(prev => [...prev, ...filteredUnseen]);
          setSeenNotifications(prev => [...prev, ...filteredSeen]);
          
          // Restore scroll position after state update
          setTimeout(restoreScrollPosition, 0);
        } else {
          // Replace existing notifications
          setUnseenNotifications(filteredUnseen);
          setSeenNotifications(filteredSeen);
        }
        
        // Check if there are more notifications to load
        const totalNotifications = filteredUnseen.length + filteredSeen.length;
        // If both arrays are empty, there's nothing more to load
        setHasMore(totalNotifications > 0 && 
                  (response.data.currentPage < response.data.totalPages || 
                   response.data.hasMore === true));
      } else {
        if (!append) {
          setUnseenNotifications([]);
          setSeenNotifications([]);
          setUnseenCount(0);
        }
        setHasMore(false);
      }
      setError(null);
    } else {
      if (!append) {
        setUnseenNotifications([]);
        setSeenNotifications([]);
        setUnseenCount(0);
      }
      setHasMore(false);
      setError(notificationsResult.data?.message || "Failed to load notifications");
    }

    if (append) {
      // Restore scroll position again after all state updates
      setTimeout(restoreScrollPosition, 50);
    }

    // Fetch follow requests with pagination
    const followRequestsResult = await executeFollowRequestsFetch({
      page: 1,
      limit: 10,
    });
    if (followRequestsResult.success && followRequestsResult.data) {
      setFriendRequests(followRequestsResult.data.result.filter((request: FollowRequest) => request) || []);
    } else {
      setFriendRequests([]);
    }

    // Fetch sent requests
    const sentRequestsResult = await executeSentRequestsFetch();
    if (sentRequestsResult.success && sentRequestsResult.data) {
      setSentRequests(sentRequestsResult.data.result.filter((request: FollowRequest) => request) || []);
    } else {
      setSentRequests([]);
    }
  };

  // Load more notifications when user scrolls to the bottom
  const loadMoreNotifications = useCallback(async () => {
    if (!hasMore || isLoadingNotifications || isFetchingMore || activeTab !== "notifications") return;
    
    setIsFetchingMore(true);
    saveScrollPosition();
    
    try {
      const nextPage = page + 1;
      await loadData(nextPage, true);
      setPage(nextPage);
    } catch (error) {
      console.error("Error loading more notifications:", error);
    } finally {
      setIsFetchingMore(false);
      // Ensure scroll position is maintained after loading completes
      setTimeout(restoreScrollPosition, 100);
    }
  }, [page, hasMore, isLoadingNotifications, isFetchingMore, activeTab]);

  // Set up IntersectionObserver for infinite scrolling
  useEffect(() => {
    // Clean up previous observer if it exists
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }
    
    // Only set up observer if we have more content to load and we're not already loading
    if (!hasMore || isLoading || isFetchingMore || !loadMoreRef.current || activeTab !== "notifications") return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting && hasMore && !isLoadingNotifications && !isFetchingMore) {
          loadMoreNotifications();
        }
      },
      { threshold: 0.1, rootMargin: "100px" }
    );
    
    if (loadMoreRef.current) {
      observerRef.current.observe(loadMoreRef.current);
    }
    
    return () => {
      if (observerRef.current) {
        observerRef.current.disconnect();
      }
    };
  }, [hasMore, isLoading, isLoadingNotifications, isFetchingMore, loadMoreNotifications, activeTab]);

  useEffect(() => {
    // Reset page when tab changes
    setPage(1);
    setHasMore(true);
    
    // Load initial data
    loadData();
  }, []);

  const handleFriendRequestAction = async (
    requestId: string,
    success: boolean
  ) => {
    if (success) {
      // If the action was successful, keep the request removed
      setFriendRequests((prev) => prev.filter((req) => req._id !== requestId));
    } else {
      // If the action failed, add the request back
      const failedRequest = friendRequests.find((req) => req._id === requestId);
      if (failedRequest) {
        setFriendRequests((prev) => [...prev, failedRequest]);
      }
    }
  };

  const handleSentRequestAction = async (
    requestId: string,
    success: boolean
  ) => {
    if (success) {
      // If the action was successful, remove the request from the list
      setSentRequests((prev) => prev.filter((req) => req._id !== requestId));
    } 
  };

  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    loadData();
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
  };

  // Get total notifications count
  const totalNotificationsCount = unseenNotifications.length + seenNotifications.length;

  return (
    <div className="w-full">
      <div className="flex items-center mb-5 relative">
        <Link to="/" className="absolute left-0 flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-5 w-5" />
        </Link>
      </div>

      {isInitialLoading ? (
        <div className="flex items-center justify-center h-[65vh]">
          <LogoLoader size="md" />
        </div>
      ) : error ? (
        <EmptyState
          icon={AlertCircle}
          title="Couldn't load notifications"
          description={error}
          actionLabel="Try Again"
          onAction={handleRefresh}
          className="my-8"
        />
      ) : (
        <Tabs defaultValue="notifications" className="" onValueChange={handleTabChange}>
          <TabsList className="grid grid-cols-3  ">
            <TabsTrigger value="notifications" className="cursor-pointer ">
              Notifications{" "}
              {unseenCount > 0 && `(${unseenCount})`}
            </TabsTrigger>
            <TabsTrigger value="friend-requests" className="cursor-pointer">
              Friend Requests{" "}
              {friendRequests.length > 0 && `(${friendRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests-sent" className="cursor-pointer">
              Sent Requests{" "}
              {sentRequests.length > 0 && `(${sentRequests.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-4">
            <div className="space-y-4" ref={notificationsContainerRef}>
              {totalNotificationsCount > 0 ? (
                <>
                  <div className="flex justify-end">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={handleClearAll}
                      className="text-foreground hover:text-muted-foreground cursor-pointer"
                    >
                      Clear All
                    </Button>
                  </div>
                  {[...unseenNotifications, ...seenNotifications].map((notification) => (
                    <Notification
                      key={notification._id}
                      _id={notification._id}
                      type={notification.type}
                      title={notification.sender.name}
                      content={notification.details.notificationText || notification.details.content || ""}
                      profilePic={notification.sender.profilePic}
                      avatar={notification.sender.profilePic}
                      timestamp={notification.timestamp}
                      seen={notification.seen}
                      onMarkAsSeen={handleMarkAsSeen}
                      onDelete={handleDeleteNotification}
                      senderId={notification.sender.id}
                      entityDetails={{
                        entityType: notification.details.entityType,
                        entityId: notification.details.entityId,
                        entity: notification.details.entity
                      }}
                    />
                  ))}
                  
                  {/* Load more indicator at the bottom */}
                  <div ref={loadMoreRef} className="flex justify-center py-4">
                    {isFetchingMore && (
                      <div className="flex items-center gap-2 text-muted-foreground">
                        <Loader2 className="h-4 w-4 animate-spin" />
                        <span className="text-sm">Loading more notifications...</span>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <EmptyState
                  icon={Bell}
                  title="No Notifications"
                  description="You don't have any notifications yet. We'll notify you when something happens."
                  className="my-8"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="friend-requests" className="mt-4">
            <div className="space-y-4">
              {friendRequests.length > 0 ? (
                friendRequests.map((request) => (
                  <FriendRequest
                    key={request._id}
                    {...request}
                    onActionComplete={handleFriendRequestAction}
                  />
                ))
              ) : (
                <EmptyState
                  icon={UserPlus}
                  title="No Friend Requests"
                  description="You don't have any friend requests at the moment."
                  className="my-8"
                />
              )}
            </div>
          </TabsContent>

          <TabsContent value="requests-sent" className="mt-4">
            <div className="space-y-4">
              {sentRequests.length > 0 ? (
                sentRequests.map((request) => (
                  <SentRequest
                    key={request._id}
                    {...request}
                    onActionComplete={handleSentRequestAction}
                  />
                ))
              ) : (
                <EmptyState
                  icon={ArrowRight}
                  title="No Requests Sent"
                  description="You haven't sent any Friend Requests yet."
                  className="my-8"
                />
              )}
            </div>
          </TabsContent>
        </Tabs>
      )}
    </div>
  );
};

export default Notifications;