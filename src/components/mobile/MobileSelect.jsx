import React, { useState } from 'react';
import { useIsMobile } from '@/hooks/use-mobile';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Drawer,
  DrawerContent,
  DrawerHeader,
  DrawerTitle,
} from '@/components/ui/drawer';
import { Check } from 'lucide-react';

// ============================================================
// components/mobile/MobileSelect.jsx — ADAPTIVE SELECT
// ============================================================
// Desktop: renders standard Shadcn Select component
// Mobile:  renders a trigger button that opens a Drawer (bottom-sheet)
//          with a scrollable list of options
//
// Props (same as Shadcn Select):
//   value, onValueChange, placeholder, children (SelectItems),
//   triggerClassName, triggerWidth, title, disabled
// ============================================================
export default function MobileSelect({
  value,
  onValueChange,
  placeholder = 'Выберите...',
  children,
  triggerClassName = '',
  triggerWidth = '',
  title = '',
  disabled = false,
}) {
  const isMobile = useIsMobile();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Extract options from children (SelectItem components)
  const getOptions = () => {
    const opts = [];
    React.Children.forEach(children, (child) => {
      if (React.isValidElement(child) && child.props.value) {
        opts.push({
          value: child.props.value,
          label: child.props.children,
        });
      }
    });
    return opts;
  };

  const options = getOptions();
  const selectedOption = options.find(o => o.value === value);

  if (!isMobile) {
    // Desktop: standard Select
    return (
      <Select value={value} onValueChange={onValueChange} disabled={disabled}>
        <SelectTrigger className={triggerClassName || 'w-36 h-8 text-sm rounded-lg border-white/8 bg-white/5 text-white/70'}>
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {children}
        </SelectContent>
      </Select>
    );
  }

  // Mobile: Drawer bottom-sheet
  return (
    <>
      <button
        type="button"
        onClick={() => !disabled && setDrawerOpen(true)}
        disabled={disabled}
        className={`flex h-9 items-center justify-between whitespace-nowrap rounded-md border border-white/10 bg-white/5 px-3 py-2 text-sm ring-offset-background ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${triggerClassName || 'w-36 text-white/70'}`}
        style={triggerWidth ? { width: triggerWidth } : {}}
      >
        <span className={!selectedOption ? 'text-white/40' : 'text-white/80'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <svg width="15" height="15" viewBox="0 0 15 15" fill="none" className="h-4 w-4 opacity-50">
          <path d="M3.13523 6.15803C3.3241 5.95657 3.64052 5.94637 3.84197 6.13523L7.5 9.56464L11.158 6.13523C11.3595 5.94637 11.6759 5.95657 11.8648 6.15803C12.0536 6.35949 12.0434 6.67591 11.842 6.86477L7.84197 10.8648C7.64964 11.0451 7.35036 11.0451 7.15803 10.8648L3.15803 6.86477C2.95657 6.67591 2.94637 6.35949 3.13523 6.15803Z" fill="currentColor" fillRule="evenodd" clipRule="evenodd" />
        </svg>
      </button>

      <Drawer open={drawerOpen} onOpenChange={setDrawerOpen}>
        <DrawerContent className="bg-[#1a1f2b] border-white/10 text-white max-h-[60vh]">
          <DrawerHeader>
            <DrawerTitle className="text-white">{title || placeholder}</DrawerTitle>
          </DrawerHeader>
          <div className="px-4 pb-6 overflow-y-auto">
            {options.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  onValueChange(option.value);
                  setDrawerOpen(false);
                }}
                className={`w-full flex items-center justify-between px-3 py-3 rounded-lg text-sm transition-colors ${
                  option.value === value
                    ? 'bg-white/10 text-white font-medium'
                    : 'text-white/60 hover:bg-white/5 hover:text-white/80'
                }`}
              >
                <span>{option.label}</span>
                {option.value === value && <Check className="w-4 h-4 text-white" />}
              </button>
            ))}
          </div>
        </DrawerContent>
      </Drawer>
    </>
  );
}