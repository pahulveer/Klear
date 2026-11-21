"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Check, Copy, ExternalLink, ShieldCheck } from "lucide-react";
import { buildUpiLink } from "@/lib/settleDebts";
import { formatINR } from "@/lib/utils";

interface QRModalProps {
  isOpen: boolean;
  onClose: () => void;
  payeeName: string;
  upiId: string;
  amount: number;
  note?: string;
  onMarkPaid?: () => void;
  isPaid?: boolean;
}

export const QRModal: React.FC<QRModalProps> = ({
  isOpen,
  onClose,
  payeeName,
  upiId,
  amount,
  note = "Klear Settlement",
  onMarkPaid,
  isPaid = false,
}) => {
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const upiUrl = buildUpiLink({
    upiId,
    payeeName,
    amount,
    note,
  });

  const handleCopyUpi = () => {
    navigator.clipboard.writeText(upiId);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="relative w-full max-w-sm bg-white border-2 border-black rounded-2xl shadow-[6px_6px_0_0_#000] p-6 text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-lg border-2 border-black bg-[#FAF8F5] hover:bg-zinc-200 shadow-[2px_2px_0_0_#000] transition-colors"
        >
          <X className="w-4 h-4 text-black" />
        </button>

        {/* Modal Badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#2DD4BF] text-black text-xs font-black px-3 py-1 rounded-full border-2 border-black shadow-[2px_2px_0_0_#000] mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>INSTANT UPI QR</span>
        </div>

        <h3 className="text-xl font-black text-black">Scan to Pay via UPI</h3>
        <p className="text-xs font-bold text-zinc-600 mt-0.5">
          Pay <span className="text-black font-extrabold">{payeeName}</span>
        </p>

        {/* Dynamic Amount Banner */}
        <div className="my-4 p-2.5 bg-[#FAF8F5] border-2 border-black rounded-xl shadow-[2px_2px_0_0_#000]">
          <span className="text-2xl font-black font-mono text-black">
            {formatINR(amount)}
          </span>
          <div className="text-[11px] font-bold text-zinc-500">
            Zero fees • Direct bank-to-bank
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-4 bg-white border-2 border-black rounded-xl shadow-[3px_3px_0_0_#000] inline-block mx-auto">
          <QRCodeSVG
            value={upiUrl}
            size={180}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* UPI ID Pill with Copy Button */}
        <div className="mt-4 flex items-center justify-between bg-zinc-100 border-2 border-black rounded-lg px-3 py-1.5 text-xs font-mono font-bold text-black">
          <span className="truncate">{upiId}</span>
          <button
            onClick={handleCopyUpi}
            className="ml-2 flex items-center gap-1 text-[11px] font-black text-blue-700 hover:text-blue-900"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-green-600" />
                <span className="text-green-600">Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-3.5 h-3.5" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>

        {/* Supported Apps Chips */}
        <div className="flex items-center justify-center gap-1.5 mt-3 text-[10px] font-black">
          <span className="px-2 py-0.5 bg-zinc-200 border border-black rounded">GPAY</span>
          <span className="px-2 py-0.5 bg-zinc-200 border border-black rounded">PHONEPE</span>
          <span className="px-2 py-0.5 bg-zinc-200 border border-black rounded">PAYTM</span>
          <span className="px-2 py-0.5 bg-zinc-200 border border-black rounded">BHIM</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2">
          {/* Deep link for mobile users */}
          <a
            href={upiUrl}
            className="w-full flex items-center justify-center gap-2 bg-[#2DD4BF] text-black font-black text-sm py-2.5 rounded-xl border-2 border-black shadow-[3px_3px_0_0_#000] hover:translate-x-[1px] hover:translate-y-[1px] transition-all"
          >
            <ExternalLink className="w-4 h-4" />
            <span>Open in UPI App</span>
          </a>

          {onMarkPaid && (
            <button
              onClick={() => {
                onMarkPaid();
                onClose();
              }}
              className={`w-full py-2 text-xs font-black rounded-xl border-2 border-black transition-all ${
                isPaid
                  ? "bg-zinc-200 text-zinc-600"
                  : "bg-[#FF7A00] text-black shadow-[2px_2px_0_0_#000] hover:bg-amber-500"
              }`}
            >
              {isPaid ? "Marked as Paid ✓" : "✓ Mark as Paid"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
