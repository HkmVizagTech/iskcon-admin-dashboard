import { TrendingUp, TrendingDown } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: React.ReactNode;
  color: "blue" | "green" | "purple" | "orange";
  trend?: number;
  loading?: boolean;
}

const colorClasses = {
  blue: "bg-blue-50 text-blue-600",
  green: "bg-green-50 text-green-600",
  purple: "bg-purple-50 text-purple-600",
  orange: "bg-orange-50 text-orange-600",
};

export default function StatCard({
  title,
  value,
  icon,
  color,
  trend,
  loading,
}: StatCardProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 p-6">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-500">{title}</p>
          {loading ? (
            <div className="w-16 h-8 bg-gray-200 rounded animate-pulse mt-1"></div>
          ) : (
            <p className="text-2xl font-bold text-gray-900 mt-1">{value}</p>
          )}
        </div>
        <div className={`p-3 rounded-lg ${colorClasses[color]}`}>{icon}</div>
      </div>
      {trend !== undefined && !loading && (
        <div className="mt-4 flex items-center text-sm">
          {trend >= 0 ? (
            <TrendingUp className="w-4 h-4 mr-1 text-green-500" />
          ) : (
            <TrendingDown className="w-4 h-4 mr-1 text-red-500" />
          )}
          <span className={trend >= 0 ? "text-green-600" : "text-red-600"}>
            {Math.abs(trend)}% from last month
          </span>
        </div>
      )}
    </div>
  );
}
