import { redirect } from "next/navigation";

export default function PracticeTestsRedirectPage() {
    redirect("/tests?mode=adaptive");
}
