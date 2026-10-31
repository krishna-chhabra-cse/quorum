import { redirect } from "next/navigation";

// The app starts at the join page so people always pick who they are first.
export default function Home() {
  redirect("/join");
}
