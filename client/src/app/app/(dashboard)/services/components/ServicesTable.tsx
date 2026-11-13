"use client"

import * as React from "react"
import DashTable from "@/components/dashboard/DashTable"
import { serviceColumns } from "./columns"
import { useRouter, useSearchParams } from 'next/navigation'
import { useService } from '@/hooks/service';
import { TableSkeleton } from "@/components/dashboard/DashboardSkeletons"
import { getApiErrorMessage } from "@/services/apiClient"
import type { Service } from "@/types/service"
import { ServiceDrawer } from "./ServiceDrawer"

export default function ServicesTable() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const search = searchParams.get("search") || ""
  const status = searchParams.get("status") || ""
  const categoryId = searchParams.get("category_id") || ""
  const sort = searchParams.get("sort") || ""
  const pageFromUrl = parseInt(searchParams.get("page") || "1", 10) || 1
  const page = pageFromUrl || 1
  const pageSize = 20

  const { data, isLoading, isError, error } = useService({ page, pageSize, search, status, categoryId, sort })

  const services = (data?.data || []).filter((r): r is NonNullable<typeof r> => r !== null && r !== undefined)
  const total = data?.total || 0

  const [drawerOpen, setDrawerOpen] = React.useState(false)
  const [selected, setSelected] = React.useState<Service | null>(null)

  const handlePageChange = (newPage: number) => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("page", newPage.toString())
    router.push(`?${params.toString()}`, { scroll: false })
  }

  if (isError) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Không tải được danh sách dịch vụ: {getApiErrorMessage(error)}
      </div>
    )
  }

  if (isLoading && services.length === 0) {
    return <TableSkeleton />
  }

  return (
    <>
      <DashTable
        columns={serviceColumns}
        data={services}
        getRowId={(r) => r.id}
        onRowClick={(row) => {
          setSelected(row);
          setDrawerOpen(true);
        }}
        pagination={{ page, pageSize, total, itemLabel: "dịch vụ", onPageChange: handlePageChange }}
      />
      <ServiceDrawer
        open={drawerOpen}
        onOpenChange={setDrawerOpen}
        service={selected}
      />
    </>
  );
}
