import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import GroupInfoTab from "@/components/groups/GroupInfoTab";
import SelectFriendsTab from "@/components/groups/SelectFriendsTab";
import TabPageLayout from "@/components/layouts/TabPageLayout";
import SkillsInterestsTab from "@/components/profile/SkillsInterestsTab";
import { useApiCall } from "@/apis/globalCatchError";
import { createGroup, editGroup } from "@/apis/commonApiCalls/activityApi";
import { toast } from "sonner";
import { useDispatch } from "react-redux";
import { setActiveChat } from "@/store/chatSlice";
import { ArrowLeft } from "lucide-react";
import { Link } from "react-router-dom";

interface GroupInfo {
  name: string;
  description: string;
  image?: File | null;
}

// interface GroupSkills {
//   skills: string[];
//   interests: string[];
// }

const tabs = [
  { id: "info", label: "Group Information" },
  { id: "skills", label: "Skills/Interests" },
  { id: "friends", label: "Select Friends" },
];

const CreateGroup: React.FC = () => {
  const location = useLocation();
  const currentTab = location.hash.replace("#", "") || "info";
  const navigate = useNavigate();
  const dispatch = useDispatch();

  // State management for each tab
  const [groupInfo, setGroupInfo] = useState<GroupInfo>({
    name: "",
    description: "",
  });
  // const [groupSkills, setGroupSkills] = useState<GroupSkills>({
  //   skills: [],
  //   interests: [],
  // });
  const [selectedParticipants, setSelectedParticipants] = useState<string[]>(
    []
  );
  
  // Validation states
  const [groupInfoValid, setGroupInfoValid] = useState(false);
  const [skillsInterestsValid, setSkillsInterestsValid] = useState(false);
  
  // Track validated tabs
  const [validatedTabs, setValidatedTabs] = useState<string[]>([]);
  
  // Update validated tabs when validation status changes
  useEffect(() => {
    const newValidatedTabs = [...validatedTabs];
    
    // Handle "info" tab validation
    if (groupInfoValid) {
      if (!newValidatedTabs.includes("info")) {
        newValidatedTabs.push("info");
      }
    } else {
      const infoIndex = newValidatedTabs.indexOf("info");
      if (infoIndex !== -1) {
        newValidatedTabs.splice(infoIndex, 1);
      }
    }
    
    // Handle "skills" tab validation
    if (skillsInterestsValid) {
      if (!newValidatedTabs.includes("skills")) {
        newValidatedTabs.push("skills");
      }
    } else {
      const skillsIndex = newValidatedTabs.indexOf("skills");
      if (skillsIndex !== -1) {
        newValidatedTabs.splice(skillsIndex, 1);
      }
    }
    
    setValidatedTabs(newValidatedTabs);
  }, [groupInfoValid, skillsInterestsValid]);

  const [executeCreateGroup, isCreatingGroup] = useApiCall(createGroup);
  const [executeEditGroup] = useApiCall(editGroup);

  const handleNext = async () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);

    console.log("Current Index: ", currentIndex, tabs.length);

    // If we're on the last tab and clicking next, create the group
    if (currentIndex === tabs.length - 1) {
      if (!groupInfo.name.trim()) {
        toast.error("Please provide a group name");
        navigate("#info");
        return;
      }

      if (selectedParticipants.length <= 1) {
        toast.error("Please select atleast two friends to create a group");
        return;
      }

      console.log("selectedParticipants: ", selectedParticipants);
      console.log("groupInfo: ", groupInfo);

      const result = await executeCreateGroup({
        groupName: groupInfo.name,
        participants: selectedParticipants,
      });

      console.log("result: ", result);

      if (result.success) {
        // If we have a description or image, make an edit-group API call
        if (groupInfo.description || groupInfo.image) {
          try {
            // Get the chatRoomId from the nested chatRoom object in the response
            const chatRoomId = result.data?.chatRoom?.chatRoomId;
            if (chatRoomId) {
              const editResult = await executeEditGroup({
                groupId: chatRoomId,
                bio: groupInfo.description,
                image: groupInfo.image || undefined,
                groupName: groupInfo.name,
              });

              console.log("Edit group result:", editResult);

              if (!editResult.success) {
                toast.error("Group created but failed to update details");
              }
            } else {
              console.error("No chatRoomId returned from create group API");
            }
          } catch (error) {
            console.error("Error updating group details:", error);
            toast.error("Group created but failed to update details");
          }
        }

        // Transform the chatRoom data to match ChatItem format
        if (result.data?.chatRoom) {
          const chatRoom = result.data.chatRoom;
          const participants = chatRoom.participants.map((participant) => ({
            userId: participant.userId,
            name: participant.name,
            profilePic: participant.profilePic,
            status: participant.status,
          }));

          const transformedChat = {
            id: chatRoom.chatRoomId,
            name: chatRoom.groupName,
            avatar: chatRoom.profileUrl || "",
            lastMessage: "No Messages Yet",
            timestamp: new Date(chatRoom.updatedAt).toLocaleTimeString([], {
              hour: "2-digit",
              minute: "2-digit",
            }),
            updatedAt: chatRoom.updatedAt || new Date().toISOString(),
            unread: false,
            type: "group" as const,
            admin: chatRoom.admin,
            participants,
          };

          dispatch(setActiveChat(transformedChat));
        }

        navigate("/activity");
      } else {
        toast.error("Failed to create group. Please try again.");
      }
      return;
    }

    // Check if all tabs up to the current one are validated
    const nextTabIndex = currentIndex + 1;
    const tabsToCheck = tabs.slice(0, currentIndex + 1).map(tab => tab.id);
    
    const allPreviousTabsValid = tabsToCheck.every(tabId => validatedTabs.includes(tabId));
    
    if (!allPreviousTabsValid) {
      toast.error("Please complete all required fields in the current and previous tabs before proceeding.");
      // Find the first invalid tab and navigate to it
      for (let i = 0; i <= currentIndex; i++) {
        if (!validatedTabs.includes(tabs[i].id)) {
          navigate(`#${tabs[i].id}`);
          return;
        }
      }
      return;
    }
    
    // Otherwise, proceed to next tab
    navigate(`#${tabs[nextTabIndex].id}`);
  };

  const handleBack = () => {
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
    if (currentIndex > 0) {
      navigate(`#${tabs[currentIndex - 1].id}`);
    } else {
      navigate(-1);
    }
  };
  
  // Handle tab change attempts
  const handleTabChange = (tabId: string) => {
    navigate(`#${tabId}`);
  };

  const isLastTab = currentTab === tabs[tabs.length - 1].id;
  
  // Determine if the Next button should be disabled based on the current tab
  const isNextDisabled = 
    (currentTab === "info" && !groupInfoValid) || 
    (currentTab === "skills" && !skillsInterestsValid);

  return (
    <div className="w-full">
      <div className="flex items-center mb-5 relative">
        <Link to="/activity" className="absolute top-5 left-4 flex items-center text-muted-foreground hover:text-foreground transition-colors">
          <ArrowLeft className="h-full w-full" />
        </Link>
      </div>
      <TabPageLayout
        title="Create Group"
        tabs={tabs}
        currentTab={currentTab}
        onNext={handleNext}
        onBack={handleBack}
        nextButtonText={isLastTab ? "Create" : "Next"}
        isNextLoading={isCreatingGroup}
        isNextDisabled={isNextDisabled}
        validatedTabs={validatedTabs}
        onTabChange={handleTabChange}
        decorativeImages={{
          clipboard: "/profile/clipboard.png",
          deco1: "/profile/deco1.png",
          deco2: "/profile/deco2.png",
        }}
      >
        {currentTab === "info" && (
          <GroupInfoTab 
            groupInfo={groupInfo} 
            onChange={setGroupInfo} 
            onValidationChange={setGroupInfoValid}
          />
        )}
        {currentTab === "skills" && (
          <SkillsInterestsTab
            onValidationChange={setSkillsInterestsValid}
          // skills={groupSkills.skills}
          // interests={groupSkills.interests}
          // onSkillsChange={(skills: string[]) =>
          //   setGroupSkills((prev) => ({ ...prev, skills }))
          // }
          // onInterestsChange={(interests: string[]) =>
          //   setGroupSkills((prev) => ({ ...prev, interests }))
          // }
          />
        )}
        {currentTab === "friends" && (
          <SelectFriendsTab
            selectedParticipants={selectedParticipants}
            onParticipantsChange={setSelectedParticipants}
          />
        )}
      </TabPageLayout>
    </div>
  );
};

export default CreateGroup;
