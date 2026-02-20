"use client"

import * as React from "react"
import { Select } from "radix-ui"
import { Check, ChevronDown } from "lucide-react"
import { cn } from "@/lib/utils"

const SelectRoot = Select.Root
const SelectValue = Select.Value
const SelectGroup = Select.Group

const SelectTrigger = React.forwardRef<
  React.ElementRef<typeof Select.Trigger>,
  React.ComponentPropsWithoutRef<typeof Select.Trigger>
>(({ className, children, ...props }, ref) => (
  <Select.Trigger
    ref={ref}
    className={cn(
      "flex h-9 w-full items-center justify-between rounded-xl border border-border/60 bg-background px-3 py-2 text-sm text-ink shadow-xs placeholder:text-ink-3 focus:outline-none focus:ring-1 focus:ring-mint/40 disabled:cursor-not-allowed disabled:opacity-50",
      className,
    )}
    {...props}
  >
    {children}
    <Select.Icon asChild>
      <ChevronDown className="h-4 w-4 text-ink-3 shrink-0" />
    </Select.Icon>
  </Select.Trigger>
))
SelectTrigger.displayName = Select.Trigger.displayName

const SelectContent = React.forwardRef<
  React.ElementRef<typeof Select.Content>,
  React.ComponentPropsWithoutRef<typeof Select.Content>
>(({ className, children, position = "popper", ...props }, ref) => (
  <Select.Portal>
    <Select.Content
      ref={ref}
      className={cn(
        "relative z-50 min-w-[8rem] overflow-hidden rounded-xl border bg-background shadow-md data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        position === "popper" && "w-[var(--radix-select-trigger-width)]",
        className,
      )}
      position={position}
      {...props}
    >
      <Select.Viewport className="p-1">{children}</Select.Viewport>
    </Select.Content>
  </Select.Portal>
))
SelectContent.displayName = Select.Content.displayName

const SelectItem = React.forwardRef<
  React.ElementRef<typeof Select.Item>,
  React.ComponentPropsWithoutRef<typeof Select.Item>
>(({ className, children, ...props }, ref) => (
  <Select.Item
    ref={ref}
    className={cn(
      "relative flex w-full cursor-pointer select-none items-center rounded-lg py-2 pl-8 pr-2 text-sm text-ink outline-none focus:bg-mint/10 focus:text-ink data-[disabled]:pointer-events-none data-[disabled]:opacity-50",
      className,
    )}
    {...props}
  >
    <span className="absolute left-2 flex h-3.5 w-3.5 items-center justify-center">
      <Select.ItemIndicator>
        <Check className="h-3.5 w-3.5 text-mint" />
      </Select.ItemIndicator>
    </span>
    <Select.ItemText>{children}</Select.ItemText>
  </Select.Item>
))
SelectItem.displayName = Select.Item.displayName

const SelectLabel = React.forwardRef<
  React.ElementRef<typeof Select.Label>,
  React.ComponentPropsWithoutRef<typeof Select.Label>
>(({ className, ...props }, ref) => (
  <Select.Label
    ref={ref}
    className={cn("py-1.5 pl-8 pr-2 text-xs font-semibold text-ink-3", className)}
    {...props}
  />
))
SelectLabel.displayName = Select.Label.displayName

export { SelectRoot, SelectValue, SelectGroup, SelectTrigger, SelectContent, SelectItem, SelectLabel }
