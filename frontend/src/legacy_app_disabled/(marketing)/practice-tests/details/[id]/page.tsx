import { redirect } from "next/navigation";

export default function PracticeTestDetailRedirectPage() {
    redirect("/tests?mode=adaptive");
}
