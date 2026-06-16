import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';

// ============================================================
// components/mobile/MobilePopover.jsx — ADAPTIVE POPOVER
// ============================================================
// Desktop: renders standard Shadcn Popover component
// Mobile:  renders a Drawer (bottom-sheet) with the popover content
//
// Props:
//   trigger  → ReactNode rendered as the trigger (button)
//   children → content rendered inside the popover/drawer
//   title    → optional title for the drawer header (mobile only)
//   open, onOpenChange → controlled state
//   asChild  → passed to PopoverTrigger
// ============================================================
export default function MobilePopover({
  trigger,
  children,
  title = '',
  open: controlledOpen,
  onOpenChange: controlledOnOpenChange,
}) {
  const isMobile = useIsMobile();
  const [internalOpen, setInternalOpen] = React.useState(false);

  const isControlled = controlledOpen !== undefined;
  const open = isControlled ? controlledOpen : internalOpen;
  const setOpen = isControlled ? controlledOnOpenChange : setInternalOpen;

  if (!isMobile) {
    // Desktop: standard Popover
    return (
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          {trigger}
        </PopoverTrigger>
        <PopoverContent className="w-auto p-0">
          {children}
        </PopoverContent>
      </Popover>
    );
  }

  // Mobile: Drawer bottom-sheet
  return (
    <>
      <div onClick={() => setOpen(true)} className="cursor-pointer">
        {trigger}
      </div>

      <Drawer open={open} onOpenChange={setOpen}>
        <DrawerContent className="bg-[#1a1f2b] border-white/10 text-white">
          {title && (
            <DrawerHeader>
              <DrawerTitle className="text-white">{title}</DrawerTitle>
            </DrawerHeader>
          )}
          <div className="px-4 pb-6 flex justify-center">
            {children}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}