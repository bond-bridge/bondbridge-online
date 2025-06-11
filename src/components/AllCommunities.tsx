import { CommunityResponse } from "../apis/apiTypes/communitiesTypes";
import { Loader2 } from "lucide-react";
import { useNavigate } from "react-router-dom";

interface AllCommunitiesProps {
  communities: CommunityResponse[];
  isLoadingCommunities?: boolean;
}

const AllCommunities: React.FC<AllCommunitiesProps> = ({ communities, isLoadingCommunities }) => {
  const navigate = useNavigate();
  if (isLoadingCommunities) {
    return (
      <div className="flex justify-center items-center min-h-[200px]">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (communities.length === 0) {
    return (
      <div className="text-center py-8 text-muted-foreground">
        No Communities Joined
      </div>
    );
  }


  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
      {communities.map((community) => (
        <div 
          key={community._id}
          className="relative rounded-xl bg-muted cursor-pointer hover:bg-accent transition-colors"
          onClick={() => navigate(`/community/${community._id}`)}
        >
          {/* Cover Image */}
          <div className="h-16 w-full rounded-t-xl overflow-hidden">
            <img 
              src={community.backgroundImage || '/profile/community/commbg.png'} 
              alt="" 
              className="w-full h-full object-cover"
            />
          </div>
          
          {/* Profile Picture */}
          <div className="absolute top-8 left-1/2 transform -translate-x-1/2">
            <div className="w-16 h-16 rounded-full border-4 border-background overflow-hidden">
              <img 
                src={community.profilePicture || '/profile/default-avatar.png'} 
                alt="" 
                className="w-full h-full object-cover"
              />
            </div>
          </div>
          
          {/* Content */}
          <div className="pt-10 pb-4 px-4 text-center">
            <h3 className="text-base font-medium text-foreground">
              {community.name}
            </h3>
            <p className="text-sm text-muted-foreground">
              Members: {community?.memberCount}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
};

export default AllCommunities;