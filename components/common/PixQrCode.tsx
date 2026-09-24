'use client';

import { useEffect, useState } from 'react';

interface PixQrCodeProps {
  copiaECola: string;
  size?: number;
}

export function PixQrCode({ copiaECola, size = 220 }: PixQrCodeProps) {
  const [dataUrl, setDataUrl] = useState<string | null>(null);
  const [erro, setErro] = useState(false);

  useEffect(() => {
    let cancelado = false;

    (async () => {
      try {
        const QRCode = (await import('qrcode')).default;
        const url = await QRCode.toDataURL(copiaECola, { width: size, margin: 1 });
        if (!cancelado) setDataUrl(url);
      } catch (err) {
        console.error('Erro ao gerar QR Code:', err);
        if (!cancelado) setErro(true);
      }
    })();

    return () => { cancelado = true; };
  }, [copiaECola, size]);

  if (erro) {
    return <p className="text-xs text-red-500">Não foi possível gerar o QR Code.</p>;
  }

  if (!dataUrl) {
    return (
      <div
        style={{ width: size, height: size }}
        className="bg-gray-100 rounded-lg animate-pulse"
      />
    );
  }

  return (
    <img
      src={dataUrl}
      alt="QR Code Pix"
      width={size}
      height={size}
      className="rounded-lg border border-gray-200"
    />
  );
}