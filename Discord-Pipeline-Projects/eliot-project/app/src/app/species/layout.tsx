"use client";

import { useRouter } from "next/navigation";
import { useCallback } from "react";
import { MainLayout } from "@/components/layout/main-layout";
import { AppSidebar } from "@/components/navigation/app-sidebar";

export default function SpeciesLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();

  const handleSelectSpecies = useCallback(
    (species: { id: string; scientificName: string }) => {
      router.push(`/species/${species.id}`);
    },
    [router]
  );

  return (
    <MainLayout sidebar={<AppSidebar onSelectSpecies={handleSelectSpecies} />}>
      {children}
    </MainLayout>
  );
}
