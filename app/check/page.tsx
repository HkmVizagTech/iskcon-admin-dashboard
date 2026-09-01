"use client";

// ─── Public devotee self-service page — /check ────────────────────────────
// Lives OUTSIDE the (dashboard) route group on purpose, so it does not go
// through DashboardLayout's auth redirect. Anyone with the link can open it.
//
// A devotee enters their mobile number and is told whether they are on the
// list for the festival running today. It deliberately shows NO QR code and
// NO pass ID — the pass is collected at the helpdesk, where staff verify
// identity. (A pass ID would itself be scannable: the scanner accepts a bare
// qrId string as a valid QR.)
//
// Uses a plain axios call rather than the shared lib/api client, because that
// client attaches the admin token and force-redirects to /login on any 401.

import { useState } from "react";
import axios from "axios";
import { Search, CheckCircle2, HelpCircle, Loader2 } from "lucide-react";

const API_URL =
  process.env.NEXT_PUBLIC_API_URL || "http://localhost:5000/api";

type LookupResult = {
  found: boolean;
  noActiveEvent?: boolean;
  event?: { name: string };
  holder?: {
    name: string;
    passType: string;
    venue: string;
    sevaSlot: string;
  };
};

export default function CheckPassPage() {
  const [phone, setPhone] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState<LookupResult | null>(null);

  const digits = phone.replace(/\D/g, "");
  const canSubmit = digits.length === 10 && !loading;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setLoading(true);
    setError("");
    setResult(null);

    try {
      const res = await axios.post(`${API_URL}/public/pass-lookup`, {
        phone: digits,
      });
      setResult(res.data);
    } catch (err: any) {
      setError(
        err?.response?.data?.message ||
          "Could not check right now. Please try again, or ask at the helpdesk.",
      );
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setResult(null);
    setError("");
    setPhone("");
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-orange-50 via-white to-amber-50 px-4 py-10">
      <div className="max-w-md mx-auto">
        {/* Header */}
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-gray-900">
            Check Your Pass
          </h1>
          <p className="mt-2 text-sm text-gray-600 leading-relaxed">
            Enter the mobile number you gave when you donated, to see if your
            pass is ready.
          </p>
        </div>

        {/* Lookup form */}
        {!result && (
          <form
            onSubmit={handleSubmit}
            className="bg-white rounded-2xl shadow-sm border border-orange-100 p-6"
          >
            <label
              htmlFor="phone"
              className="block text-sm font-medium text-gray-700 mb-2"
            >
              Mobile number
            </label>
            <div className="flex items-stretch rounded-xl border-2 border-gray-200 focus-within:border-orange-400 overflow-hidden">
              <span className="px-3 flex items-center bg-gray-50 text-gray-500 font-medium border-r border-gray-200">
                +91
              </span>
              <input
                id="phone"
                type="tel"
                inputMode="numeric"
                autoComplete="tel"
                value={phone}
                onChange={(e) =>
                  setPhone(e.target.value.replace(/\D/g, "").slice(0, 10))
                }
                placeholder="98765 43210"
                className="flex-1 px-4 py-3 text-lg tracking-wide outline-none"
              />
            </div>

            {error && (
              <p className="mt-3 text-sm text-red-600">{error}</p>
            )}

            <button
              type="submit"
              disabled={!canSubmit}
              className="mt-5 w-full py-3.5 rounded-xl bg-orange-500 text-white font-semibold text-base flex items-center justify-center gap-2 disabled:bg-gray-200 disabled:text-gray-400 transition-colors"
            >
              {loading ? (
                <>
                  <Loader2 className="w-5 h-5 animate-spin" />
                  Checking…
                </>
              ) : (
                <>
                  <Search className="w-5 h-5" />
                  Check
                </>
              )}
            </button>
          </form>
        )}

        {/* Result — on the list */}
        {result?.found && result.holder && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-green-200 p-6 text-center">
            <CheckCircle2 className="w-14 h-14 text-green-500 mx-auto" />
            <p className="mt-4 text-sm text-gray-500">You are on the list</p>
            <p className="mt-1 text-2xl font-bold text-gray-900">
              {result.holder.name}
            </p>

            <div className="mt-4 space-y-1 text-sm text-gray-600">
              {result.holder.passType && (
                <p className="font-medium text-gray-800">
                  {result.holder.passType}
                </p>
              )}
              {result.holder.venue && <p>{result.holder.venue}</p>}
              {result.holder.sevaSlot && <p>{result.holder.sevaSlot}</p>}
            </div>

            <div className="mt-6 rounded-xl bg-orange-50 border border-orange-200 p-4">
              <p className="text-sm text-orange-900 font-medium">
                Please show this screen at the helpdesk to collect your pass.
              </p>
            </div>

            <button
              onClick={reset}
              className="mt-5 text-sm text-gray-500 underline"
            >
              Check another number
            </button>
          </div>
        )}

        {/* Result — not found, or nothing running */}
        {result && !result.found && (
          <div className="bg-white rounded-2xl shadow-sm border-2 border-amber-200 p-6 text-center">
            <HelpCircle className="w-14 h-14 text-amber-500 mx-auto" />
            <p className="mt-4 text-base font-semibold text-gray-900">
              {result.noActiveEvent
                ? "No festival is running right now"
                : "We could not find this number"}
            </p>
            <p className="mt-2 text-sm text-gray-600 leading-relaxed">
              {result.noActiveEvent
                ? "Please check again on the day of the festival."
                : "You may have donated using a different mobile number. Please visit the helpdesk and our team will help you."}
            </p>

            <button
              onClick={reset}
              className="mt-6 w-full py-3 rounded-xl border-2 border-gray-200 text-gray-700 font-medium"
            >
              Try another number
            </button>
          </div>
        )}

        <p className="mt-8 text-center text-xs text-gray-400">
          Hare Krishna Movement, Visakhapatnam
        </p>
      </div>
    </div>
  );
}
