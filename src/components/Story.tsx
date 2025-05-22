import { FC } from "react";
import { useNavigate } from "react-router-dom";
import { StoryProps } from "@/types/story";

export const Story: FC<StoryProps> = ({ 
  user, 
  userId,
  avatar, 
  hasStory,
  stories,
  latestStoryTime,
  defaultRingColor = 'ring-muted',
  unseenRingColor = 'ring-blue-500',
  allStories = [],
  storyIndex = 0,
  usernameLengthLimit = 10,
  profilePic
}) => {
  const navigate = useNavigate();

  // Check if user has any unseen stories
  const hasUnseenStories = stories.some(story => story.seen === 0);

  const handleStoryClick = () => {
    navigate(`/story/${userId}`, { 
      state: { 
        currentStory: {
          user,
          userId,
          avatar,
          profilePic,
          hasStory,
          stories,
          latestStoryTime
        },
        allStories,
        initialUserIndex: storyIndex,
        preloaded: true // Indicate that media should be already preloaded
      }
    });
  };

  // Function to truncate username if it exceeds the limit
  const truncateUsername = (username: string): string => {
    if (username.length <= usernameLengthLimit) {
      return username;
    }
    return `${username.substring(0, usernameLengthLimit)}...`;
  };

  return (
    <div 
      className="flex flex-col items-center space-y-1 mx-2 my-1"
      onClick={handleStoryClick}
      role="button"
      tabIndex={0}
    >
      <div className={`relative w-16 h-16 rounded-full cursor-pointer ${
        hasUnseenStories
          ? `ring-2 ${unseenRingColor}`
          : `ring-2 ${defaultRingColor}`
      }`}>
        <img 
          src={profilePic || avatar} 
          alt={user} 
          className="w-full h-full rounded-full object-cover p-[2px] bg-background"
        />
      </div>
      <span className="text-xs text-muted-foreground" title={user}>{truncateUsername(user)}</span>
    </div>
  );
}; 