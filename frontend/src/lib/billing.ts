import { toast } from "sonner";

import { createCheckoutSession as createPaymentSession } from "@/lib/payments";

/**
 * Creates a hosted checkout session and redirects the user.
 */
export async function createCheckoutSession() {
    const toastId = toast.loading("Preparing checkout...");
    try {
        const { checkout_url } = await createPaymentSession();

        if (checkout_url) {
            window.location.href = checkout_url;
        } else {
            throw new Error("No checkout URL received from server");
        }
    } catch (error) {
        const message =
            error instanceof Error
                ? error.message
                : "Could not initialize payment. Please try again.";
        toast.error(message, { id: toastId });
    }
}
