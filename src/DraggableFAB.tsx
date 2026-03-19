import React, { useState, useRef, useEffect } from 'react';

interface DraggableFABProps {
    id: string; // Unique ID for localStorage
    children: React.ReactNode;
    onClick?: () => void;
    className?: string; // Initial styles (will be overridden by position)
    initialBottom?: number; // fallback bottom position in pixels
    initialRight?: number; // fallback right position in pixels
}

const DraggableFAB: React.FC<DraggableFABProps> = ({
    id,
    children,
    onClick,
    className = '',
    initialBottom = 100,
    initialRight = 24
}) => {
    const [position, setPosition] = useState({ x: 0, y: 0 });
    const [isDragging, setIsDragging] = useState(false);
    const [isLongPress, setIsLongPress] = useState(false);

    const timerRef = useRef<NodeJS.Timeout | null>(null);
    const startPosRef = useRef({ x: 0, y: 0 });

    // Load saved position on mount
    useEffect(() => {
        const saved = localStorage.getItem(`fab-pos-${id}`);
        if (saved) {
            setPosition(JSON.parse(saved));
        } else {
            // Calculate initial position based on window dimensions if needed, 
            // or just use CSS. But since we need absolute positioning for drag, 
            // we'll set initial state to mimic bottom-right.
            // However, typical "bottom: 24px, right: 24px" means:
            // x = window.innerWidth - width - 24
            // y = window.innerHeight - height - 24
            // We'll calculate this in a layout effect or easier: use fixed positioning offsets.
            // Simpler: Store "bottom" and "right" offsets or just X/Y coordinates relative to viewport.
            // Let's stick to simple X/Y from top-left. 

            const winW = window.innerWidth;
            const winH = window.innerHeight;
            setPosition({
                x: winW - initialRight - 60, // approx width 60
                y: winH - initialBottom - 60 // approx height 60
            });
        }
    }, [id, initialBottom, initialRight]);

    const handlePointerDown = (e: React.PointerEvent) => {
        // Only left click or touch
        if (e.button !== 0 && e.pointerType === 'mouse') return;

        // Prevent default to stop scrolling etc while intended to drag
        // e.preventDefault(); // Don't prevent default immediately, or click won't work? 
        // Actually for long press we want to prevent scrolling if drag starts.

        startPosRef.current = { x: e.clientX, y: e.clientY };

        // Start Timer
        timerRef.current = setTimeout(() => {
            setIsLongPress(true);
            setIsDragging(true);
            // Haptic feedback if available (mobile)
            if (navigator.vibrate) navigator.vibrate(50);
        }, 500); // 500ms long press
    };

    const handlePointerMove = (e: React.PointerEvent) => {
        if (!isDragging) {
            // If moved significantly before timer fires, cancel timer (it's a scroll or swipe)
            const dist = Math.hypot(e.clientX - startPosRef.current.x, e.clientY - startPosRef.current.y);
            if (dist > 10 && timerRef.current) {
                clearTimeout(timerRef.current);
                timerRef.current = null;
            }
            return;
        }

        e.preventDefault(); // Stop scrolling when dragging

        // Update position
        // We want the element to follow finger. 
        // New Pos = Old Pos + Delta
        // But better: absolute tracking.
        // Let's update state directly.
        const newX = e.clientX - 30; // Center under finger (assuming ~60px width)
        const newY = e.clientY - 30;

        setPosition({ x: newX, y: newY });
    };

    const handlePointerUp = () => {
        if (timerRef.current) {
            clearTimeout(timerRef.current);
            timerRef.current = null;
        }

        if (isDragging) {
            setIsDragging(false);
            setIsLongPress(false);
            // Save position
            localStorage.setItem(`fab-pos-${id}`, JSON.stringify(position));
        } else {
            // If not dragging and not long press, it's a click
            if (!isLongPress && onClick) {
                if ('vibrate' in navigator) navigator.vibrate([40, 20, 40]);
                onClick();
            }
        }
    };

    return (
        <div
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerCancel={handlePointerUp}
            onPointerLeave={handlePointerUp} // Safety
            className={`${className} ${isDragging ? 'scale-110 shadow-2xl z-[100]' : 'z-50'} fixed touch-none select-none transition-transform`}
            style={{
                left: position.x,
                top: position.y,
                // Override any existing fixed positioning classes that might conflict
                bottom: 'auto',
                right: 'auto',
                cursor: isDragging ? 'grabbing' : 'pointer'
            }}
        >
            {children}
        </div>
    );
};

export default DraggableFAB;
