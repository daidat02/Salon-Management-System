import type { Metadata } from "next";
import StaffHeading from "./components/StaffHeading";
import StaffToolbar from "./components/StaffToolbar";
import StaffTable from "./components/StaffTable";

export const metadata: Metadata = { title: "Nhân viên | SALON ADMIN" };

export default function StaffPage() {
  return (
    <div className="space-y-4">
      <StaffHeading />

      <StaffToolbar />
      <StaffTable />
    </div>
  );
}
