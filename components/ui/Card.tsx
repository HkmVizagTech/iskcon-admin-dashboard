import { Children, isValidElement } from "react";
import { cn } from "@/lib/utils";

interface CardProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean;
}

export function Card({ children, className, padding = true }: CardProps) {
  // A card built from CardHeader/CardBody already pads its sections. Padding
  // the outer card too insets the header strip — wasteful on a phone — so on
  // phones such cards drop their own padding. Desktop keeps its existing look.
  const sectioned = Children.toArray(children).some(
    (c) => isValidElement(c) && (c.type === CardHeader || c.type === CardBody || c.type === CardFooter),
  );
  return (
    <div
      className={cn(
        "bg-white rounded-xl shadow-sm border border-gray-100",
        padding && (sectioned ? "p-0 sm:p-6" : "p-4 sm:p-6"),
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  children: React.ReactNode;
  className?: string;
}

export function CardHeader({ children, className }: CardHeaderProps) {
  return (
    <div
      className={cn(
        "px-4 py-3 sm:px-6 sm:py-4 bg-gradient-to-r from-orange-50 to-red-50 border-b border-orange-100 rounded-t-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}

interface CardBodyProps {
  children: React.ReactNode;
  className?: string;
  padding?: boolean; // Add this
}

export function CardBody({
  children,
  className,
  padding = true,
}: CardBodyProps) {
  return (
    <div className={cn(padding ? "p-4 sm:p-6" : "p-0", className)}>{children}</div>
  );
}

interface CardFooterProps {
  children: React.ReactNode;
  className?: string;
}

export function CardFooter({ children, className }: CardFooterProps) {
  return (
    <div
      className={cn(
        "px-4 py-3 sm:px-6 sm:py-4 border-t border-gray-100 bg-gray-50 rounded-b-xl",
        className,
      )}
    >
      {children}
    </div>
  );
}
