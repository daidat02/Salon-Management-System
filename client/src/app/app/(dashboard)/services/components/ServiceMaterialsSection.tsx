'use client';

import * as React from 'react';
import { Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DashCombobox } from '@/components/dashboard/DashCombobox';
import { toast } from '@/components/ui/toast';
import { getApiErrorMessage } from '@/services/apiClient';
import { useReplaceServiceMaterials } from '@/hooks/service';
import {
  buildUnitOptions,
  priceForUnit,
} from '@/app/app/(dashboard)/inventory/(create)/components/voucherData';
import { formatVND } from '@/lib/format';
import type { Product } from '@/types/product';
import type { ServiceMaterial } from '@/types/service';

type DraftMaterial = {
  key: string;
  productId: string;
  quantity: number;
  unit: string;
};

type Props = {
  serviceId: string;
  materials: ServiceMaterial[];
  products: Product[];
  productsLoading: boolean;
  canEdit: boolean;
  loading: boolean;
};

function toDraft(material: ServiceMaterial): DraftMaterial {
  return {
    key: material.id,
    productId: material.product_id,
    quantity: Number(material.quantity),
    unit: material.unit ?? material.product_unit ?? '',
  };
}

function draftSignature(drafts: DraftMaterial[]) {
  return JSON.stringify(
    drafts.map((d) => [d.productId, d.quantity, d.unit.trim()] as const),
  );
}

export function ServiceMaterialsSection({
  serviceId,
  materials,
  products,
  productsLoading,
  canEdit,
  loading,
}: Props) {
  const replaceMutation = useReplaceServiceMaterials();
  const [drafts, setDrafts] = React.useState<DraftMaterial[]>(() => materials.map(toDraft));
  const [selectedProductId, setSelectedProductId] = React.useState('');
  const [isEditing, setIsEditing] = React.useState(false);
  const editable = canEdit && isEditing;
  const localSeq = React.useRef(0);
  const baselineSignature = React.useMemo(
    () => draftSignature(materials.map(toDraft)),
    [materials],
  );

  const productById = React.useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) map.set(product.id, product);
    return map;
  }, [products]);

  const addedProductIds = React.useMemo(
    () => new Set(drafts.map((d) => d.productId)),
    [drafts],
  );

  const productOptions = React.useMemo(
    () =>
      products
        .filter((product) => !addedProductIds.has(product.id))
        .map((product) => ({
          value: product.id,
          label: `${product.name} • ${product.sku}`,
        })),
    [products, addedProductIds],
  );

  const isDirty = React.useMemo(
    () => draftSignature(drafts) !== baselineSignature,
    [drafts, baselineSignature],
  );

  const updateDraft = React.useCallback(
    (key: string, patch: Partial<Pick<DraftMaterial, 'quantity' | 'unit'>>) => {
      setDrafts((prev) => prev.map((d) => (d.key === key ? { ...d, ...patch } : d)));
    },
    [],
  );

  const removeDraft = React.useCallback((key: string) => {
    setDrafts((prev) => prev.filter((d) => d.key !== key));
  }, []);

  const addMaterial = React.useCallback(
    (productId: string) => {
      if (!productId) return;
      const product = productById.get(productId);
      if (!product) return;
      localSeq.current += 1;
      setDrafts((prev) => {
        if (prev.some((d) => d.productId === productId)) return prev;
        return [
          ...prev,
          {
            key: `local-${localSeq.current}`,
            productId,
            quantity: 1,
            unit: product.unit,
          },
        ];
      });
    },
    [productById],
  );

  const costPerUnit = React.useCallback(
    (draft: DraftMaterial) => {
      const product = productById.get(draft.productId);
      if (product) return priceForUnit(product, draft.unit || product.unit);
      const saved = materials.find((m) => m.product_id === draft.productId);
      return Number(saved?.cost_price ?? 0);
    },
    [materials, productById],
  );

  const handleSave = React.useCallback(async () => {
    if (drafts.some((d) => d.quantity <= 0)) {
      toast.add({
        title: 'Định lượng không hợp lệ',
        description: 'Định lượng vật tư phải lớn hơn 0.',
        type: 'error',
      });
      return;
    }

    try {
      const result = await replaceMutation.mutateAsync({
        id: serviceId,
        materials: drafts.map((d) => ({
          product_id: d.productId,
          quantity: d.quantity,
          unit: d.unit || undefined,
        })),
      });
      setDrafts(result.map(toDraft));
      setSelectedProductId('');
      setIsEditing(false);
      toast.add({
        title: 'Đã lưu định mức vật tư',
        description: 'Định mức mới áp dụng cho các đơn tạo sau thời điểm này.',
        type: 'success',
      });
    } catch (err) {
      toast.add({
        title: 'Lưu định mức thất bại',
        description: getApiErrorMessage(err),
        type: 'error',
      });
    }
  }, [drafts, replaceMutation, serviceId]);

  const handleCancel = React.useCallback(() => {
    setDrafts(materials.map(toDraft));
    setSelectedProductId('');
    setIsEditing(false);
  }, [materials]);

  const totalCost = drafts.reduce(
    (sum, draft) => sum + draft.quantity * costPerUnit(draft),
    0,
  );

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h5 className="text-xs font-semibold text-slate-800 uppercase tracking-wider">
          Định mức vật tư / lần thực hiện
        </h5>
        {canEdit ? (
          isEditing ? (
            <div className="flex items-center gap-2">
              <span className="text-[11px] text-on-surface-variant">
                Chọn vật tư để thêm dòng định mức
              </span>
              <Button
                variant="ghost"
                size="xs"
                onClick={handleCancel}
                disabled={replaceMutation.isPending}
              >
                Hủy
              </Button>
            </div>
          ) : (
            <Button variant="ghost" size="xs" onClick={() => setIsEditing(true)}>
              Chỉnh sửa
            </Button>
          )
        ) : null}
      </div>

      {editable ? (
        <DashCombobox
          options={productOptions}
          value={selectedProductId}
          onValueChange={(value) => {
            setSelectedProductId(value);
            addMaterial(value);
            setSelectedProductId('');
          }}
          placeholder={productsLoading ? 'Đang tải vật tư...' : 'Chọn vật tư...'}
          emptyMessage={
            productsLoading ? 'Đang tải danh sách vật tư...' : 'Không còn vật tư để thêm.'
          }
          disabled={productsLoading || replaceMutation.isPending}
        />
      ) : null}

      <div className="border border-outline rounded-xl overflow-hidden text-xs">
        <table className="w-full">
          <thead className="bg-surface-container-low text-on-surface-variant font-medium">
            <tr>
              <th className="py-2 px-3 text-left">Vật tư</th>
              <th className="py-2 px-3 text-right">Định lượng</th>
              <th className="py-2 px-3 text-right">Đơn vị</th>
              <th className="py-2 px-3 text-right">Giá vốn</th>
              {editable ? <th className="w-9 py-2 px-2" /> : null}
            </tr>
          </thead>
          <tbody className="divide-y divide-outline">
            {drafts.length === 0 ? (
              <tr>
                <td
                  colSpan={editable ? 5 : 4}
                  className="py-4 px-3 text-center text-on-surface-variant"
                >
                  {loading ? 'Đang tải…' : 'Chưa có định mức vật tư'}
                </td>
              </tr>
            ) : (
              drafts.map((draft) => {
                const product = productById.get(draft.productId);
                const saved = materials.find((m) => m.product_id === draft.productId);
                const unitOptions = product
                  ? buildUnitOptions(product).options
                  : [{ value: draft.unit, label: draft.unit || '—', factor: 1 }];
                return (
                  <tr key={draft.key}>
                    <td className="py-2 px-3 font-medium text-slate-700">
                      {product?.name ?? saved?.product_name ?? 'Vật tư'}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {editable ? (
                        <input
                          type="number"
                          min={0}
                          step="any"
                          value={draft.quantity}
                          onChange={(e) =>
                            updateDraft(draft.key, { quantity: Number(e.target.value) })
                          }
                          className="h-8 w-20 rounded-md border border-outline bg-surface px-2 text-right font-mono text-xs focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none"
                        />
                      ) : (
                        <span className="font-mono text-on-surface-variant">
                          {Number(draft.quantity).toLocaleString('vi-VN')}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right">
                      {editable ? (
                        <select
                          value={draft.unit}
                          onChange={(e) => updateDraft(draft.key, { unit: e.target.value })}
                          className="h-8 w-28 cursor-pointer rounded-md border border-outline bg-surface px-2 text-xs focus:border-primary focus:ring-1 focus:ring-primary/30 focus:outline-none"
                        >
                          {unitOptions.map((option) => (
                            <option key={option.value} value={option.value}>
                              {option.label}
                            </option>
                          ))}
                        </select>
                      ) : (
                        <span className="font-mono text-on-surface-variant">
                          {draft.unit || saved?.product_unit || '—'}
                        </span>
                      )}
                    </td>
                    <td className="py-2 px-3 text-right font-bold text-slate-900">
                      {formatVND(draft.quantity * costPerUnit(draft))}
                    </td>
                    {editable ? (
                      <td className="py-2 px-2 text-right">
                        <Button
                          variant="ghost"
                          size="icon-sm"
                          onClick={() => removeDraft(draft.key)}
                          disabled={replaceMutation.isPending}
                          aria-label="Xóa vật tư"
                          title="Xóa vật tư"
                          className="text-on-surface-variant hover:text-error"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </td>
                    ) : null}
                  </tr>
                );
              })
            )}
          </tbody>
          {drafts.length > 0 ? (
            <tfoot className="bg-surface-container-low/60">
              <tr>
                <td colSpan={3} className="py-2 px-3 text-left font-medium">
                  Tổng giá vốn định mức
                </td>
                <td className="py-2 px-3 text-right font-bold text-slate-900">
                  {formatVND(totalCost)}
                </td>
                {editable ? <td /> : null}
              </tr>
            </tfoot>
          ) : null}
        </table>
      </div>

      {editable && isDirty ? (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2">
          <span className="text-xs font-medium text-amber-800">
            Có thay đổi định mức chưa lưu — bấm Lưu để đồng bộ.
          </span>
          <Button size="sm" disabled={replaceMutation.isPending} onClick={() => void handleSave()}>
            {replaceMutation.isPending ? 'Đang lưu...' : 'Lưu thay đổi'}
          </Button>
        </div>
      ) : null}
    </div>
  );
}

export default ServiceMaterialsSection;
