"use client";

import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight } from "lucide-react";

const MONTHS = [
  "Janeiro", "Fevereiro", "Marco", "Abril", "Maio", "Junho",
  "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro",
];

interface MonthSelectorProps {
  yearMonth: string; // "2026-03"
  onChange: (yearMonth: string) => void;
}

export function MonthSelector({ yearMonth, onChange }: MonthSelectorProps) {
  const [year, month] = yearMonth.split("-").map(Number);

  function navigate(delta: number) {
    let newMonth = month + delta;
    let newYear = year;
    if (newMonth > 12) {
      newMonth = 1;
      newYear++;
    } else if (newMonth < 1) {
      newMonth = 12;
      newYear--;
    }
    onChange(`${newYear}-${String(newMonth).padStart(2, "0")}`);
  }

  return (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
        <ChevronLeft className="h-4 w-4" />
      </Button>
      <span className="text-lg font-semibold min-w-[180px] text-center">
        {MONTHS[month - 1]} {year}
      </span>
      <Button variant="outline" size="icon" onClick={() => navigate(1)}>
        <ChevronRight className="h-4 w-4" />
      </Button>
    </div>
  );
}
