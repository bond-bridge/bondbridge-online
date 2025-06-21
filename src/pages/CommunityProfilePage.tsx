import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ArrowLeft, Users, MessageSquare } from "lucide-react";
import { useApiCall } from "@/apis/globalCatchError";
import {
  joinCommunity,
  fetchCommunityById,
  fetchCommunityMembers,
  CommunityMember,
  fetchCommunityFeed,
  fetchCommunityMediaPosts,
  fetchCommunityQuotePosts,
} from "@/apis/commonApiCalls/communitiesApi";
import { CommunityResponse, TransformedCommunityPost } from "@/apis/apiTypes/communitiesTypes";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import CommunityMemberList from "@/components/CommunityMemberList";
import CommunityPosts from "@/components/CommunityPosts";
import CommunityQuotes from "@/components/CommunityQuotes";
import { TruncatedText } from "@/components/ui/TruncatedText";
import { useInfiniteScroll } from "@/hooks/useInfiniteScroll";

type PostType = 'feed' | 'media' | 'quotes';

const CommunityProfilePage = () => {
  const { communityId } = useParams<{ communityId: string }>();
  const navigate = useNavigate();
  const [community, setCommunity] = useState<CommunityResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isUserMember, setIsUserMember] = useState(false);
  const [isMembershipLoading, setIsMembershipLoading] = useState(false);
  
  const [members, setMembers] = useState<CommunityMember[]>([]);
  const [isLoadingMembers, setIsLoadingMembers] = useState(false);
  const [membersPage, setMembersPage] = useState(1);
  const [hasMoreMembers, setHasMoreMembers] = useState(true);
  
  const [activeTab, setActiveTab] = useState("feed");

  const [feedPosts, setFeedPosts] = useState<TransformedCommunityPost[]>([]);
  const [mediaPosts, setMediaPosts] = useState<TransformedCommunityPost[]>([]);
  const [quotePosts, setQuotePosts] = useState<TransformedCommunityPost[]>([]);

  const [postsState, setPostsState] = useState({
    feed: { page: 1, hasMore: true, isLoading: false },
    media: { page: 1, hasMore: true, isLoading: false },
    quotes: { page: 1, hasMore: true, isLoading: false },
  });

  const [executeJoinCommunity] = useApiCall(joinCommunity);
  const [executeFetchCommunityById] = useApiCall(fetchCommunityById);
  const [executeFetchCommunityFeed] = useApiCall(fetchCommunityFeed);
  const [executeFetchCommunityMediaPosts] = useApiCall(fetchCommunityMediaPosts);
  const [executeFetchCommunityQuotePosts] = useApiCall(fetchCommunityQuotePosts);
  const [executeFetchCommunityMembers] = useApiCall(fetchCommunityMembers);

  // Fetch community details
  useEffect(() => {
    const loadCommunity = async () => {
      if (!communityId) return;

      setLoading(true);
      const result = await executeFetchCommunityById(communityId);

      if (result.success && result.data) {
        const communityData = result.data;
        setCommunity(communityData);
        setIsUserMember(communityData.isJoined || false);
      } else {
        setError("Failed to load Community Data");
      }
      setLoading(false);
    };

    loadCommunity();
  }, [communityId]);

  const loadPosts = useCallback(async (type: PostType, page: number) => {
    if (!communityId) return;

    setPostsState(prev => ({ ...prev, [type]: { ...prev[type], isLoading: true } }));

    let result;
    const params = { page, limit: 9 };

    if (type === 'feed') {
      result = await executeFetchCommunityFeed(communityId, params);
    } else if (type === 'media') {
      result = await executeFetchCommunityMediaPosts(communityId, params);
    } else {
      result = await executeFetchCommunityQuotePosts(communityId, params);
    }

    if (result.success && result.data) {
      const { posts: newPosts, hasMore } = result.data;
      if (type === 'feed') {
        setFeedPosts(prev => (page === 1 ? newPosts : [...prev, ...newPosts]));
      } else if (type === 'media') {
        setMediaPosts(prev => (page === 1 ? newPosts : [...prev, ...newPosts]));
      } else {
        setQuotePosts(prev => (page === 1 ? newPosts : [...prev, ...newPosts]));
      }
      setPostsState(prev => ({ ...prev, [type]: { page, hasMore, isLoading: false } }));
    } else {
      console.error(`Failed to load ${type} posts`);
      setPostsState(prev => ({ ...prev, [type]: { ...prev[type], isLoading: false } }));
    }
  }, [communityId]);

  useEffect(() => {
    if (activeTab === 'feed' && feedPosts.length === 0) loadPosts('feed', 1);
    else if (activeTab === 'posts' && mediaPosts.length === 0) loadPosts('media', 1);
    else if (activeTab === 'quotes' && quotePosts.length === 0) loadPosts('quotes', 1);
    else if (activeTab === 'members' && members.length === 0) loadMembers(1);
  }, [activeTab, communityId]);

  const loadMorePosts = (type: PostType) => {
    const { page, hasMore, isLoading } = postsState[type];
    if (!isLoading && hasMore) {
      loadPosts(type, page + 1);
    }
  };

  const loadMembers = async (page: number) => {
    if (!communityId) return;

    setIsLoadingMembers(true);
    const result = await executeFetchCommunityMembers({
      communityId,
      page,
      limit: 15,
    });

    if (result.success && result.data) {
      const { members: newMembers, hasMore } = result.data;
      setMembers((prev) => (page === 1 ? newMembers : [...prev, ...newMembers]));
      setHasMoreMembers(hasMore);
      setMembersPage(page);
    } else {
      console.error("Failed to load members");
    }
    setIsLoadingMembers(false);
  };

  const loadMoreMembers = () => {
    if (!isLoadingMembers && hasMoreMembers) {
      loadMembers(membersPage + 1);
    }
  };

  const lastFeedPostRef = useInfiniteScroll({
    isLoading: postsState.feed.isLoading,
    hasMore: postsState.feed.hasMore,
    onLoadMore: () => loadMorePosts('feed'),
  });

  const lastMediaPostRef = useInfiniteScroll({
    isLoading: postsState.media.isLoading,
    hasMore: postsState.media.hasMore,
    onLoadMore: () => loadMorePosts('media'),
  });

  const lastQuotePostRef = useInfiniteScroll({
    isLoading: postsState.quotes.isLoading,
    hasMore: postsState.quotes.hasMore,
    onLoadMore: () => loadMorePosts('quotes'),
  });

  const lastMemberRef = useInfiniteScroll({
    isLoading: isLoadingMembers,
    hasMore: hasMoreMembers,
    onLoadMore: loadMoreMembers,
  });

  const handleJoinCommunity = async () => {
    if (!communityId) return;

    const userId = localStorage.getItem("userId");
    if (!userId) {
      toast.error("Authentication required", {
        description: "Please login to join communities",
      });
      return;
    }

    setIsMembershipLoading(true);
    const result = await executeJoinCommunity({
      communityIds: [communityId],
      userId,
      action: "join",
    });

    if (result.success) {
      setIsUserMember(true);
      toast.success("Success", {
        description: "You have Joined the Community!",
      });
    } else {
      toast.error("Error", {
        description: "Failed to Join Community",
      });
    }
    setIsMembershipLoading(false);
  };

  const handleLeaveCommunity = async () => {
    if (!communityId) return;

    const userId = localStorage.getItem("userId");
    if (!userId) return;

    setIsMembershipLoading(true);
    const result = await executeJoinCommunity({
      communityIds: [communityId],
      userId,
      action: "remove",
    });

    if (result.success) {
      setIsUserMember(false);
      toast.success("Success", {
        description: "You have Left the Community",
      });
    } else {
      toast.error("Error", {
        description: "Failed to Leave Community",
      });
    }
    setIsMembershipLoading(false);
  };
  
  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !community) {
    return (
      <div className="p-6 text-center">
        <h2 className="text-xl font-semibold mb-2">Error</h2>
        <p className="text-muted-foreground">
          {error || "Community not found"}
        </p>
        <Button
          variant="outline"
          className="mt-4 cursor-pointer"
          onClick={() => navigate("/activity")}
        >
          Go Back
        </Button>
      </div>
    );
  }

  const renderPostList = <P extends { posts: TransformedCommunityPost[]; communityId: string }>(
    type: PostType,
    posts: TransformedCommunityPost[],
    lastElementRef: (node: HTMLDivElement | null) => void,
    Component: React.ComponentType<P>,
    componentProps: Omit<P, 'posts'>
  ) => {
    const { isLoading, hasMore } = postsState[type];
    const allProps = { ...componentProps, posts } as P;

    return (
      <div>
        {posts.length > 0 ? (
          <div>
            <Component {...allProps} />
            {hasMore && <div ref={lastElementRef} />}
          </div>
        ) : (
          !isLoading && (
            <div className="text-center py-8 text-muted-foreground">
              No Posts
            </div>
          )
        )}
        {isLoading && (
          <div className="flex justify-center items-center py-4">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        )}
      </div>
    );
  };


  return (
    <div className="flex flex-col min-h-screen">
      {/* Header with background image */}
      <div className="relative">
        <div className="h-48 w-full overflow-hidden">
          <img
            src={community.backgroundImage || "/placeholder-bg.jpg"}
            alt={`${community.name} background`}
            className="w-full h-full object-cover"
          />
        </div>

        {/* Back button */}
        <Button
          variant="ghost"
          size="icon"
          className="absolute top-4 left-4 bg-background/60 backdrop-blur-sm rounded-full cursor-pointer"
          onClick={() => navigate("/activity")}
        >
          <ArrowLeft className="h-5 w-5" />
        </Button>

        {/* Community avatar */}
        <div className="absolute left-1/2 transform -translate-x-1/2 -bottom-16">
          <Avatar className="h-32 w-32 border-4 border-background">
            <AvatarImage
              src={community.profilePicture || "/placeholder.png"}
              alt={community.name}
              className="object-cover"
            />
            <AvatarFallback className="text-2xl">
              {community.name.charAt(0)}
            </AvatarFallback>
          </Avatar>
        </div>
      </div>

      {/* Community information */}
      <div className="flex flex-col items-center mt-20 px-6">
        <h1 className="text-3xl font-bold text-center">{community.name}</h1>

        <div className="flex items-center gap-2 my-2">
          <Badge variant="secondary" className="px-2 py-0.5">
            <Users className="h-3 w-3 mr-1" />
            {community?.memberCount} Members
          </Badge>
          <Badge variant="secondary" className="px-2 py-0.5">
            <MessageSquare className="h-3 w-3 mr-1" />
            {community.postCount || 0} Posts
          </Badge>
        </div>

        <TruncatedText
          text={community.description || ""}
          limit={100}
          placeholderText={"No bio available"}
          className="text-foreground text-sm text-center mx-auto max-w-[35vw]"
        />

        <div className="mt-6">
          {isUserMember ? (
            <div className="flex gap-3">
              <Link to={`/community/${communityId}/post`}>
                <Button
                  variant="default"
                  className="rounded-full border-destructive cursor-pointer"
                  disabled={isMembershipLoading}
                >
                  + Post
                </Button>
              </Link>
              <Button
                variant="outline"
                className="rounded-full text-foreground border-destructive cursor-pointer"
                onClick={handleLeaveCommunity}
                disabled={isMembershipLoading}
              >
                {isMembershipLoading ? (
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                ) : null}
                Leave
              </Button>

            </div>
          ) : (
            <Button
              className="rounded-full cursor-pointer"
              onClick={handleJoinCommunity}
              disabled={isMembershipLoading}
            >
              {isMembershipLoading ? (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              ) : null}
              Join
            </Button>
          )}
        </div>
      </div>

      <div className="flex-1 mt-8">
        <Tabs 
          defaultValue="feed" 
          className="w-full"
          onValueChange={(value) => setActiveTab(value)}
        >
          <TabsList className="grid w-full grid-cols-4 bg-background/30 rounded-lg backdrop-blur-sm mb-4 *:rounded-md *:m-1 *:data-[state=active]:bg-accent *:data-[state=active]:text-foreground *:text-muted-foreground">
            <TabsTrigger value="feed" className="cursor-pointer">News Feed</TabsTrigger>
            <TabsTrigger value="posts" className="cursor-pointer">Recent</TabsTrigger>
            <TabsTrigger value="quotes" className="cursor-pointer">Comments</TabsTrigger>
            <TabsTrigger value="members" className="cursor-pointer">Members</TabsTrigger>
          </TabsList>
          
          <TabsContent value="feed" className="p-4">
            {renderPostList('feed', feedPosts, lastFeedPostRef, CommunityQuotes, {
              showMediaPosts: true,
              communityId: communityId || ''
            })}
          </TabsContent>

          <TabsContent value="posts" className="p-4">
            {renderPostList('media', mediaPosts, lastMediaPostRef, CommunityPosts, {
              communityId: communityId || ''
            })}
          </TabsContent>

          <TabsContent value="quotes" className="p-4">
            {renderPostList('quotes', quotePosts, lastQuotePostRef, CommunityQuotes, {
              showMediaPosts: false,
              communityId: communityId || ''
            })}
          </TabsContent>

          <TabsContent value="members" className="p-4">
            {isLoadingMembers && members.length === 0 ? (
              <div className="flex justify-center items-center min-h-[200px]">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : members.length > 0 ? (
              <div>
                <CommunityMemberList memberDetails={members} />
                {isLoadingMembers && (
                  <div className="flex justify-center items-center py-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                )}
                <div ref={lastMemberRef} />
              </div>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No Members in the Community
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default CommunityProfilePage;
