import type { Metadata } from "next";
import { Workspace } from "./workspace";

export const metadata: Metadata = {
  title: "Workspace | Quorum",
  description: "Build the Slate launch page together, with decisions tracked in one place.",
};

export default function WorkspacePage() {
  return <Workspace />;
}
