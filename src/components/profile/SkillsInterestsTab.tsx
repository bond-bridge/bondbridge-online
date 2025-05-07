import React, { useRef, useEffect, useState } from "react";
import { addSkill, removeSkill } from "../../store/createProfileSlice";
import { useAppDispatch, useAppSelector } from "../../store";
import { AVAILABLE_INTERESTS } from "@/lib/constants";
import { TruncatedList } from "@/components/ui/TruncatedList";

// Interest item component for available interests
const AvailableInterestItem = ({ interest, onAdd }: { interest: string; onAdd: (interest: string) => void }) => {
  const textRef = useRef<HTMLSpanElement>(null);
  const [title, setTitle] = useState<string | undefined>(undefined);
  
  useEffect(() => {
    if (textRef.current && textRef.current.scrollWidth > textRef.current.clientWidth) {
      setTitle(interest);
    }
  }, [interest]);
  
  return (
    <button
      className="border-2 w-full border-border text-foreground px-3 py-1 rounded-full truncate text-left cursor-pointer hover:bg-secondary"
      onClick={() => onAdd(interest)}
      title={title}
    >
      <span className="flex-shrink-0">+</span>
      <span ref={textRef} className="truncate ml-2">{interest}</span>
    </button>
  );
};

interface SkillsInterestsTabProps {
  onValidationChange?: (isValid: boolean) => void;
}

const SkillsInterestsTab: React.FC<SkillsInterestsTabProps> = ({ onValidationChange }) => {
  const dispatch = useAppDispatch();
  const { skillSelected } = useAppSelector(
    (state) => state.createProfile
  );
  
  const MIN_REQUIRED_INTERESTS = 3;
  
  // Validate selection and notify parent component
  useEffect(() => {
    const isValid = skillSelected.length >= MIN_REQUIRED_INTERESTS;
    if (onValidationChange) {
      onValidationChange(isValid);
    }
  }, [skillSelected, onValidationChange, MIN_REQUIRED_INTERESTS]);
  
  const isValidSelection = skillSelected.length >= MIN_REQUIRED_INTERESTS;

  const handleAddSkill = (skill: string) => {
    dispatch(addSkill(skill));
  };

  const handleRemoveSkill = (skill: string) => {
    dispatch(removeSkill(skill));
  };

  // Filter available interests to exclude already selected ones
  const availableInterests = AVAILABLE_INTERESTS.filter(
    (interest) => !skillSelected.includes(interest)
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="mb-2 text-sm font-medium">
          Selected Interests <span className="text-red-500">*</span>
        </h3>
        <div className="flex flex-wrap gap-2 overflow-y-auto max-h-[20vh]">
          {skillSelected.map((selectedSkill) => (
            <button
            key={selectedSkill}
            className="bg-primary text-primary-foreground px-3 py-1 rounded-full flex items-center"
            onClick={() => handleRemoveSkill(selectedSkill)}
          >
            {selectedSkill} <span className="ml-2 cursor-pointer">✕</span>
          </button>
          ))}
        </div>
      </div>
      
      {!isValidSelection && (
        <div className="text-sm text-muted-foreground mt-1">
          Please select at least {MIN_REQUIRED_INTERESTS} interests
        </div>
      )}

      <div>
        <h3 className="mb-2 text-sm font-medium">Available Interests</h3>
        <TruncatedList
          items={availableInterests}
          limit={15}
          className="h-[30vh] overflow-y-auto"
          itemsContainerClassName="grid grid-cols-2 md:grid-cols-3 gap-3 w-full"
          emptyMessage="No more available interests"
          renderItem={(interest) => (
            <AvailableInterestItem 
              key={interest} 
              interest={interest} 
              onAdd={handleAddSkill} 
            />
          )}
        />
      </div>
    </div>
  );
};

export default SkillsInterestsTab;