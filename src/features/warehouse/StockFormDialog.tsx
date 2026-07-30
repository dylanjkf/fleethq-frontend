import { useEffect, useState } from 'react';
import { Plus, X } from 'lucide-react';
import type { StockInput, StockItem } from '@/api/warehouse';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';

interface CustomField {
  key: string;
  value: string;
}

interface StockFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  item?: StockItem;
  categories: string[];
  onSubmit: (values: StockInput) => Promise<void>;
  isSubmitting: boolean;
}

/**
 * Add or edit a stock line. Beyond the standard fields, a free-form
 * custom-fields editor writes arbitrary key/value pairs into `attributes` —
 * the "fully customizable" part of the brief: batch, supplier, expiry, or
 * anything a customer's own stock needs, with no schema change.
 */
export function StockFormDialog({ open, onOpenChange, item, categories, onSubmit, isSubmitting }: StockFormDialogProps) {
  const isEdit = !!item;
  const [name, setName] = useState('');
  const [sku, setSku] = useState('');
  const [category, setCategory] = useState('');
  const [quantity, setQuantity] = useState('0');
  const [unit, setUnit] = useState('');
  const [location, setLocation] = useState('');
  const [minQuantity, setMinQuantity] = useState('');
  const [fields, setFields] = useState<CustomField[]>([]);

  useEffect(() => {
    if (open) {
      setName(item?.name ?? '');
      setSku(item?.sku ?? '');
      setCategory(item?.category ?? '');
      setQuantity(String(item?.quantity ?? 0));
      setUnit(item?.unit ?? '');
      setLocation(item?.location ?? '');
      setMinQuantity(item?.minQuantity != null ? String(item.minQuantity) : '');
      setFields(
        item?.attributes
          ? Object.entries(item.attributes).map(([key, value]) => ({ key, value: String(value ?? '') }))
          : [],
      );
    }
  }, [open, item]);

  const canSubmit = name.trim().length > 0;

  async function submit() {
    if (!canSubmit) return;
    const attributes: Record<string, unknown> = {};
    for (const f of fields) {
      if (f.key.trim()) attributes[f.key.trim()] = f.value;
    }
    await onSubmit({
      name: name.trim(),
      sku: sku.trim() || undefined,
      category: category.trim() || undefined,
      quantity: Number(quantity) || 0,
      unit: unit.trim() || undefined,
      location: location.trim() || undefined,
      minQuantity: minQuantity.trim() ? Number(minQuantity) : undefined,
      attributes: Object.keys(attributes).length ? attributes : undefined,
    });
    onOpenChange(false);
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit stock item' : 'Add stock item'}</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="st-name">Name</Label>
            <Input id="st-name" placeholder="e.g. Pallet wrap 500mm" value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="st-sku">SKU (optional)</Label>
              <Input id="st-sku" value={sku} onChange={(e) => setSku(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-cat">Category (optional)</Label>
              <Input id="st-cat" value={category} onChange={(e) => setCategory(e.target.value)} list="stock-cats" />
              {categories.length > 0 && (
                <datalist id="stock-cats">
                  {categories.map((c) => (
                    <option key={c} value={c} />
                  ))}
                </datalist>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <Label htmlFor="st-qty">Quantity</Label>
              <Input id="st-qty" type="number" value={quantity} onChange={(e) => setQuantity(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-unit">Unit</Label>
              <Input id="st-unit" placeholder="ea, roll, kg" value={unit} onChange={(e) => setUnit(e.target.value)} />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="st-min">Min qty</Label>
              <Input id="st-min" type="number" placeholder="reorder at" value={minQuantity} onChange={(e) => setMinQuantity(e.target.value)} />
            </div>
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="st-loc">Location (optional)</Label>
            <Input id="st-loc" placeholder="Aisle / bin / zone" value={location} onChange={(e) => setLocation(e.target.value)} />
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Custom fields</Label>
              <Button type="button" variant="ghost" size="sm" onClick={() => setFields((f) => [...f, { key: '', value: '' }])}>
                <Plus className="h-3.5 w-3.5" /> Add field
              </Button>
            </div>
            {fields.length === 0 ? (
              <p className="text-xs text-(--text-tertiary)">Add batch, supplier, expiry — anything your stock needs.</p>
            ) : (
              <div className="space-y-2">
                {fields.map((f, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <Input
                      placeholder="Field"
                      value={f.key}
                      onChange={(e) => setFields((arr) => arr.map((x, j) => (j === i ? { ...x, key: e.target.value } : x)))}
                    />
                    <Input
                      placeholder="Value"
                      value={f.value}
                      onChange={(e) => setFields((arr) => arr.map((x, j) => (j === i ? { ...x, value: e.target.value } : x)))}
                    />
                    <button
                      type="button"
                      className="text-(--text-tertiary) hover:text-(--text-primary)"
                      onClick={() => setFields((arr) => arr.filter((_, j) => j !== i))}
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <DialogFooter>
          <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button type="button" disabled={isSubmitting || !canSubmit} onClick={submit}>
            {isSubmitting ? 'Saving…' : isEdit ? 'Save changes' : 'Add item'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
