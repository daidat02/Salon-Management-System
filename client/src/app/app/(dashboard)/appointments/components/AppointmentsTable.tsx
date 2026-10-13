"use client"

import * as React from "react"
import DashTable from "@/components/dashboard/DashTable"
import { TableSkeleton } from "@/components/dashboard/DashboardSkeletons"
import { getApiErrorMessage } from "@/services/apiClient"
import useAppointments from "@/hooks/use-appointments"
import useCustomer from "@/hooks/use-customer"
import useStaff from "@/hooks/use-staff"
import { buildAppointmentColumns, type CustomerLookup, type StaffLookup } from "./columns"

const PAGE_SIZE = 10

export default function AppointmentsTable() {
  const [page, setPage] = React.useState(1)
  const { data, isLoading, isError, error } = useAppointments({ page, pageSize: PAGE_SIZE })

  // Lookup tên/SĐT khách + tên nhân viên (API lịch chỉ trả id).
  const { data: customerData } = useCustomer({ page: 1, pageSize: 100 })
  const { data: staffData } = useStaff({ page: 1, pageSize: 100 })
  const customerMap = React.useMemo(() => {
    const map = new Map<string, { name: string; phone: string }>()
    for (const c of customerData?.data ?? []) {
      if (c) map.set(c.id, { name: c.full_name, phone: c.phone })
    }
    return map
  }, [customerData])
  const staffMap = React.useMemo(() => {
    const map = new Map<string, string>()
    for (const s of staffData?.data ?? []) {
      if (s) map.set(s.id, s.full_name)
    }
    return map
  }, [staffData])
  const findCustomer: CustomerLookup = React.useCallback(
    (id) => (id ? customerMap.get(id) : undefined),
    [customerMap],
  )
  const findStaff: StaffLookup = React.useCallback(
    (id) => (id ? staffMap.get(id) : undefined),
    [staffMap],
  )
  const columns = React.useMemo(
    () => buildAppointmentColumns(findCustomer, findStaff),
    [findCustomer, findStaff],
  )

  const rows = (data?.data || []).filter(
    (r): r is NonNullable<typeof r> => r !== null && r !== undefined,
  )

  if (isError) {
    return (
      <div className="rounded-md border border-amber-200 bg-amber-50 p-4 text-sm text-amber-800">
        Không tải được danh sách lịch hẹn: {getApiErrorMessage(error)} — thử đăng nhập lại hoặc
        kiểm tra kết nối API.
      </div>
    )
  }

  if (isLoading && rows.length === 0) {
    return <TableSkeleton />
  }

  return (
    <DashTable
      columns={columns}
      data={rows}
      getRowId={(row) => row.id}
      emptyText="Chưa có lịch hẹn nào"
      pagination={{
        page,
        pageSize: PAGE_SIZE,
        total: data?.total || 0,
        itemLabel: "lịch hẹn",
        onPageChange: setPage,
      }}
    />
  )
}
