// src/components/ui/sheet.jsx

import * as React from "react";
import * as Dialog from "@radix-ui/react-dialog";

export const Sheet = Dialog.Root;

export const SheetTrigger = Dialog.Trigger;

export const SheetContent = React.forwardRef(({ children, className = "", ...props }, ref) => (
  <Dialog.Portal>
    <Dialog.Overlay className="fixed inset-0 bg-black/40 z-40" />
    <Dialog.Content
      ref={ref}
      className={`fixed top-0 right-0 h-full w-72 bg-white z-50 shadow-lg transition-transform ${className}`}
      {...props}
    >
      {children}
    </Dialog.Content>
  </Dialog.Portal>
));
SheetContent.displayName = "SheetContent";

export const SheetHeader = ({ children }) => (
  <div className="p-4 border-b">{children}</div>
);

export const SheetTitle = ({ children }) => (
  <h2 className="text-lg font-semibold">{children}</h2>
);
