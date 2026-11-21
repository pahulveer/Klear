"use client";

import React, { useState, useEffect } from "react";
import { QRCodeSVG } from "qrcode.react";
import { X, Check, Copy, ExternalLink, ShieldCheck, QrCode } from "lucide-react";
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
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fadeIn"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="relative w-full max-w-sm bg-white border-2 border-black rounded-3xl shadow-[6px_6px_0_0_#000] p-6 text-center animate-scaleUp">
        {/* Close Button */}
        <button
          onClick={onClose}
          aria-label="Close modal"
          className="absolute top-4 right-4 p-1.5 rounded-xl border-2 border-black bg-[#FAF8F5] hover:bg-zinc-200 shadow-[2px_2px_0_0_#000] transition-colors focus:ring-2 focus:ring-black focus:outline-none"
        >
          <X className="w-4 h-4 text-black" />
        </button>

        {/* Modal Badge */}
        <div className="inline-flex items-center gap-1.5 bg-[#2DD4BF] text-black text-xs font-black px-3 py-1 rounded-full border-2 border-black shadow-[1.5px_1.5px_0_0_#000] mb-3">
          <ShieldCheck className="w-3.5 h-3.5" />
          <span>INSTANT UPI QR</span>
        </div>

        <h3 className="text-xl font-black text-black">Scan to Settle via UPI</h3>
        <p className="text-xs font-bold text-zinc-600 mt-0.5">
          Pay <span className="text-black font-extrabold">{payeeName}</span>
        </p>

        {/* Dynamic Amount Banner */}
        <div className="my-4 p-3 bg-[#FAF8F5] border-2 border-black rounded-2xl shadow-[2px_2px_0_0_#000]">
          <span className="text-2xl sm:text-3xl font-black font-mono text-black">
            {formatINR(amount)}
          </span>
          <div className="text-[11px] font-bold text-zinc-500 mt-0.5">
            Zero transaction fees • Direct bank-to-bank
          </div>
        </div>

        {/* QR Code Container */}
        <div className="p-3.5 bg-white border-2 border-black rounded-2xl shadow-[3px_3px_0_0_#000] inline-block mx-auto">
          <QRCodeSVG
            value={upiUrl}
            size={175}
            level="H"
            includeMargin={true}
          />
        </div>

        {/* UPI ID Pill with Copy Button */}
        <div className="mt-4 flex items-center justify-between bg-zinc-100 border-2 border-black rounded-xl px-3 py-2 text-xs font-mono font-bold text-black">
          <span className="truncate max-w-[200px]">{upiId || "No UPI ID configured"}</span>
          <button
            onClick={handleCopyUpi}
            className="ml-2 flex items-center gap-1 text-[11px] font-black text-blue-700 hover:text-blue-900 shrink-0"
          >
            {copied ? (
              <>
                <Check className="w-3.5 h-3.5 text-emerald-600 stroke-[3]" />
                <span className="text-emerald-600">Copied!</span>
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
          <span className="px-2 py-0.5 bg-zinc-100 border border-black rounded">GPAY</span>
          <span className="px-2 py-0.5 bg-zinc-100 border border-black rounded">PHONEPE</span>
          <span className="px-2 py-0.5 bg-zinc-100 border border-black rounded">PAYTM</span>
          <span className="px-2 py-0.5 bg-zinc-100 border border-black rounded">BHIM</span>
        </div>

        {/* Action Buttons */}
        <div className="mt-5 space-y-2.5">
          {/* Deep link for mobile users */}
          <a
            href={upiUrl}
            className="w-full flex items-center justify-center gap-2 bg-[#2DD4BF] hover:bg-teal-300 text-black font-black text-sm py-3 rounded-2xl border-2 border-black shadow-[3px_3px_0_0_#000] active:translate-y-0.5 transition-all"
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
              className={`w-full py-2.5 text-xs font-black rounded-2xl border-2 border-black transition-all ${
                isPaid
                  ? "bg-zinc-200 text-zinc-600"
                  : "bg-[#FF7A00] text-black shadow-[2px_2px_0_0_#000] hover:bg-orange-500 active:translate-y-0.5"
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
