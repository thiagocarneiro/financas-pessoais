"use client";

import { useState, useEffect } from "react";
import { MonthSelector } from "@/components/dashboard/month-selector";
import { SummaryCards } from "@/components/dashboard/summary-cards";
import { CategoryChart } from "@/components/dashboard/category-chart";
import { TopMerchants } from "@/components/dashboard/top-merchants";
import { SpendingTrends } from "@/components/dashboard/spending-trends";
import { CreditCardSummary } from "@/components/dashboard/credit-card-summary";
import { RecentTransactions } from "@/components/dashboard/recent-transactions";
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
  const [trends, setTrends] = useState<any[]>([]);
  const [cardSummary, setCardSummary] = useState<any[]>([]);
  const [recentTxns, setRecentTxns] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchData() {
      setLoading(true);
      try {
        const [summaryRes, categoryRes, merchantsRes, trendsRes, txnRes] =
          await Promise.all([
            fetch(`/api/dashboard/summary?month=${yearMonth}`),
            fetch(`/api/dashboard/by-category?month=${yearMonth}`),
            fetch(`/api/dashboard/top-merchants?month=${yearMonth}`),
            fetch(`/api/dashboard/trends?months=6`),
            fetch(`/api/transactions?month=${yearMonth}&limit=10`),
          ]);

        if (summaryRes.ok) setSummary(await summaryRes.json());
        if (categoryRes.ok) {
          const d = await categoryRes.json();
          setCategoryData(d.breakdown || []);
        }
        if (merchantsRes.ok) {
          const d = await merchantsRes.json();
          setTopMerchants(d.topMerchants || []);
        }
        if (trendsRes.ok) {
          const d = await trendsRes.json();
          setTrends(d.trends || []);
        }
        if (txnRes.ok) {
          const d = await txnRes.json();
          setRecentTxns(d.transactions || []);

          // Derive card summary from transactions
          const cardMap = new Map<string, { source: string; cardLastDigits: string; total: number; count: number }>();
          for (const t of d.transactions) {
            if (t.cardLastDigits && t.type === "debit") {
              const key = `${t.source}-${t.cardLastDigits}`;
              const existing = cardMap.get(key);
              if (existing) {
                existing.total += t.amount;
                existing.count++;
              } else {
                cardMap.set(key, {
                  source: t.source,
                  cardLastDigits: t.cardLastDigits,
                  total: t.amount,
                  count: 1,
                });
              }
            }
          }
          setCardSummary(Array.from(cardMap.values()));
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

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {loading ? (
          <>
            <Skeleton className="h-80" />
            <Skeleton className="h-80" />
          </>
        ) : (
          <>
            <SpendingTrends data={trends} />
            <CreditCardSummary data={cardSummary} />
          </>
        )}
      </div>

      {!loading && <RecentTransactions data={recentTxns} />}
    </div>
  );
}
