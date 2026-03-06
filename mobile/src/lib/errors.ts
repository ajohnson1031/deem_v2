export type AppErrorCopy = {
  title: string;
  message: string;
};

function getCode(error: any): string | undefined {
  return error?.payload?.error ?? error?.payload?.code ?? error?.error ?? undefined;
}

export function getAppErrorCopy(error: any, fallbackTitle = "Something went wrong"): AppErrorCopy {
  const code = getCode(error);
  const message = error?.message;

  switch (code) {
    case "UNAUTHORIZED":
      return {
        title: "Session expired",
        message: "Please sign in again.",
      };

    case "NOT_FOUND":
      return {
        title: "Not found",
        message: "We couldn’t find the requested resource.",
      };

    case "QUOTE_NOT_FOUND":
      return {
        title: "Quote not found",
        message: "We couldn’t find that quote. Please generate a new one.",
      };

    case "QUOTE_EXPIRED":
      return {
        title: "Quote expired",
        message: "This quote expired. Please generate a new one.",
      };

    case "KYC_REQUIRED":
      return {
        title: "Verification required",
        message: "KYC verification is required before this conversion can continue.",
      };

    case "LIMIT_DAILY_EXCEEDED":
      return {
        title: "Daily limit reached",
        message: "This conversion would exceed your daily limit.",
      };

    case "LIMIT_WEEKLY_EXCEEDED":
      return {
        title: "Weekly limit reached",
        message: "This conversion would exceed your weekly limit.",
      };

    case "BANK_ACCOUNT_NOT_FOUND":
      return {
        title: "Bank account not found",
        message: "The selected bank account could not be found. Please link a bank again.",
      };

    case "RATE_LIMITED":
    case "TOO_MANY_REQUESTS":
      return {
        title: "Too many attempts",
        message: "Please wait a moment and try again.",
      };

    case "INVALID_GIFT_CARD":
      return {
        title: "Invalid gift card",
        message: "That gift card could not be verified. Check the details and try again.",
      };

    case "UNSUPPORTED_BRAND":
      return {
        title: "Unsupported brand",
        message: "That gift card brand is not supported yet.",
      };

    case "BALANCE_UNAVAILABLE":
      return {
        title: "Balance unavailable",
        message: "We couldn’t retrieve the card balance right now. Please try again.",
      };

    case "KYC_PENDING":
      return {
        title: "Verification pending",
        message: "Your verification is still pending. Please try again later.",
      };

    default:
      return {
        title: fallbackTitle,
        message: message ?? "Please try again.",
      };
  }
}
