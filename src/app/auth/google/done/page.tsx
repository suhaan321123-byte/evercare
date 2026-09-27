import { buildPageMetadata } from "@/app/seo";
import { GoogleAuthDoneClient } from "./GoogleAuthDoneClient";

export const metadata = buildPageMetadata({
  title: "Google Login",
  description: "Complete Google login for your EvercareMed account.",
  path: "/auth/google/done",
  noIndex: true,
});

export default function GoogleAuthDonePage() {
  return <GoogleAuthDoneClient />;
}
