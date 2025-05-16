import React, { useState, useEffect } from 'react';
import { useAppSelector, useAppDispatch } from '@/store';
import { setAvatar } from '@/store/createProfileSlice';
import { useApiCall } from '@/apis/globalCatchError';
import { fetchAvatars } from '@/apis/commonApiCalls/createProfileApi';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface AvatarData {
  url: string;
  type: string;
}

// Define AvatarGrid component
interface AvatarGridProps {
  avatars: AvatarData[];
  type: string;
  selectedAvatar: string | null; // Can be null if no avatar is selected
  onAvatarSelect: (avatarUrl: string) => void;
}

const AvatarGrid: React.FC<AvatarGridProps> = ({ avatars, type, selectedAvatar, onAvatarSelect }) => {
  if (avatars.length === 0) {
    return <p className="text-center text-muted-foreground py-8">No {type} avatars available</p>;
  }

  return (
    <div className="grid grid-cols-3 md:grid-cols-5 gap-4">
      {avatars.map((avatarItem, index) => (
        <div
          key={`${type}-${index}-${avatarItem.url}`} // Enhanced key for more uniqueness
          className={`relative cursor-pointer rounded-lg border-2 ${selectedAvatar === avatarItem.url
            ? 'border-primary bg-muted'
            : 'border-input hover:border-ring'
            }`}
          onClick={() => onAvatarSelect(avatarItem.url)}
        >

          <img
            src={avatarItem.url}
            alt={`${type} Avatar ${index + 1}`}
            className="h-full w-full mx-auto object-cover rounded-lg"
          />


          {selectedAvatar === avatarItem.url && (
            <div className="absolute -top-2 -right-2 h-6 w-6 bg-primary rounded-full flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-primary-foreground" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
              </svg>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

const SelectAvatarTab: React.FC = () => {
  const [maleAvatars, setMaleAvatars] = useState<AvatarData[]>([]);
  const [femaleAvatars, setFemaleAvatars] = useState<AvatarData[]>([]);
  const [activeTab, setActiveTab] = useState<string>("female");

  const { avatar } = useAppSelector(state => state.createProfile);
  const dispatch = useAppDispatch();


  // Use our custom hook for API calls
  const [executeFetchAvatars, isLoadingAvatars] = useApiCall(fetchAvatars);

  // Update Redux store when avatar is selected
  const handleAvatarSelect = (avatarUrl: string) => {
    dispatch(setAvatar(avatarUrl));
  };

  useEffect(() => {
    const getAvatars = async () => {
      const result = await executeFetchAvatars();

      if (result.success && result.data) {
        const { male, female } = result.data;

        if (male && male.length > 0) {
          setMaleAvatars(male);
        }

        if (female && female.length > 0) {
          setFemaleAvatars(female);
        }

        // If no avatar is selected yet but we have avatars, select the first one
        if (!avatar) {
          const firstAvatar = female?.[0]?.url || male?.[0]?.url;
          if (firstAvatar) {
            handleAvatarSelect(firstAvatar);
            // Set active tab based on which avatar type is available
            setActiveTab(female?.length > 0 ? "female" : "male");
          }
        }
      }
    };

    // Get userId from localStorage
    const userId = localStorage.getItem('userId');

    // Only try to fetch avatars if userId exists
    if (userId) {
      getAvatars();
    }
  }, []);

  // Use isLoadingAvatars instead of the local loading state
  const loading = isLoadingAvatars;

  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">Choose Avatar</p>

      {loading ? (
        <div className="flex justify-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-foreground"></div>
        </div>
      ) : (
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="female" className="cursor-pointer">Female</TabsTrigger>
            <TabsTrigger value="male" className="cursor-pointer">Male</TabsTrigger>
          </TabsList>

          {/* Wrapper for scrollable content */}
          <div className="mt-4 max-h-[50vh] overflow-y-auto p-1">
            <TabsContent value="female" className="space-y-4">
              <AvatarGrid
                avatars={femaleAvatars}
                type="female"
                selectedAvatar={avatar}
                onAvatarSelect={handleAvatarSelect}
              />
            </TabsContent>

            <TabsContent value="male" className="space-y-4">
              <AvatarGrid
                avatars={maleAvatars}
                type="male"
                selectedAvatar={avatar}
                onAvatarSelect={handleAvatarSelect}
              />
            </TabsContent>
          </div>
        </Tabs>
      )}
    </div>
  );
};

export default SelectAvatarTab;