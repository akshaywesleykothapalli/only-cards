import { useState, useCallback, useRef } from 'react';
import { motion, useMotionValue, useTransform } from 'motion/react';
import './ShinyText.css';

interface ShinyTextProps {
  text: string;
  disabled?: boolean;
  speed?: number;
  className?: string;
  color?: string;
  shineColor?: string;
  spread?: number;
  yoyo?: boolean;
  pauseOnHover?: boolean;
  direction?: 'left' | 'right';
  delay?: number;
  shineOnHover?: boolean;
  hoverColor?: string;
  cursorShine?: boolean;
  defaultGradient?: string;
}

const ShinyText = ({
  text,
  disabled = false,
  speed = 2,
  className = '',
  color = '#b5b5b5',
  shineColor = '#ffffff',
  spread = 120,
  yoyo = false,
  pauseOnHover = false,
  direction = 'left',
  delay = 0,
  shineOnHover = false,
  hoverColor,
  cursorShine = false,
  defaultGradient
}: ShinyTextProps) => {
  const [isHovering, setIsHovering] = useState(false);
  const mouseX = useMotionValue(0);
  const ref = useRef<HTMLSpanElement>(null);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLSpanElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    mouseX.set(x);
  }, [mouseX]);

  const handleMouseEnter = useCallback(() => {
    setIsHovering(true);
  }, []);

  const handleMouseLeave = useCallback(() => {
    setIsHovering(false);
    mouseX.set(0); // Reset mouse position when leaving
  }, [mouseX]);

  // Calculate background position based on mouse position for shine effect
  const backgroundPosition = useTransform(mouseX, (x: number) => {
    if (!ref.current || !isHovering) return '150% center';
    const rect = ref.current.getBoundingClientRect();
    const percentX = (x / rect.width) * 100;
    const bgX = 150 - percentX * 2;
    return `${bgX}% center`;
  });

  // Use hover color if provided and hovering, otherwise use base color
  const currentColor = hoverColor && isHovering ? hoverColor : color;

  if (cursorShine) {
    // Cursor-following shine effect (for CARDS)
    const gradientStyle = {
      backgroundImage: isHovering 
        ? `linear-gradient(${spread}deg, ${color} 0%, ${color} 20%, ${shineColor} 50%, ${color} 80%, ${color} 100%)`
        : (defaultGradient || `linear-gradient(${spread}deg, ${color} 0%, ${color} 20%, ${shineColor} 50%, ${color} 80%, ${color} 100%)`),
      backgroundSize: '200% auto',
      WebkitBackgroundClip: 'text' as const,
      backgroundClip: 'text' as const,
      WebkitTextFillColor: 'transparent' as const
    };

    return (
      <motion.span
        ref={ref}
        className={`shiny-text ${className}`}
        style={{ ...gradientStyle, backgroundPosition }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
      </motion.span>
    );
  }

  // Simple color change on hover (for other text)
  if (hoverColor) {
    // Cursor-following color change effect
    const gradientStyle = {
      backgroundImage: isHovering
        ? `linear-gradient(${spread}deg, ${color} 0%, ${color} 20%, ${hoverColor} 50%, ${color} 80%, ${color} 100%)`
        : 'none',
      backgroundSize: '200% auto',
      WebkitBackgroundClip: isHovering ? ('text' as const) : ('unset' as const),
      backgroundClip: isHovering ? ('text' as const) : ('unset' as const),
      WebkitTextFillColor: isHovering ? ('transparent' as const) : ('unset' as const),
      color: isHovering ? 'transparent' : currentColor
    };

    return (
      <motion.span
        ref={ref}
        className={`shiny-text ${className}`}
        style={{ ...gradientStyle, backgroundPosition }}
        onMouseMove={handleMouseMove}
        onMouseEnter={handleMouseEnter}
        onMouseLeave={handleMouseLeave}
      >
        {text}
      </motion.span>
    );
  }

  // Default: no special effect
  return (
    <motion.span
      className={`shiny-text ${className}`}
      style={{ color: currentColor }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
      transition={{ duration: 0.2 }}
    >
      {text}
    </motion.span>
  );
};

export default ShinyText;
