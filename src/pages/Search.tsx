import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Search as SearchIcon, Loader2, Users, AlertCircle, ArrowLeft } from "lucide-react";
import SearchResults from "@/components/SearchResults";
import { Link } from "react-router-dom";
import { Person, searchPeople } from "@/apis/commonApiCalls/searchApi";
import { useApiCall } from "@/apis/globalCatchError";
import { SearchResultsListSkeleton } from "@/components/skeletons/SearchSkeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { SearchHistoryItem } from "@/components/SearchHistoryItem";
import { SearchHistoryUser } from "@/apis/apiTypes/searchHistory";
import { getSearchHistory, clearSearchHistory } from "@/apis/commonApiCalls/searchHistoryApi";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";

export default function Search() {
  const [searchQuery, setSearchQuery] = useState("");
  const [people, setPeople] = useState<Person[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [hasSearched, setHasSearched] = useState(false);
  const [searchHistory, setSearchHistory] = useState<SearchHistoryUser[]>([]);
  const [prevSearchHistory, setPrevSearchHistory] = useState<SearchHistoryUser[]>([]);

  // Using useApiCall for all API operations
  const [executeSearch, isLoading] = useApiCall(searchPeople);
  const [executeGetSearchHistory, isLoadingHistory] = useApiCall(getSearchHistory);
  const [executeClearHistory, isClearingHistory] = useApiCall(clearSearchHistory);

  // Fetch search history when component mounts
  useEffect(() => {
    fetchSearchHistory();
  }, []);

  const fetchSearchHistory = async () => {
    const { success, data } = await executeGetSearchHistory();
    if (success && data) {
      setSearchHistory(data.filter((user) => user.name));
      setPrevSearchHistory(data);
    }
  };

  const handleClearAllHistory = async () => {
    if (isClearingHistory) return;
    
    // Store current history for potential revert
    setPrevSearchHistory(searchHistory);
    // Optimistically clear the history
    setSearchHistory([]);
    
    const { success } = await executeClearHistory();
    if (!success) {
      // Revert to previous state if the API call fails
      setSearchHistory(prevSearchHistory.filter((user) => user.name));
      toast.error("Failed to clear search history");
    }
  };

  const handleRemoveHistoryItem = (userId: string) => {
    setSearchHistory(prev => prev.filter(user => user.userId !== userId));
  };

  const handleRevertHistoryItem = (userId: string) => {
    // Find the removed user in the previous state and add it back
    setSearchHistory(prev => {
      const removedUser = searchHistory.find(user => user.userId === userId);
      if (removedUser) {
        return [...prev, removedUser];
      }
      return prev;
    });
  };

  useEffect(() => {
    const fetchPeople = async () => {
      if (!searchQuery.trim()) {
        setPeople([]);
        setHasSearched(false);
        return;
      }

      const result = await executeSearch(searchQuery);
      setHasSearched(true);

      if (result.success) {
        setPeople(result.data?.users || []);
        setError(null);
      } else {
        setError(result.data?.message || "Failed to search for people");
        setPeople([]);
      }
    };

    // Add debounce to avoid too many API calls
    const timeoutId = setTimeout(() => {
      fetchPeople();
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [searchQuery]);

  return (
    <>
      <div className="max-w-2xl mx-auto bg-background px-4 pb-4">
        <div className="sticky bg-background py-4 z-10 -top-10 flex items-center relative">
          <Link to="/" className="absolute left-0 flex items-center text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-5 w-5" />
          </Link>
          
          {/* Search Bar */}
          <div className="relative w-full ml-6">
            <Input
              placeholder="Search"
              className="w-full bg-muted border-none"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
            {isLoading ? (
              <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
            ) : (
              <SearchIcon className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            )}
          </div>
        </div>
        
        {/* Recent Searches */}
        {searchQuery === "" && !hasSearched && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm text-muted-foreground">Recent Searches</div>
              {searchHistory.length > 0 && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="text-xs text-muted-foreground h-7 cursor-pointer"
                  onClick={handleClearAllHistory}
                  disabled={isClearingHistory}
                >
                  {isClearingHistory ? "Clearing..." : "Clear All"}
                </Button>
              )}
            </div>
            
            {isLoadingHistory ? (
              <div className="flex justify-center py-4">
                <Loader2 className="animate-spin text-muted-foreground" />
              </div>
            ) : searchHistory.length > 0 ? (
              <div className="space-y-2">
                {searchHistory.map((user) => (
                  <SearchHistoryItem 
                    key={user.userId} 
                    user={user} 
                    onRemove={() => handleRemoveHistoryItem(user.userId)}
                    onRevert={() => handleRevertHistoryItem(user.userId)}
                  />
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Users}
                title="No Recent Searches"
                description="Your search history will appear here"
                className="my-8"
              />
            )}
          </div>
        )}
        
        {/* Loading State */}
        {isLoading && searchQuery !== "" && (
          <SearchResultsListSkeleton />
        )}
        
        {/* Error State */}
        {error && !isLoading && (
          <EmptyState
            icon={AlertCircle}
            title="Search Error"
            description={error}
            className="my-8"
          />
        )}
        
        {/* Empty Results State */}
        {!isLoading && hasSearched && people.length === 0 && !error && (
          <EmptyState
            icon={Users}
            title="No Results Found"
            description={`No users found matching "${searchQuery}"`}
            className="my-8"
          />
        )}
        
        {/* People List */}
        {!isLoading && people.length > 0 && (
          <div className="space-y-4">
            {people.map((person) => (
              <div key={person.id}>
                <SearchResults person={person} />
              </div>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
