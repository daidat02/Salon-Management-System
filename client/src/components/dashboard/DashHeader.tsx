'use client';

import * as React from 'react';
import { AlertTriangle, Bell, CircleQuestionMark, Plus, Sparkles } from 'lucide-react';
import Logo, { LogoMark } from '@/components/brand/Logo';
import { Button } from '@/components/ui/button';
import { DashDialog } from '@/components/dashboard/DashDialog';
import { toast } from '@/components/ui/toast';
import { useDisableDemoData, useGeneralSettings } from '@/hooks/settings';
import { getApiErrorMessage } from '@/services/apiClient';
import useAuth from '@/hooks/use-auth';

type DashHeaderProps = {
  branchName?: string;
  avatarUrl?: string;
  hasNotification?: boolean;
  onCreateOrder?: () => void;
  onNotificationClick?: () => void;
  onHelpClick?: () => void;
  onProfileClick?: () => void;
};

/**
 * Header dashboard — dựng lại từ preview/admin_preview/index.html (dòng 102–153).
 * Nút chính dùng shadcn Button (variant default → --primary = brand #4F7CAC).
 */
export default function DashHeader({
  branchName = 'Hệ Thống Điều Hành Salon',
  avatarUrl,
  hasNotification = true,
  onCreateOrder,
  onNotificationClick,
  onHelpClick,
  onProfileClick,
}: DashHeaderProps) {
  const { displayName, role, roleLabel } = useAuth();
  const { data: generalSettings } = useGeneralSettings();
  const disableDemo = useDisableDemoData();
  const [demoDialogOpen, setDemoDialogOpen] = React.useState(false);
  const userName = displayName || 'Người dùng';
  const avatarInitial = userName.trim().charAt(0).toUpperCase();
  const isDemo = generalSettings?.organization.is_demo === true;
  const isOwner = role === 'owner';

  function handleDisableDemo() {
    disableDemo.mutate(undefined, {
      onSuccess: () => {
        toast.add({
          title: 'Đã xóa dữ liệu mẫu',
          description: 'Salon đã sẵn sàng sử dụng dữ liệu thật.',
          type: 'success',
        });
        setDemoDialogOpen(false);
        window.setTimeout(() => window.location.reload(), 500);
      },
      onError: (error) => {
        toast.add({
          title: 'Không thể xóa dữ liệu mẫu',
          description: getApiErrorMessage(error),
          type: 'error',
        });
      },
    });
  }

  return (
    <>
      <header className="z-30 flex h-16 shrink-0 items-center justify-between border-b border-border bg-surface px-6 select-none">
        {/* Brand Title */}
        <div className="flex min-w-0 items-center gap-6">
          <Logo subtitle={'Service Operations'} />

          {isDemo && (
            <div className="hidden items-center gap-2 rounded-full border border-amber-200 bg-amber-50 py-1 pr-1 pl-3 text-amber-800 lg:flex">
              <Sparkles className="h-3.5 w-3.5 shrink-0" />
              <span className="text-[11px] font-semibold whitespace-nowrap">
                Đang dùng dữ liệu mẫu
              </span>
              {isOwner && (
                <Button
                  size="xs"
                  variant="outline"
                  onClick={() => setDemoDialogOpen(true)}
                  className="border-amber-300 bg-white text-[11px] font-semibold text-amber-900 hover:bg-amber-100"
                >
                  Bắt đầu dùng thật
                </Button>
              )}
            </div>
          )}
        </div>

        {/* Actions & User Profile */}
        <div className="flex shrink-0 items-center gap-4">
          {/* Nút chính — shadcn Button, màu brand qua --primary */}
          <Button
            size="sm"
            onClick={onCreateOrder}
            className="hidden text-xs font-semibold shadow-sm sm:inline-flex"
          >
            <Plus />
            <span>Tạo đơn</span>
          </Button>

          {/* Notification Bell */}
          <div className="relative">
            <Button
              variant="ghost"
              size="icon"
              onClick={onNotificationClick}
              aria-label="Thông báo"
              className="relative size-9 rounded-lg text-slate-500 hover:text-slate-800"
            >
              <Bell className="h-4 w-4" />
              {hasNotification && (
                <span className="absolute top-1.5 right-1.5 h-2 w-2 rounded-full bg-red-500 ring-2 ring-white" />
              )}
            </Button>
          </div>

          {/* Help */}
          <Button
            variant="ghost"
            size="icon"
            onClick={onHelpClick}
            aria-label="Trợ giúp"
            className="size-9 rounded-lg text-slate-500 hover:text-slate-800"
          >
            <CircleQuestionMark className="h-4 w-4" />
          </Button>

          {/* User Avatar */}
          <div
            onClick={onProfileClick}
            className="group flex cursor-pointer items-center gap-3 border-l border-border pl-2"
          >
            <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-full border border-border bg-brand text-sm font-semibold text-white ring-2 ring-transparent transition-all group-hover:ring-brand/30">
              {avatarUrl ? (
                <img alt={userName} src={avatarUrl} className="h-full w-full object-cover" />
              ) : (
                avatarInitial
              )}
            </div>
            <div className="hidden text-left lg:block">
              <div className="text-xs leading-tight font-semibold text-slate-800">{userName}</div>
              <div className="text-[11px] leading-tight text-slate-400">{roleLabel}</div>
            </div>
          </div>
        </div>
      </header>

      <DashDialog
        open={demoDialogOpen}
        onOpenChange={setDemoDialogOpen}
        title="Xóa dữ liệu mẫu?"
        description="Thao tác này không thể hoàn tác."
        maxWidth="max-w-[520px]"
        footer={
          <>
            <Button
              variant="outline"
              onClick={() => setDemoDialogOpen(false)}
              disabled={disableDemo.isPending}
              className="border-outline text-slate-600 hover:bg-surface-container px-4 py-2 text-xs font-semibold"
            >
              Hủy
            </Button>
            <Button
              variant="destructive"
              onClick={handleDisableDemo}
              disabled={disableDemo.isPending}
              className="px-5 py-2 text-xs font-semibold"
            >
              {disableDemo.isPending ? 'Đang xóa...' : 'Xóa dữ liệu mẫu & bắt đầu'}
            </Button>
          </>
        }
      >
        <div className="flex gap-3 rounded-lg border border-red-200 bg-red-50 p-3 text-red-800">
          <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0" />
          <div className="space-y-1 text-[11px] leading-relaxed">
            <p className="font-semibold">Toàn bộ dữ liệu nghiệp vụ sẽ bị xóa vĩnh viễn:</p>
            <p>Danh mục, sản phẩm, dịch vụ, khách hàng, nhân viên và dữ liệu giao dịch.</p>
          </div>
        </div>
        <p className="text-xs leading-relaxed text-slate-600">
          Cấu hình salon, tài khoản người dùng và số dư đầu kỳ của quỹ sẽ được giữ lại. Sau khi xác
          nhận, salon sẽ bắt đầu với dữ liệu trống.
        </p>
      </DashDialog>
    </>
  );
}
