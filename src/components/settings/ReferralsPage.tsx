import React from "react";
import { useAppDispatch, useAppSelector } from "@/store";
import { setSettingsActive } from "@/store/settingsSlice";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Link2 } from "lucide-react";
import { toast } from "sonner";

const ReferralsPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { referralCode, referralCount } = useAppSelector(
    (state) => state.currentUser
  );

  console.log(referralCode, referralCount);

  const handleCloseSettings = () => {
    dispatch(setSettingsActive(false));
  };

  const handleCopyCode = () => {
    if (referralCode) {
      navigator.clipboard
        .writeText(referralCode)
        .then(() => {
          toast.success("Referral code copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy referral code: ", err);
          toast.error("Failed to copy referral code.");
        });
    } else {
      toast.error("No referral code available to copy.");
    }
  };

  const handleCopyLink = () => {
    if (referralCode) {
      const baseUrl = window.location.origin;
      const fullUrl = `${baseUrl}/signup?referral=${referralCode}`;
      navigator.clipboard
        .writeText(fullUrl)
        .then(() => {
          toast.success("Referral link copied to clipboard!");
        })
        .catch((err) => {
          console.error("Failed to copy referral link: ", err);
          toast.error("Failed to copy referral link.");
        });
    } else {
      toast.error("No referral code available to generate a link.");
    }
  };

  return (
    <div className="space-y-6 p-4">
      <div className="flex items-center justify-between mb-6">
        <h3 className="text-lg font-medium cursor-pointer">
          <ArrowLeft
            className="h-4 w-4 mr-2 inline"
            onClick={handleCloseSettings}
          />
          Referrals
        </h3>
      </div>

      {/* <div className="p-6 border border-border rounded-lg shadow-sm bg-card mb-8">
        <h4 className="text-center text-sm text-muted-foreground mb-2">Your Referral Code</h4>
        {referralCode ? (
          <div className="flex flex-col items-center justify-center space-y-4">
            <Badge variant="outline" className="text-2xl font-bold px-6 py-3 tracking-wider border-primary text-foreground">
              {referralCode}
            </Badge>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-md">
              <Button
                variant="default"
                size="lg"
                onClick={handleCopyCode}
                aria-label="Copy referral code"
                className="w-full"
              >
                <Copy className="h-4 w-4 mr-2" />
                Copy Code
              </Button>
              <Button
                variant="secondary"
                size="lg"
                onClick={handleCopyLink}
                aria-label="Copy referral link"
                className="w-full"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
            </div>
          </div>
        ) : (
          <p className="text-center text-muted-foreground py-4">No referral code found.</p>
        )}
        <div className="mt-6 text-center flex gap-3 items-center justify-center">
          <p className="text-2xl font-bold text-foreground">
            {referralCount || 0}
          </p>
          <p className="text-sm text-muted-foreground">
            Friends Joined Using Your Code
          </p>
        </div>
      </div> */}

      <div className="space-y-6">
        <div className="p-5 border border-border rounded-lg shadow-sm bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
            <div>
              <h4 className="text-md font-semibold text-foreground mb-1 sm:mb-0">Your Referral Code</h4>
              <p className="text-sm text-muted-foreground hidden sm:block">Share this code with your friends.</p>
            </div>
            {referralCode ? (
              <div className="flex items-center gap-2 mt-2 sm:mt-0">
                <Badge variant="secondary" className="text-lg px-4 py-2">
                  {referralCode}
                </Badge>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={handleCopyCode}
                  aria-label="Copy referral code"
                  className=""
                >
                  <Copy className="h-4 w-4" />
                </Button>
              </div>
            ) : (
              <p className="text-muted-foreground mt-2 sm:mt-0">No code available.</p>
            )}
          </div>
        </div>

        <div className="p-5 border border-border rounded-lg shadow-sm bg-card">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h4 className="text-md font-semibold text-foreground mb-1 sm:mb-0">Share Your Link</h4>
              <p className="text-sm text-muted-foreground hidden sm:block">Copy and share your unique referral link.</p>
            </div>
            {referralCode ? (
              <Button
                variant="outline"
                size="default"
                onClick={handleCopyLink}
                aria-label="Copy referral link"
                className="mt-2 sm:mt-0 w-full sm:w-auto"
              >
                <Link2 className="h-4 w-4 mr-2" />
                Copy Link 
              </Button>
            ) : (
              <p className="text-muted-foreground mt-2 sm:mt-0">Link not available.</p>
            )}
          </div>
        </div>

        <div className="p-5 border border-border rounded-lg shadow-sm bg-card">
          <div className="flex items-center justify-between">
            <h4 className="text-md font-semibold text-foreground">Friends Joined</h4>
            <p className="text-2xl font-bold text-foreground">
              {referralCount || 0}
            </p>
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Keep sharing to invite more friends!
          </p>
        </div>
      </div>

    </div>
  );
};

export default ReferralsPage; 