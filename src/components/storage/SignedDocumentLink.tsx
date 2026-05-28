import { useEffect, useState, type ReactNode } from 'react';
import { getSignedDocumentUrl, type PrivateBucket } from '@/lib/storage';
import { useToast } from '@/hooks/use-toast';

interface SignedDocumentLinkProps {
  bucket: PrivateBucket;
  /** Either a legacy public URL or a bucket-relative path. */
  urlOrPath: string | null | undefined;
  className?: string;
  title?: string;
  children: ReactNode;
  ttlSeconds?: number;
}

/**
 * Anchor element that resolves a short-lived signed URL on click.
 * Falls back to a disabled-looking button if the path is missing.
 */
export function SignedDocumentLink({
  bucket,
  urlOrPath,
  className,
  title,
  children,
  ttlSeconds = 300,
}: SignedDocumentLinkProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);

  const handleClick = async (e: React.MouseEvent<HTMLAnchorElement>) => {
    e.preventDefault();
    if (!urlOrPath || loading) return;
    setLoading(true);
    try {
      const signed = await getSignedDocumentUrl(bucket, urlOrPath, ttlSeconds);
      if (!signed) {
        toast({
          title: 'Unable to open document',
          description: 'You may not have access, or the file no longer exists.',
          variant: 'destructive',
        });
        return;
      }
      window.open(signed, '_blank', 'noopener,noreferrer');
    } finally {
      setLoading(false);
    }
  };

  return (
    <a
      href={urlOrPath || '#'}
      onClick={handleClick}
      className={className}
      title={title}
      aria-disabled={!urlOrPath || loading}
    >
      {children}
    </a>
  );
}
