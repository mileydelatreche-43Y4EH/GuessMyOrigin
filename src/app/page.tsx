import GameApp from "@/components/GameApp";
import { LangProvider } from "@/components/LangContext";

export default function Home() {
  return (
    <LangProvider>
      <GameApp />
    </LangProvider>
  );
}
