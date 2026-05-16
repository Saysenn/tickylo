"use client";

import * as React from "react";
import { cn } from "@/lib/utils/cn";

interface CheckboxProps extends Omit<React.ComponentProps<"input">, "type"> {
  checked?: boolean;
  onCheckedChange?: (checked: boolean) => void;
}

function Checkbox({ className, checked, onCheckedChange, onChange, ...props }: CheckboxProps) {
  return (
    <input
      type="checkbox"
      checked={checked}
      onChange={(e) => {
        onCheckedChange?.(e.target.checked);
        onChange?.(e);
      }}
      className={cn(
        "h-4 w-4 shrink-0 rounded-sm border border-border bg-background accent-mint cursor-pointer disabled:cursor-not-allowed disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Checkbox };
