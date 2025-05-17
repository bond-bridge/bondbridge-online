import { useState } from "react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  FollowRequest,
  deleteSentRequest,
} from "@/apis/commonApiCalls/notificationsApi";
import { useNavigate } from "react-router-dom";
import { useApiCall } from "@/apis/globalCatchError";
import { TruncatedText } from "../ui/TruncatedText";

interface SentRequestProps extends Omit<FollowRequest, "avatar"> {
  bio?: string;
  avatar?: string;
  onActionComplete?: (requestId: string, success: boolean) => void;
}

const SentRequest = ({
  _id,
  name,
  profilePic,
  avatar,
  bio,
  onActionComplete,
}: SentRequestProps) => {
  const [isPending, setIsPending] = useState(false);
  const [isCanceled, setIsCanceled] = useState(false);
  const navigate = useNavigate();
  const [executeDeleteRequest] = useApiCall(deleteSentRequest);

  const viewProfile = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigate(`/profile/${_id}`);
  };

  const handleCancel = async (e: React.MouseEvent) => {
    e.stopPropagation();

    // Don't proceed if already pending or canceled
    if (isPending || isCanceled) return;

    // Optimistically update UI
    setIsPending(true);
    setIsCanceled(true);

    try {
      const { success } = await executeDeleteRequest(_id);

      setIsPending(false);

      if (!success) {
        // If API call fails, revert the UI
        setIsCanceled(false);
      }

      if (onActionComplete) {
        onActionComplete(_id, success);
      }
    } catch (error) {
      console.log(error);
      // Revert UI on error
      setIsCanceled(false);
      setIsPending(false);

      if (onActionComplete) {
        onActionComplete(_id, false);
      }
    }
  };

  // If the request has been canceled and confirmed by API, don't show it
  if (isCanceled) return null;

  return (
    <div
      className="flex items-center gap-3 p-4 rounded-lg border border-border hover:bg-accent/30 transition-colors cursor-pointer"
      onClick={viewProfile}
    >
      <Avatar className="h-12 w-12">
        <AvatarImage src={profilePic || avatar} alt={name} />
        <AvatarFallback>{name.charAt(0)}</AvatarFallback>
      </Avatar>

      <div className="flex justify-between w-full items-center">
        <div className="flex flex-col min-w-0 text-left">
          <h4 className="font-medium text-foreground truncate">{name}</h4>
          <TruncatedText
            text={bio}
            align="left"
            limit={40}
            showToggle={false}
          />
        </div>

          <button
            className="pr-4 text-foreground cursor-pointer"
            onClick={handleCancel}
            disabled={isPending}
          >
            <div className="text-sm border border-destructive hover:bg-destructive/20 rounded-3xl px-2 py-1">Cancel</div>
          </button>
      </div>
    </div>
  );
};

export default SentRequest;
