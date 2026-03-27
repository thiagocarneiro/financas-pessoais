"use client";

import { useState, useEffect } from "react";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { TopMerchants } from "@/components/dashboard/top-merchants";
import { Skeleton } from "@/components/ui/skeleton";

function getCurrentYearMonth() {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
}

export default function DashboardPage() {
  const [yearMonth, setYearMonth] = useState(getCurrentYearMonth());
  const [summary, setSummary] = useState<any>(null);
  const [categoryData, setCategoryData] = useState<any[]>([]);
  const [topMerchants, setTopMerchants] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [summaryRes, categoryRes, merchantsRes] = await Promise.all([
          fetch(`/api/dashboard/summary?month=${yearMonth}`),
          fetch(`/api/dashboard/by-category?month=${yearMonth}`),
          fetch(`/api/dashboard/top-merchants?month=${yearMonth}`),
        ]);

        if (summaryRes.ok) {
          setSummary(await summaryRes.json());
        }
        if (categoryRes.ok) {
          const catData = await categoryRes.json();
          setCategoryData(catData.breakdown || []);
        }
        if (merchantsRes.ok) {
          const merchantData = await merchantsRes.json();
          setTopMerchants(merchantData.topMerchants || []);
        }
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
      }
      setLoading(false);
    }

    fetchData();
  }, [yearMonth]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Dashboard</h1>
          <p className="text-muted-foreground">Visao geral das suas financas</p>
        </div>
        <MonthSelector yearMonth={yearMonth} onChange={setYearMonth} />
      </div>

      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[...Array(4)].map((_, i) => (
            <Skeleton key={i} className="h-28" />
          ))}
        </div>
      ) : (
        <SummaryCards
          income={summary?.income || 0}
          expenses={summary?.expenses || 0}
          savings={summary?.savings || 0}
          savingsRate={summary?.savingsRate || 0}
        />
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <Skeleton className="h-96" />
            <Skeleton className="h-96" />
          </>
        ) : (
          <>
            <CategoryChart data={categoryData} />
            <TopMerchants data={topMerchants} />
          </>
        )}
      </div>
    </div>
  );
}
