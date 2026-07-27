import { useState, type ComponentProps } from "react";
import { Switch as SwitchPrimitives } from "radix-ui";
import { motion, type HTMLMotionProps, type Transition, type TargetAndTransition } from "motion/react";
import { getStrictContext } from "../../lib/getStrictContext";
import { useControlledState } from "../../hooks/useControlledState";

// Von animate-ui.com uebernommen, siehe
// https://animate-ui.com/docs/components/radix/switch - fuer den
// Darkmode-Umschalter im Header (AppShell.tsx).
interface SwitchContextType {
  isChecked: boolean;
  isPressed: boolean;
}

const [SwitchProvider, useSwitch] = getStrictContext<SwitchContextType>("SwitchContext");

type SwitchProps = Omit<ComponentProps<typeof SwitchPrimitives.Root>, "asChild"> & HTMLMotionProps<"button">;

function Switch(props: SwitchProps) {
  const [isPressed, setIsPressed] = useState(false);
  const [isChecked, setIsChecked] = useControlledState({
    value: props.checked,
    defaultValue: props.defaultChecked,
    onChange: props.onCheckedChange,
  });

  return (
    <SwitchProvider value={{ isChecked, isPressed }}>
      <SwitchPrimitives.Root {...props} checked={isChecked} onCheckedChange={setIsChecked} asChild>
        <motion.button
          data-slot="switch"
          whileTap="tap"
          initial={false}
          onTapStart={() => setIsPressed(true)}
          onTapCancel={() => setIsPressed(false)}
          onTap={() => setIsPressed(false)}
          {...props}
        />
      </SwitchPrimitives.Root>
    </SwitchProvider>
  );
}

type SwitchThumbProps = Omit<ComponentProps<typeof SwitchPrimitives.Thumb>, "asChild"> &
  HTMLMotionProps<"div"> & { pressedAnimation?: TargetAndTransition; transition?: Transition };

function SwitchThumb({ pressedAnimation, transition, ...props }: SwitchThumbProps) {
  const { isPressed } = useSwitch();

  return (
    <SwitchPrimitives.Thumb asChild>
      <motion.div
        data-slot="switch-thumb"
        layout
        transition={transition ?? { type: "spring", stiffness: 300, damping: 25 }}
        animate={isPressed ? pressedAnimation : undefined}
        {...props}
      />
    </SwitchPrimitives.Thumb>
  );
}

type SwitchIconPosition = "left" | "right" | "thumb";

type SwitchIconProps = HTMLMotionProps<"div"> & { position: SwitchIconPosition; transition?: Transition };

function SwitchIcon({ position, transition, ...props }: SwitchIconProps) {
  const { isChecked } = useSwitch();
  const isAnimated = position === "right" ? !isChecked : position === "left" ? isChecked : true;

  return (
    <motion.div
      data-slot={`switch-${position}-icon`}
      animate={isAnimated ? { scale: 1, opacity: 1 } : { scale: 0, opacity: 0 }}
      transition={transition ?? { type: "spring", bounce: 0 }}
      {...props}
    />
  );
}

export { Switch, SwitchThumb, SwitchIcon, useSwitch };
