import { ChatItem } from "@/store/chatSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import { setActiveChat } from "../../store/chatSlice";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";

// Extended ChatItem for communities with additional properties
interface CommunityItem extends ChatItem {
  members?: string[];
  memberCount?: number;
  backgroundImage?: string;
  description?: string;
}

interface CommunityListProps {
  communities: ChatItem[];
  isLoading: boolean;
  onSelectCommunity: (community: ChatItem) => void;
}

const CommunityList = ({
  communities,
  isLoading,
  onSelectCommunity,
}: CommunityListProps) => {
  const dispatch = useAppDispatch();
  const activeChat = useAppSelector(state => state.chat.activeChat);

  const handleCommunitySelect = (community: ChatItem) => {
    dispatch(setActiveChat(community));
    onSelectCommunity(community);
  };

  if (isLoading) {
    return (
      <div className="flex justify-center p-4">Loading Communities...</div>
    );
  }

  return (
    <div className="space-y-2">
      {communities.map((community) => {
        const communityWithDetails = community as CommunityItem;
        const isActive = activeChat?.id === community.id;
        
        return (
          <div
            key={community.id}
            className={`flex items-center justify-between p-4 rounded-lg ${
              isActive 
                ? 'bg-primary/10 border-primary' 
                : 'border-primary/20 bg-background hover:bg-primary/5'
            } border cursor-pointer transition-colors duration-200`}
            onClick={() => handleCommunitySelect(community)}
          >
            <div className="flex items-center gap-4 flex-1">
              <Avatar className="h-10 w-10 rounded-full border-2 border-primary/30">
                <AvatarImage 
                  src={community.avatar || "/placeholder.png"} 
                  alt={community.name} 
                  className="object-cover" 
                />
                <AvatarFallback className="rounded-full bg-primary/20 text-primary">{community.name[0]}</AvatarFallback>
              </Avatar>
              <div className="flex-1">
                <h3 className="font-semibold text-primary">{community.name}</h3>
                <p className="text-sm text-muted-foreground line-clamp-1">
                  {communityWithDetails.description || "Community description"}
                </p>
              </div>
              <div className="text-xs text-foreground/80 font-medium">
                {communityWithDetails?.memberCount || community.participants.length || 0} Members
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default CommunityList;

// import React, { useEffect, useState } from 'react';
// import axios from 'axios';
// import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
// import { Button } from "@/components/ui/button";
// import { CommunityL } from '@/types/activity';

// const CommunityList: React.FC = () => {
//   const [communities, setCommunities] = useState<CommunityL[]>([]);
//   const [loading, setLoading] = useState(true);
//   const [error, setError] = useState<string | null>(null);

//   useEffect(() => {
//     const fetchCommunities = async () => {
//       try {
//         const { data } = await axios.get('http://localhost:3000/api/communities');
//         setCommunities(data);
//       } catch (err: any) {
//         setError(err.response?.data?.message || 'Failed to fetch communities');
//       } finally {
//         setLoading(false);
//       }
//     };

//     fetchCommunities();
//   }, []);

//   const handleJoinToggle = async (id: number, joined: boolean) => {
//     try {
//       await axios.post('http://localhost:3000/api/communities/join', { id, joined: !joined });
//       setCommunities((prev) =>
//         prev.map((community) =>
//           community.id === id ? { ...community, joined: !joined } : community
//         )
//       );
//     } catch (err: any) {
//       alert(err.response?.data?.message || 'Failed to update community status');
//     }
//   };

//   if (loading) return <p className="text-center text-gray-500">Loading communities...</p>;
//   if (error) return <p className="text-center text-red-500">{error}</p>;

//   return (
//     <div className="space-y-4">
//       {communities.map((community) => (
//         <div
//           key={community.id}
//           className="flex items-center justify-between p-3 rounded-lg hover:bg-muted cursor-pointer"
//         >
//           <div className="flex items-center gap-3">
//             <Avatar className="h-12 w-12 rounded-lg">
//               <AvatarImage src={community.image} alt={community.name} className="object-cover" />
//               <AvatarFallback className="rounded-lg">{community.name[0]}</AvatarFallback>
//             </Avatar>
//             <div>
//               <h3 className="font-medium">{community.name}</h3>
//               <p className="text-sm text-muted-foreground">{community.members.toLocaleString()} members</p>
//             </div>
//           </div>
//           <Button
//             variant={community.joined ? "outline" : "default"}
//             className={community.joined ? "border-primary text-primary" : ""}
//             onClick={() => handleJoinToggle(community.id, community.joined)}
//           >
//             {community.joined ? 'Joined' : 'Join'}
//           </Button>
//         </div>
//       ))}
//     </div>
//   );
// };

// export default CommunityList;
