"use client";

import { useEffect } from "react";
import { useRouter } from "next/navigation";

export default function CreateVolunteerPage() {
  const router = useRouter();

  useEffect(() => {
    router.push("/volunteers");
  }, []);

  return null;
}
