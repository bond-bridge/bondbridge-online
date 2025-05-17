import { Button } from "@/components/ui/button";
import { useApiCall } from "@/apis/globalCatchError";
import {
  acceptFriendRequest,
  rejectFriendRequest,
  FollowRequest
} from "@/apis/commonApiCalls/notificationsApi";
import { TruncatedText } from "@/components/ui/TruncatedText";
import { Link } from "react-router-dom";

interface FriendRequestProps extends Omit<FollowRequest, 'profilePic'> {
  onActionComplete: (
    requestId: string,
    success: boolean,
    action: "accept" | "reject"
  ) => void;
  bio?: string;
  profilePic?: string;
}

const FriendRequest = ({
  _id,
  name,
  avatar,
  bio,
  profilePic,
  onActionComplete,
}: FriendRequestProps) => {
  const [executeAccept, isAccepting] = useApiCall(acceptFriendRequest);
  const [executeReject, isRejecting] = useApiCall(rejectFriendRequest);

  const handleAccept = async () => {
    // Notify parent to remove the request immediately
    onActionComplete(_id, true, "accept");

    // Try to accept the request
    const result = await executeAccept({ otherId: _id });

    // If it fails, notify parent to restore the request
    if (!result.success) {
      onActionComplete(_id, false, "accept");
    }
  };

  const handleReject = async () => {
    // Notify parent to remove the request immediately
    onActionComplete(_id, true, "reject");

    // Try to reject the request
    const result = await executeReject({ otherId: _id });

    // If it fails, notify parent to restore the request
    if (!result.success) {
      onActionComplete(_id, false, "reject");
    }
  };

  const isLoading = isAccepting || isRejecting;

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <Link to={`/profile/${_id}`}>
      <div className="flex items-center gap-4">
        <img
          src={profilePic || avatar}
          alt={name}
          className="w-12 h-12 rounded-full object-cover"
        />
        <div>
          <h3 className="font-medium">{name}</h3>
          <TruncatedText text={bio} limit={40} align="left" showToggle={false}/>
        </div>
      </div>
      </Link>
      <div className="flex gap-2">
        <Button  className="cursor-pointer" onClick={handleAccept} disabled={isLoading}>
          Accept
        </Button>
        <Button variant="outline" className="text-foreground border-destructive-foreground cursor-pointer" onClick={handleReject} disabled={isLoading}>
          Decline
        </Button>
      </div>
    </div>
  );
};

export default FriendRequest;
