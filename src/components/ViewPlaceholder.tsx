"use client";

interface ViewPlaceholderProps {
  name: string;
  description: string;
}

export default function ViewPlaceholder({ name, description }: ViewPlaceholderProps) {
  return (
    <div className="flex flex-col items-center justify-center h-full w-full">
      <h2 className="text-lg font-mono text-cyan/60 tracking-widest uppercase">
        {name}
      </h2>
      <p className="text-xs font-mono text-foreground/30 mt-2">{description}</p>
    </div>
  );
}
