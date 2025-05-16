import React from "react";
import { cn } from "@/lib/utils";

interface GridProps {
  children: React.ReactNode;
  className?: string;
  padding?: string;
  columns?: string;
  bgColor?: string;
}

/**
 * A reusable grid component with customizable styling
 * 
 * @param children - Content to render inside the grid
 * @param className - Additional CSS classes
 * @param padding - Custom padding (defaults to "p-8")
 * @param columns - Custom grid columns (defaults to "grid-cols-4")
 * @param bgColor - Background color class
 */
const Grid: React.FC<GridProps> = ({
  children,
  className,
  padding = "p-4 md:p-8",
  columns = "grid-cols-1 md:grid-cols-4",
  bgColor,
}) => {
  return (
    <div
      className={cn(
        "grid",
        padding,
        columns,
        bgColor,
        className
      )}
    >
      {children}
    </div>
  );
};

/**
 * A grid content panel with the same background styling as in SetupProfile
 */
export const GridContentPanel: React.FC<{
  children: React.ReactNode;
  className?: string;
}> = ({ children, className }) => {
  return (
    <div
      className={cn(
        "bg-background/50 md:py-10 md:px-14 py-6 px-5 rounded-lg border backdrop-blur-md border-border shadow-sm relative z-10",
        className
      )}
    >
      {children}
    </div>
  );
};

export default Grid;
