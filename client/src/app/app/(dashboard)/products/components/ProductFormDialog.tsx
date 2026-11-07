'use client';

import * as React from 'react';
import { DashDialog, DashDialogFooter } from '@/components/dashboard/DashDialog';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { DashInput } from '@/components/dashboard/DashInput';
import { DashSelect } from '@/components/dashboard/DashSelect';
import { useCreateProduct } from '@/hooks/use-create-product';
import { useUpdateProduct } from '@/hooks/use-update-product';
import useCategory from '@/hooks/use-category';
import { getApiErrorMessage } from '@/services/apiClient';
import { toast } from '@/components/ui/toast';
import type { Product } from '@/types/product';

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Truyền vào để chuyển sang chế độ cập nhật; bỏ trống để tạo mới. */
  product?: Product | null;
  onSuccess?: () => void;
};

export function ProductFormDialog({ open, onOpenChange, product, onSuccess }: Props) {
  const formId = React.useId();
  const isEdit = !!product?.id;
  const [productType, setProductType] = React.useState<Product['product_type']>('retail');
  const [categoryId, setCategoryId] = React.useState('');
  const [netUnit, setNetUnit] = React.useState('');
  const [isActive, setIsActive] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);
  const [syncedKey, setSyncedKey] = React.useState<string | null>(null);

  const createMutation = useCreateProduct();
  const updateMutation = useUpdateProduct();
  const isPending = createMutation.isPending || updateMutation.isPending;

  const { data: categoryData, isLoading: isCategoriesLoading } = useCategory({
    page: 1,
    pageSize: 100,
  });
  const productCategories = (categoryData?.data ?? []).filter(
    (c) => c.type === 'product' && c.is_active,
  );

  const formKey = open ? (product?.id ?? 'new') : null;
  if (open && formKey !== syncedKey) {
    setSyncedKey(formKey);
    setProductType(product?.product_type ?? 'retail');
    setCategoryId(product?.category_id ?? '');
    setNetUnit(product?.net_unit ?? '');
    setIsActive(product?.is_active ?? true);
    setError(null);
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    const form = e.target as HTMLFormElement;
    const data = Object.fromEntries(new FormData(form).entries()) as Record<string, string>;

    const payload = {
      sku: data.sku?.trim(),
      name: data.name?.trim(),
      unit: data.unit?.trim(),
      net_unit: netUnit || '',
      net_amount: data.net_amount ? parseFloat(data.net_amount) : 0,
      product_type: productType,
      category_id: categoryId || null,
      show_on_web: product?.show_on_web ?? true,
      // Giá nhập & tồn kho chỉ đổi qua phiếu kho, không sửa ở dialog.
      cost_price: isEdit ? (product?.cost_price ?? 0) : data.cost_price ? parseFloat(data.cost_price) : 0,
      sell_price: data.sell_price ? parseFloat(data.sell_price) : 0,
      stock_quantity: isEdit
        ? (product?.stock_quantity ?? 0)
        : data.stock_quantity
          ? parseFloat(data.stock_quantity)
          : 0,
      min_stock: data.min_stock ? parseFloat(data.min_stock) : 0,
      is_active: isActive,
    };

    if (!payload.sku || !payload.name) {
      setError('Vui lòng nhập SKU và tên sản phẩm');
      return;
    }

    const onSuccessHandler = () => {
      toast.add({
        title: isEdit ? 'Cập nhật sản phẩm thành công' : 'Tạo sản phẩm thành công',
        description: isEdit
          ? `Đã cập nhật ${payload.name} (${payload.sku})`
          : `Đã thêm ${payload.name} (${payload.sku})`,
        type: 'success',
      });
      onSuccess?.();
      onOpenChange(false);
    };
    const onErrorHandler = (err: unknown) => {
      const msg = getApiErrorMessage(err);
      setError(msg);
      toast.add({
        title: isEdit ? 'Cập nhật sản phẩm thất bại' : 'Tạo sản phẩm thất bại',
        description: msg,
        type: 'error',
      });
    };

    if (isEdit) {
      updateMutation.mutate(
        { id: product!.id, payload },
        { onSuccess: onSuccessHandler, onError: onErrorHandler },
      );
    } else {
      createMutation.mutate(payload, { onSuccess: onSuccessHandler, onError: onErrorHandler });
    }
  };

  return (
    <DashDialog
      open={open}
      onOpenChange={onOpenChange}
      title={isEdit ? 'Cập nhật sản phẩm' : 'Thêm mới sản phẩm'}
      description={
        isEdit
          ? 'Chỉnh sửa thông tin sản phẩm, giá và tồn kho'
          : 'Nhập thông tin sản phẩm để quản lý tồn kho và bán lẻ'
      }
      footer={
        <DashDialogFooter
          onCancel={() => onOpenChange(false)}
          onConfirm={() => (document.getElementById(formId) as HTMLFormElement)?.requestSubmit()}
          cancelText="Hủy"
          confirmText={isEdit ? 'Lưu thay đổi' : 'Lưu sản phẩm'}
          isLoading={isPending}
          confirmDisabled={isPending}
        />
      }
    >
      <form
        key={formKey ?? 'closed'}
        id={formId}
        onSubmit={handleSubmit}
        className="space-y-4 text-xs"
      >
        {error && (
          <div className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-xs font-medium text-red-700">
            {error}
          </div>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Mã SKU
            </Label>
            <DashInput name="sku" placeholder="VD: SKU-TN-1001" defaultValue={product?.sku ?? ''} />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Tên sản phẩm <span className="text-error">*</span>
            </Label>
            <DashInput
              name="name"
              placeholder="VD: Dầu gội Keratin 500ml"
              defaultValue={product?.name ?? ''}
              required
            />
          </div>

          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Danh mục
            </Label>
            <DashSelect
              value={categoryId || null}
              onValueChange={setCategoryId}
              placeholder={isCategoriesLoading ? 'Đang tải danh mục...' : 'Chọn danh mục'}
              disabled={isCategoriesLoading || productCategories.length === 0}
              options={productCategories.map((c) => ({ label: c.name, value: c.id }))}
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Loại sản phẩm
            </Label>
            <DashSelect
              value={productType}
              onValueChange={(v) => setProductType(v as Product['product_type'])}
              placeholder="Chọn loại"
              options={[
                { label: 'Bán lẻ', value: 'retail' },
                { label: 'Vật tư tiêu hao', value: 'material' },
                { label: 'Cả hai', value: 'both' },
              ]}
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">Đơn vị</Label>
            <DashInput name="unit" placeholder="VD: chai" defaultValue={product?.unit ?? ''} />
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
                Dung tích (net)
              </Label>
              <DashInput
                name="net_amount"
                placeholder="VD: 500"
                defaultValue={product?.net_amount ?? ''}
              />
            </div>
            <div>
              <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
                Đơn vị tịnh
              </Label>
              <DashSelect
                value={netUnit || null}
                onValueChange={setNetUnit}
                placeholder="Chọn đơn vị"
                options={[
                  { label: 'ml', value: 'ml' },
                  { label: 'g (gam)', value: 'g' },
                ]}
              />
            </div>
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Giá nhập
            </Label>
            <DashInput
              type="number"
              name="cost_price"
              placeholder="VD: 500000"
              defaultValue={product?.cost_price ?? ''}
              disabled={isEdit}
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Giá bán
            </Label>
            <DashInput
              type="number"
              name="sell_price"
              placeholder="VD: 500000"
              defaultValue={product?.sell_price ?? ''}
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Tồn kho
            </Label>
            <DashInput
              type="number"
              name="stock_quantity"
              placeholder="VD: 50"
              defaultValue={product?.stock_quantity ?? ''}
              disabled={isEdit}
            />
          </div>
          <div>
            <Label className="mb-1.5 block min-w-0 text-xs font-semibold text-on-surface">
              Ngưỡng tối thiểu
            </Label>
            <DashInput
              type="number"
              name="min_stock"
              placeholder="VD: 50"
              defaultValue={product?.min_stock ?? ''}
            />
          </div>
        </div>
        <div className="flex items-center justify-between rounded-lg border border-outline bg-surface-container-low px-3 py-2">
          <div>
            <p className="text-xs font-semibold text-on-surface">Đang kinh doanh</p>
            <p className="text-[11px] text-on-surface-variant">Tắt nếu ngừng bán / hết hàng</p>
          </div>
          <Switch checked={isActive} onCheckedChange={setIsActive} />
        </div>
        <span className="text-xs text-on-surface-variant px-2">
          Ghi chú: Hệ thống sẽ tự động sinh mã SKU nếu bạn bỏ trống.
        </span>
      </form>
    </DashDialog>
  );
}
