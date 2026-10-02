"use client";

import { QRCodeSVG } from "qrcode.react";
import { Download, Share2, Printer, X } from "lucide-react";
import Button from "@/components/ui/Button";

interface QRPreviewProps {
  qrData: {
    qrId: string;
    qrImage: string;
    validFrom: string;
    validUntil: string;
  };
  holderName: string;
  onClose: () => void;
  onNew: () => void;
}

export default function QRPreview({
  qrData,
  holderName,
  onClose,
  onNew,
}: QRPreviewProps) {
  const handleDownload = () => {
    const link = document.createElement("a");
    link.href = qrData.qrImage;
    link.download = `${qrData.qrId}.png`;
    link.click();
  };

  // Built with DOM APIs + textContent (not document.write) so holderName and
  // other API strings can never be interpreted as markup.
  const handlePrint = () => {
    const printWindow = window.open("", "_blank");
    if (!printWindow) return;
    const doc = printWindow.document;
    doc.title = `ISKCON Seva Pass - ${qrData.qrId}`;

    const style = doc.createElement("style");
    style.textContent = `
      body { font-family: Arial; text-align: center; padding: 50px; }
      img { max-width: 400px; }
      h2 { color: #f97316; }
      p { margin: 10px 0; }
    `;
    doc.head.appendChild(style);

    const add = (tag: string, text: string, parent: HTMLElement = doc.body) => {
      const el = doc.createElement(tag);
      el.textContent = text;
      parent.appendChild(el);
      return el;
    };
    const addField = (label: string, value: string) => {
      const p = add("p", "");
      add("strong", label, p);
      p.appendChild(doc.createTextNode(` ${value}`));
    };

    add("h2", "🕉️ ISKCON Seva Pass");
    add("h3", holderName);
    const img = doc.createElement("img");
    img.onload = img.onerror = () => printWindow.print();
    img.src = qrData.qrImage;
    doc.body.appendChild(img);
    addField("Pass ID:", qrData.qrId);
    addField(
      "Valid:",
      `${new Date(qrData.validFrom).toLocaleString()} - ${new Date(qrData.validUntil).toLocaleString()}`,
    );
    add("p", "Hare Krishna 🙏");
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-2xl shadow-2xl max-w-md w-full">
        <div className="p-6">
          <div className="flex justify-between items-center mb-4">
            <h2 className="text-xl font-bold text-gray-900">
              QR Pass Generated
            </h2>
            <button
              onClick={onClose}
              className="text-gray-400 hover:text-gray-600"
            >
              <X className="w-6 h-6" />
            </button>
          </div>

          <div className="bg-gradient-to-br from-orange-50 to-red-50 rounded-xl p-6 mb-4">
            <div className="bg-white rounded-lg p-4 flex justify-center">
              <img src={qrData.qrImage} alt="QR Code" className="w-64 h-64" />
            </div>
          </div>

          <div className="space-y-2 mb-6">
            <p className="text-center font-medium text-gray-900">
              {holderName}
            </p>
            <p className="text-center text-sm font-mono text-gray-600">
              {qrData.qrId}
            </p>
            <p className="text-center text-xs text-gray-500">
              Valid: {new Date(qrData.validFrom).toLocaleDateString()} -{" "}
              {new Date(qrData.validUntil).toLocaleDateString()}
            </p>
          </div>

          <div className="flex space-x-3">
            <Button
              variant="outline"
              onClick={handleDownload}
              className="flex-1"
            >
              <Download className="w-4 h-4 mr-2" />
              Download
            </Button>
            <Button variant="outline" onClick={handlePrint} className="flex-1">
              <Printer className="w-4 h-4 mr-2" />
              Print
            </Button>
          </div>

          <div className="mt-4">
            <Button onClick={onNew} className="w-full">
              Create Another Pass
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
