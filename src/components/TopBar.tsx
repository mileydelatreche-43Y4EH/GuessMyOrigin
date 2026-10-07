"use client";

import LangSwitcher from "./LangSwitcher";

interface Props {
  dark?: boolean;
  rightSlot?: React.ReactNode;
}

export default function TopBar({ dark, rightSlot }: Props) {
  return (
    <div className={`app-topbar ${dark ? "dark" : ""}`}>
      <LangSwitcher />
      {rightSlot}
    </div>
  );
}
