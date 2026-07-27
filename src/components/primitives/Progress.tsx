import type { ComponentProps } from "react";
import { Progress as ProgressPrimitive } from "radix-ui";
import { motion, type Transition } from "motion/react";
import { getStrictContext } from "../../lib/getStrictContext";

// Von animate-ui.com uebernommen, siehe
// https://animate-ui.com/docs/components/radix/progress - der gefuellte
// Balken bewegt sich per Motion (Spring) zum jeweiligen Wert, statt sich
// abrupt zu setzen.
interface ProgressContextType {
  value: number;
}

const [ProgressProvider, useProgress] = getStrictContext<ProgressContextType>("ProgressContext");

type ProgressProps = ComponentProps<typeof ProgressPrimitive.Root>;

function Progress(props: ProgressProps) {
  return (
    <ProgressProvider value={{ value: props.value ?? 0 }}>
      <ProgressPrimitive.Root data-slot="progress" {...props} />
    </ProgressProvider>
  );
}

const MotionProgressIndicator = motion.create(ProgressPrimitive.Indicator);

type ProgressIndicatorProps = ComponentProps<typeof MotionProgressIndicator>;

function ProgressIndicator({ transition, ...props }: ProgressIndicatorProps & { transition?: Transition }) {
  const { value } = useProgress();
  return (
    <MotionProgressIndicator
      data-slot="progress-indicator"
      animate={{ x: `-${100 - (value || 0)}%` }}
      transition={transition ?? { type: "spring", stiffness: 100, damping: 30 }}
      {...props}
    />
  );
}

export { Progress, ProgressIndicator, useProgress };
