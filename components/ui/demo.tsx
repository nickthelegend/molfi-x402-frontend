import { AnimatedAIChat } from "@/components/ui/animated-ai-chat"
import { AI_Prompt } from "@/components/ui/animated-ai-input"

export function Demo() {
  return (
    <div className="flex w-screen overflow-x-hidden">
      <AnimatedAIChat />
    </div>
  );
}

export function AI_Prompt_Demo() {
    return <AI_Prompt />
}
