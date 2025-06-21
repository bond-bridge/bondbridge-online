import React from "react";
import { Link, useNavigate } from "react-router-dom";
import { cn } from "@/lib/utils";
import Grid, { GridContentPanel } from "@/components/grid";
import { Button } from "@/components/ui/button";
import { Loader2 } from "lucide-react";

interface Tab {
  id: string;
  label: string;
}

interface TabPageLayoutProps {
  title: string;
  tabs: Tab[];
  currentTab: string;
  onNext: () => void;
  onBack: () => void;
  children: React.ReactNode;
  nextButtonText?: string;
  isNextLoading?: boolean;
  isNextDisabled?: boolean;
  validatedTabs?: string[]; // Array of tab IDs that have been validated
  onTabChange?: (tabId: string) => void; // Handler for tab changes
  customIsTabAccessible?: (tabId: string) => boolean; // Custom function to determine if a tab is accessible
  decorativeImages: {
    clipboard: string;
    deco1: string;
    deco2: string;
  };
}

const TabPageLayout: React.FC<TabPageLayoutProps> = ({
  title,
  tabs,
  currentTab,
  onNext,
  onBack,
  children,
  nextButtonText = "Next",
  isNextLoading = false,
  isNextDisabled = false,
  validatedTabs = [],
  onTabChange,
  customIsTabAccessible,
  decorativeImages,
}) => {
  const navigate = useNavigate();
  
  // Check if a tab is accessible
  const isTabAccessible = (tabId: string) => {
    // If custom function is provided, use it
    if (customIsTabAccessible) {
      return customIsTabAccessible(tabId);
    }
    
    // Default accessibility logic
    const currentIndex = tabs.findIndex((tab) => tab.id === currentTab);
    const targetIndex = tabs.findIndex((tab) => tab.id === tabId);
    
    // Current tab is always accessible
    if (tabId === currentTab) return true;
    
    // Previous tabs are always accessible
    if (targetIndex < currentIndex) return true;
    
    // For any forward navigation (future tabs), check that ALL previous tabs are validated
    if (targetIndex > currentIndex) {
      // Check if all tabs before the target tab are validated
      for (let i = 0; i < targetIndex; i++) {
        if (!validatedTabs.includes(tabs[i].id)) {
          return false;
        }
      }
      return true;
    }
    
    return false;
  };
  
  const handleTabClick = (e: React.MouseEvent<HTMLAnchorElement>, tabId: string) => {
    if (!isTabAccessible(tabId)) {
      e.preventDefault();
      return;
    }
    
    if (onTabChange) {
      onTabChange(tabId);
    }
  };

  const handleBack = () => {
    // If on the first tab, handle based on tab ID
    if (currentTab === tabs[0]?.id) {
      if (tabs[0]?.id === "personal") {
        // Disable back button for personal tab
        navigate("/login");
      } else if (tabs[0]?.id === "info") {
        navigate("/activity");
      }
    } else {
      // Otherwise use the provided onBack function for tab navigation
      onBack();
    }
  };

  return (
    <Grid className="md:h-[calc(100vh-64px)] grid items-center">
      {/* Left Section: Heading + Nav */}
      <div className="">
        <h1 className="md:text-5xl text-2xl font-medium mb-6">{title}</h1>

        <nav className="space-y-4 hidden md:block">
          {tabs.map((tab) => (
            <Link
              key={tab.id}
              to={isTabAccessible(tab.id) ? `#${tab.id}` : "#"}
              onClick={(e) => handleTabClick(e, tab.id)}
              className={cn(
                "block py-2 text-lg",
                currentTab === tab.id
                  ? "font-semibold text-foreground text-xl"
                  : "text-muted-foreground",
                !isTabAccessible(tab.id) && "opacity-50 cursor-default"
              )}
            >
              {tab.label}
            </Link>
          ))}
        </nav>
      </div>

      {/* Right Section: Form + Illustration */}
      <div className="relative col-span-2 ">
        <GridContentPanel>
          {/* Main Content */}
          {children}

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-6">
            <Button 
              variant="outline" 
              onClick={handleBack} 
              className={cn(
                "cursor-pointer",
                currentTab === tabs[0]?.id && tabs[0]?.id === "personal" && "opacity-50 cursor-not-allowed"
              )}
              // disabled={currentTab === tabs[0]?.id && tabs[0]?.id === "personal"}
            >
              Back
            </Button>
            <Button 
              onClick={onNext} 
              disabled={isNextLoading || isNextDisabled} 
              className="cursor-pointer"
            >
              {isNextLoading && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              {nextButtonText}
            </Button>
          </div>
        </GridContentPanel>

        {/* Decorative Images */}
        {decorativeImages?.clipboard && (
          <div className="absolute top-0 -right-20 transform pointer-events-none hidden lg:block">
            <img
              src={decorativeImages.clipboard}
              alt="Clipboard Check"
              className="w-36"
            />
          </div>
        )}

        {decorativeImages?.deco1 && (
          <div className="absolute bottom-0 -right-20 pointer-events-none hidden lg:block">
            <img
              src={decorativeImages.deco1}
              alt="decorative 1"
              className="w-36"
            />
          </div>
        )}

        {decorativeImages?.deco2 && (
          <div className="absolute bottom-0 -left-16 pointer-events-none hidden lg:block">
            <img
              src={decorativeImages.deco2}
              alt="decorative 2"
              className="w-36"
            />
          </div>
        )}
      </div>
      <div />
    </Grid>
  );
};

export default TabPageLayout;
