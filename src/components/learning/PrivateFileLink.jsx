import React, { useState } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';

export default function PrivateFileLink({ fileUri, label }) {
  const [loading, setLoading] = useState(false);
  if (!fileUri) return null;
  const open = async () => { setLoading(true); const { signed_url } = await base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri }); window.open(signed_url, '_blank', 'noopener,noreferrer'); setLoading(false); };
  return <Button type="button" variant="outline" size="sm" disabled={loading} onClick={open}><Download className="w-4 h-4 mr-1" />{loading ? 'Открытие…' : label}</Button>;
}