import { redirect } from "next/navigation";

export default function PracticeTestAttemptRedirectPage() {
    redirect("/tests?mode=adaptive");
}
