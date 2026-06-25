import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function RootPage() {
  // Check if setup is complete (license activated + admin exists)
  try {
    const [settings, userCount] = await Promise.all([
      prisma.systemSettings.findFirst(),
      prisma.user.count(),
    ]);

    const isLicensed = !!(settings?.licenseKey && settings.licenseType === "ACTIVATED");
    const hasAdmin = userCount > 0;

    if (!isLicensed || !hasAdmin) {
      redirect("/setup");
    }
  } catch {
    // DB not ready yet — go to setup
    redirect("/setup");
  }

  // Setup complete — check auth
  const session = await auth();
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
