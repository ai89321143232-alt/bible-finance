import React, { useEffect, useState } from 'react';
import { base44 } from '@/api/base44Client';

export default function PrivateImage({ fileUri, alt, className }) {
  const [url, setUrl] = useState('');
  useEffect(() => { if (fileUri) base44.integrations.Core.CreateFileSignedUrl({ file_uri: fileUri }).then((result) => setUrl(result.signed_url)); }, [fileUri]);
  return url ? <img src={url} alt={alt} className={className} /> : null;
}