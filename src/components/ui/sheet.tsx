'use client';

import type { ComponentProps, FC } from 'react';
import { Dialog as SheetPrimitive } from '@base-ui/react/dialog';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { XIcon } from 'lucide-react';

type SheetProps = SheetPrimitive.Root.Props
type SheetTriggerProps = SheetPrimitive.Trigger.Props
type SheetPortalProps = SheetPrimitive.Portal.Props
type SheetOverlayProps = SheetPrimitive.Backdrop.Props
type SheetHeaderProps = ComponentProps<'div'>
type SheetTitleProps = SheetPrimitive.Title.Props

interface SheetContentProps extends SheetPrimitive.Popup.Props {
    side?: 'top' | 'right' | 'bottom' | 'left';
    showCloseButton?: boolean;
}

const Sheet: FC<SheetProps> = ({ ...props }) => {
    return <SheetPrimitive.Root data-slot="sheet" {...props} />;
};

const SheetTrigger: FC<SheetTriggerProps> = ({ ...props }) => {
    return <SheetPrimitive.Trigger data-slot="sheet-trigger" {...props} />;
};

const SheetPortal: FC<SheetPortalProps> = ({ ...props }) => {
    return <SheetPrimitive.Portal data-slot="sheet-portal" {...props} />;
};

const SheetOverlay: FC<SheetOverlayProps> = ({ className, ...props }) => {
    return (
        <SheetPrimitive.Backdrop
            data-slot="sheet-overlay"
            className={cn(
                'fixed inset-0 z-50 bg-black/10 transition-opacity duration-150 data-ending-style:opacity-0 data-starting-style:opacity-0 supports-backdrop-filter:backdrop-blur-xs',
                className
            )}
            {...props}
        />
    );
};

const SheetContent: FC<SheetContentProps> = ({
    className,
    children,
    side = 'right',
    showCloseButton = true,
    ...props
}: SheetContentProps) => {
    return (
        <SheetPortal>
            <SheetOverlay />
            <SheetPrimitive.Popup
                data-slot="sheet-content"
                data-side={side}
                className={cn(
                    'fixed z-50 flex flex-col gap-4 bg-popover bg-clip-padding text-sm text-popover-foreground shadow-lg transition duration-200 ease-in-out data-ending-style:opacity-0 data-starting-style:opacity-0 data-[side=bottom]:inset-x-0 data-[side=bottom]:bottom-0 data-[side=bottom]:h-auto data-[side=bottom]:border-t data-[side=bottom]:data-ending-style:translate-y-[2.5rem] data-[side=bottom]:data-starting-style:translate-y-[2.5rem] data-[side=left]:inset-y-0 data-[side=left]:left-0 data-[side=left]:h-full data-[side=left]:w-3/4 data-[side=left]:border-r data-[side=left]:data-ending-style:translate-x-[-2.5rem] data-[side=left]:data-starting-style:translate-x-[-2.5rem] data-[side=right]:inset-y-0 data-[side=right]:right-0 data-[side=right]:h-full data-[side=right]:w-3/4 data-[side=right]:border-l data-[side=right]:data-ending-style:translate-x-[2.5rem] data-[side=right]:data-starting-style:translate-x-[2.5rem] data-[side=top]:inset-x-0 data-[side=top]:top-0 data-[side=top]:h-auto data-[side=top]:border-b data-[side=top]:data-ending-style:translate-y-[-2.5rem] data-[side=top]:data-starting-style:translate-y-[-2.5rem] data-[side=left]:sm:max-w-sm data-[side=right]:sm:max-w-sm',
                    className
                )}
                {...props}
            >
                {children}
                {showCloseButton && (
                    <SheetPrimitive.Close
                        data-slot="sheet-close"
                        render={<Button variant="ghost" className="absolute top-3 right-3" size="icon-sm" />}
                    >
                        <XIcon />
                        <span className="sr-only">Close</span>
                    </SheetPrimitive.Close>
                )}
            </SheetPrimitive.Popup>
        </SheetPortal>
    );
};

const SheetHeader: FC<SheetHeaderProps> = ({ className, ...props }) => {
    return <div data-slot="sheet-header" className={cn('flex flex-col gap-0.5 p-4', className)} {...props} />;
};

const SheetTitle: FC<SheetTitleProps> = ({ className, ...props }) => {
    return (
        <SheetPrimitive.Title
            data-slot="sheet-title"
            className={cn('font-heading text-base font-medium text-foreground', className)}
            {...props}
        />
    );
};

export { Sheet, SheetTrigger, SheetContent, SheetHeader, SheetTitle };
