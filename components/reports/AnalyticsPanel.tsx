"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import api from "@/lib/api";
import { Card, CardHeader, CardBody } from "@/components/ui/Card";
import Button from "@/components/ui/Button";
import { Download, Users, Clock, Award, ScanLine } from "lucide-react";
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Legend,
} from "recharts";
import toast from "react-hot-toast";

const COLORS = ["#F97316", "#22C55E", "#3B82F6", "#A855F7", "#EAB308", "#EF4444", "#14B8A6", "#EC4899"];
const TIER_COLORS: Record<string, string> = { A: "#F59E0B", B: "#64748B", C: "#EA580C" };

interface Props {
  events: any[];
}

export default function AnalyticsPanel({ events }: Props) {
  const [scope, setScope] = useState<string>("all");

  const { data, isLoading } = useQuery({
    queryKey: ["analytics", scope],
    queryFn: async () => {
      const params = scope && scope !== "all" ? `?eventId=${scope}` : "?eventId=all";
      return (await api.get(`/reports/analytics${params}`)).data;
    },
  });

  const exportAngle = async (angle: string) => {
    try {
      const params = `?eventId=${scope || "all"}&angle=${angle}`;
      const res = await api.get(`/reports/analytics/export${params}`, { responseType: "blob" });
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement("a");
      a.href = url;
      a.download = `report_${angle}_${scope}.csv`;
      a.click();
      window.URL.revokeObjectURL(url);
      toast.success(`${angle} report exported`);
    } catch {
      toast.error("Export failed");
    }
  };

  const totals = data?.totals || { issued: 0, attended: 0, notAttended: 0, attendanceRate: 0 };

  return (
    <div className="space-y-6">
      <Card>
        <CardBody>
          <div className="flex flex-col sm:flex-row sm:items-center gap-3">
            <span className="text-sm font-medium text-gray-700">Scope:</span>
            <select
              value={scope}
              onChange={(e) => setScope(e.target.value)}
              className="w-full sm:w-72 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500"
            >
              <option value="all">All Events (Combined)</option>
              {events?.map((e: any) => (
                <option key={e._id} value={e._id}>{e.name} ({e.eventCode})</option>
              ))}
            </select>
          </div>
        </CardBody>
      </Card>

      {isLoading ? (
        <div className="flex justify-center py-12">
          <div className="w-10 h-10 border-4 border-orange-500 border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="bg-blue-50 rounded-xl p-4 border border-blue-100">
              <p className="text-xs text-blue-600 font-medium">Total Issued</p>
              <p className="text-3xl font-bold text-blue-900">{totals.issued}</p>
            </div>
            <div className="bg-green-50 rounded-xl p-4 border border-green-100">
              <p className="text-xs text-green-600 font-medium">Attended</p>
              <p className="text-3xl font-bold text-green-900">{totals.attended}</p>
            </div>
            <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
              <p className="text-xs text-gray-500 font-medium">Not Attended</p>
              <p className="text-3xl font-bold text-gray-700">{totals.notAttended}</p>
            </div>
            <div className="bg-orange-50 rounded-xl p-4 border border-orange-100">
              <p className="text-xs text-orange-600 font-medium">Attendance Rate</p>
              <p className="text-3xl font-bold text-orange-900">{totals.attendanceRate}%</p>
            </div>
          </div>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center"><Users className="w-5 h-5 mr-2 text-orange-500" />Preacher-wise</h2>
                <Button variant="outline" size="sm" onClick={() => exportAngle("preacher")}>
                  <Download className="w-4 h-4 mr-1" />Export
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {data?.preacherWise?.length ? (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.preacherWise.slice(0, 12)} margin={{ bottom: 60 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-35} textAnchor="end" height={70} fontSize={11} interval={0} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="issued" fill="#F97316" name="Issued" />
                        <Bar dataKey="attended" fill="#22C55E" name="Attended" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Preacher</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Issued</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Attended</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Rate</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.preacherWise.map((p: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-900">{p.name}</td>
                            <td className="px-3 py-2 text-right">{p.issued}</td>
                            <td className="px-3 py-2 text-right">{p.attended}</td>
                            <td className="px-3 py-2 text-right text-gray-500">{p.issued ? Math.round((p.attended / p.issued) * 100) : 0}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <p className="text-gray-400 text-sm py-6 text-center">No data</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center"><Clock className="w-5 h-5 mr-2 text-blue-500" />Seva Slot-wise</h2>
                <Button variant="outline" size="sm" onClick={() => exportAngle("slot")}>
                  <Download className="w-4 h-4 mr-1" />Export
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {data?.slotWise?.length ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.slotWise} dataKey="issued" nameKey="name" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.name}: ${e.issued}`}>
                          {data.slotWise.map((_: any, i: number) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Code</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Seva</th>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Time</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-gray-500">Issued</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.slotWise.map((s: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2 font-mono font-bold">{s.code}</td>
                            <td className="px-3 py-2">{s.name}</td>
                            <td className="px-3 py-2 text-gray-500">{s.time || "-"}</td>
                            <td className="px-3 py-2 text-right font-medium">{s.issued}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : <p className="text-gray-400 text-sm py-6 text-center">No sponsors with seva slots</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center"><Award className="w-5 h-5 mr-2 text-amber-500" />Bahumana Tier-wise</h2>
                <Button variant="outline" size="sm" onClick={() => exportAngle("tier")}>
                  <Download className="w-4 h-4 mr-1" />Export
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {data?.tierWise?.length ? (
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-center">
                  <div className="h-64">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie data={data.tierWise} dataKey="issued" nameKey="tier" cx="50%" cy="50%" outerRadius={90} label={(e: any) => `${e.tier}: ${e.issued}`}>
                          {data.tierWise.map((t: any, i: number) => <Cell key={i} fill={TIER_COLORS[t.tier] || COLORS[i % COLORS.length]} />)}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="space-y-3">
                    {data.tierWise.map((t: any, i: number) => (
                      <div key={i} className="flex items-center justify-between p-3 rounded-xl border" style={{ borderColor: (TIER_COLORS[t.tier] || "#ccc") + "55" }}>
                        <span className="flex items-center gap-3">
                          <span className="w-10 h-10 rounded-xl flex items-center justify-center font-black text-white text-lg" style={{ background: TIER_COLORS[t.tier] || "#888" }}>{t.tier}</span>
                          <span className="text-sm text-gray-600">Bahumana {t.tier}</span>
                        </span>
                        <span className="text-2xl font-bold text-gray-900">{t.issued}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : <p className="text-gray-400 text-sm py-6 text-center">No sponsors with tiers</p>}
            </CardBody>
          </Card>

          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <h2 className="font-semibold flex items-center"><ScanLine className="w-5 h-5 mr-2 text-green-500" />Entry / Scan-wise</h2>
                <Button variant="outline" size="sm" onClick={() => exportAngle("entry")}>
                  <Download className="w-4 h-4 mr-1" />Export
                </Button>
              </div>
            </CardHeader>
            <CardBody>
              {data?.entryWise?.length ? (
                <>
                  <div className="h-72">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={data.entryWise} margin={{ bottom: 50 }}>
                        <CartesianGrid strokeDasharray="3 3" />
                        <XAxis dataKey="name" angle={-25} textAnchor="end" height={60} fontSize={11} interval={0} />
                        <YAxis allowDecimals={false} />
                        <Tooltip />
                        <Legend />
                        <Bar dataKey="granted" stackId="a" fill="#22C55E" name="Granted" />
                        <Bar dataKey="duplicate" stackId="a" fill="#EAB308" name="Duplicate" />
                        <Bar dataKey="denied" stackId="a" fill="#EF4444" name="Denied" />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                  <div className="overflow-x-auto mt-4">
                    <table className="w-full text-sm">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-medium text-gray-500">Entry Point</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-green-600">Granted</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-yellow-600">Duplicate</th>
                          <th className="px-3 py-2 text-right text-xs font-medium text-red-600">Denied</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-gray-100">
                        {data.entryWise.map((e: any, i: number) => (
                          <tr key={i}>
                            <td className="px-3 py-2 text-gray-900">{e.name}</td>
                            <td className="px-3 py-2 text-right text-green-700 font-medium">{e.granted}</td>
                            <td className="px-3 py-2 text-right text-yellow-700">{e.duplicate}</td>
                            <td className="px-3 py-2 text-right text-red-700">{e.denied}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </>
              ) : <p className="text-gray-400 text-sm py-6 text-center">No scan data yet</p>}
            </CardBody>
          </Card>
        </>
      )}
    </div>
  );
}
