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
  deleteNotification,
} from "@/apis/commonApiCalls/notificationsApi";
import { useApiCall } from "@/apis/globalCatchError";
import LogoLoader from "@/components/LogoLoader";
import { EmptyState } from "@/components/ui/empty-state";
import { Bell, UserPlus, AlertCircle, ArrowLeft, ArrowRight, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { AppDispatch, useAppDispatch, useAppSelector } from "@/store";
import {
  setInitialNotifications,
  setMoreNotifications,
  markAsSeenInStore,
  deleteNotificationFromStore,
  clearAllStoredNotifications,
  revertNotificationDeletion,
  setUnseenCountOnly,
  ApiNotification
} from "@/store/notificationsSlice";

// New interface to match the updated API response structure for notifications
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
  const dispatch: AppDispatch = useAppDispatch();
  const { unseenNotifications, seenNotifications, unseenCount } = useAppSelector(
    (state) => state.notifications
  );

  // Local states for non-notification data
  const [friendRequests, setFriendRequests] = useState<FollowRequest[]>([]);
  const [sentRequests, setSentRequests] = useState<FollowRequest[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(true);
  const [isFetchingMore, setIsFetchingMore] = useState(false);
  const [activeTab, setActiveTab] = useState("notifications");
  
  const loadMoreRef = useRef<HTMLDivElement>(null);
  const observerRef = useRef<IntersectionObserver | null>(null);
  const scrollPositionRef = useRef<number>(0);

  const [executeNotificationsFetch, isLoadingNotifications] = useApiCall(fetchNotifications);
  const [executeFollowRequestsFetch, isLoadingFollowRequests] = useApiCall(fetchFollowRequests);
  const [executeSentRequestsFetch, isLoadingSentRequests] = useApiCall(fetchSentRequests);
  const [executeMarkAsSeenAPI] = useApiCall(markNotificationAsSeen);
  const [executeClearAllAPI] = useApiCall(clearAllNotifications);
  const [executeDeleteAPI] = useApiCall(deleteNotification);

  const isInitialLoading = isLoadingNotifications && page === 1 && !isFetchingMore;
  const isLoading = isLoadingFollowRequests || isLoadingSentRequests || isInitialLoading;

  const handleMarkAsSeen = async (notificationId: string) => {
    dispatch(markAsSeenInStore(notificationId));
    
    const result = await executeMarkAsSeenAPI(notificationId);
    
    if (!result.success) {
      toast.error("Failed to mark notification as seen. Please try again.");
    }
  };

  const handleDeleteNotification = async (notificationToDelete: ApiNotification) => {
    const { _id} = notificationToDelete;
    
    dispatch(deleteNotificationFromStore(_id));
    
    const result = await executeDeleteAPI(_id);
    
    if (!result.success) {
      dispatch(revertNotificationDeletion(notificationToDelete));
      toast.error("Failed to delete notification. Please try again.");
    }
  };

  const handleClearAll = async () => {
    const originalUnseen = [...unseenNotifications];
    const originalSeen = [...seenNotifications];
    const originalUnseenCount = unseenCount;

    dispatch(clearAllStoredNotifications());

    const result = await executeClearAllAPI();
    if (!result.success || result.status === 404) {
      dispatch(setInitialNotifications({ 
        unseenItems: originalUnseen, 
        seenItems: originalSeen, 
        initialUnseenCount: originalUnseenCount 
      }));
      toast.error("Failed to Clear Notifications");
    }
  };

  const saveScrollPosition = () => {
    scrollPositionRef.current = window.scrollY;
  };

  const restoreScrollPosition = () => {
    requestAnimationFrame(() => {
      window.scrollTo(0, scrollPositionRef.current);
    });
  };

  const loadData = async (currentPage = 1, append = false) => {
    if (append) saveScrollPosition();
    
    const notificationsResult = await executeNotificationsFetch({
      page: currentPage,
      limit: 10,
    });
    
    if (notificationsResult.success && notificationsResult.data?.success) {
      const response = notificationsResult.data as unknown as UpdatedNotificationsResponse;
      
      if (response.data) {
        const filteredUnseen = Array.isArray(response.data.unseen) 
          ? response.data.unseen.filter(n => n.type !== "call") : [];
        const filteredSeen = Array.isArray(response.data.seen)
          ? response.data.seen.filter(n => n.type !== "call") : [];
        
        if (append) {
          dispatch(setMoreNotifications({ unseenItems: filteredUnseen, seenItems: filteredSeen }));
        } else {
          dispatch(setInitialNotifications({ 
            unseenItems: filteredUnseen, 
            seenItems: filteredSeen, 
            initialUnseenCount: response.data.unseenCount 
          }));
        }
        
        setHasMore(response.data.hasMore || response.data.currentPage < response.data.totalPages);
        if (!append) {
          dispatch(setUnseenCountOnly(response.data.unseenCount));
        }

      } else {
        if (!append) {
          dispatch(setInitialNotifications({ unseenItems: [], seenItems: [], initialUnseenCount: 0 }));
        }
        setHasMore(false);
      }
      setError(null);
    } else {
      if (!append) {
        dispatch(setInitialNotifications({ unseenItems: [], seenItems: [], initialUnseenCount: 0 }));
      }
      setHasMore(false);
      setError(notificationsResult.data?.message || "Failed to load notifications");
    }

    if (append) setTimeout(restoreScrollPosition, 0);

    const followRequestsResult = await executeFollowRequestsFetch({ page: 1, limit: 10 });
    if (followRequestsResult.success && followRequestsResult.data) {
      setFriendRequests(followRequestsResult.data.result.filter((request: FollowRequest) => request) || []);
    } else {
      setFriendRequests([]);
    }

    const sentRequestsResult = await executeSentRequestsFetch();
    if (sentRequestsResult.success && sentRequestsResult.data) {
      setSentRequests(sentRequestsResult.data.result.filter((request: FollowRequest) => request) || []);
    } else {
      setSentRequests([]);
    }
    
    if (append) setTimeout(restoreScrollPosition, 50);
  };

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
      setTimeout(restoreScrollPosition, 100);
    }
  }, [page, hasMore, isLoadingNotifications, isFetchingMore, activeTab, dispatch]);

  useEffect(() => {
    if (observerRef.current) observerRef.current.disconnect();
    if (!hasMore || isLoading || isFetchingMore || !loadMoreRef.current || activeTab !== "notifications") return;
    
    observerRef.current = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) loadMoreNotifications();
      },
      { threshold: 0.1, rootMargin: "100px" }
    );
    
    observerRef.current.observe(loadMoreRef.current);
    return () => observerRef.current?.disconnect();
  }, [hasMore, isLoading, isFetchingMore, loadMoreNotifications, activeTab]);

  useEffect(() => {
    setPage(1);
    setHasMore(true);
    loadData(1, false);
  }, [dispatch]);

  const handleFriendRequestAction = (requestId: string, success: boolean) => {
    if (success) {
      setFriendRequests((prev) => prev.filter((req) => req._id !== requestId));
    } else {
      toast.error("Action failed. Please try again.");
    }
  };

  const handleSentRequestAction = (requestId: string, success: boolean) => {
    if (success) {
      setSentRequests((prev) => prev.filter((req) => req._id !== requestId));
    } else {
      toast.error("Failed to cancel request. Please try again.");
    }
  };

  const handleRefresh = () => {
    setPage(1);
    setHasMore(true);
    setError(null);
    loadData(1, false);
  };

  const handleTabChange = (value: string) => {
    setActiveTab(value);
    setPage(1);
    setHasMore(true);
    if (value === "notifications") {
      loadData(1, false);
    }
  };

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
          <TabsList className="grid grid-cols-3">
            <TabsTrigger value="notifications" className="cursor-pointer">
              Notifications {unseenCount > 0 && `(${unseenCount})`}
            </TabsTrigger>
            <TabsTrigger value="friend-requests" className="cursor-pointer">
              Friend Requests {friendRequests.length > 0 && `(${friendRequests.length})`}
            </TabsTrigger>
            <TabsTrigger value="requests-sent" className="cursor-pointer">
              Sent Requests {sentRequests.length > 0 && `(${sentRequests.length})`}
            </TabsTrigger>
          </TabsList>

          <TabsContent value="notifications" className="mt-4">
            <div className="space-y-4">
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
                      title={notification.sender.name}
                      profilePic={notification.sender.profilePic}
                      avatar={notification.sender.profilePic}
                      timestamp={notification.timestamp}
                      seen={notification.seen}
                      onMarkAsSeen={() => handleMarkAsSeen(notification._id)}
                      onDelete={() => handleDeleteNotification(notification)}
                      entityDetails={notification.details}
                      senderId={notification.sender.id}
                      type={notification.type}
                      content={notification.details.content || ""}
                    />
                  ))}
                  
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