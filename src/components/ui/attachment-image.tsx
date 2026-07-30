import { useEffect, useState } from 'react';
import { fetchAttachmentObjectUrl } from '@/api/attachments';

/** Renders a stored attachment (e.g. a proof-of-delivery photo) fetched with auth. */
export function AttachmentImage({ id, alt, className }: { id: string; alt: string; className?: string }) {
  const [url, setUrl] = useState<string | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    let active = true;
    let created: string | null = null;
    fetchAttachmentObjectUrl(id)
      .then((u) => {
        if (!active) {
          URL.revokeObjectURL(u);
          return;
        }
        created = u;
        setUrl(u);
      })
      .catch(() => active && setFailed(true));
    return () => {
      active = false;
      if (created) URL.revokeObjectURL(created);
    };
  }, [id]);

  if (failed) return <span className="text-sm text-(--text-tertiary)">Couldn't load photo</span>;
  if (!url) return <div className={`animate-pulse rounded-lg bg-(--surface-2) ${className ?? 'h-40'}`} />;
  return <img src={url} alt={alt} className={className} />;
}
