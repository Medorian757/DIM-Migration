import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { motion } from "framer-motion";

export default function StatsCard({ title, value, subtitle, icon: Icon, trend, trendUp, className, accent }) {
  const accents = {
    blue: {
      bg: "from-indigo-500 to-indigo-600",
      iconBg: "bg-indigo-50",
      iconColor: "text-indigo-600",
      bar: "bg-indigo-500",
    },
    green: {
      bg: "from-emerald-500 to-emerald-600",
      iconBg: "bg-emerald-50",
      iconColor: "text-emerald-600",
      bar: "bg-emerald-500",
    },
    purple: {
      bg: "from-violet-500 to-violet-600",
      iconBg: "bg-violet-50",
      iconColor: "text-violet-600",
      bar: "bg-violet-500",
    },
    rose: {
      bg: "from-rose-500 to-rose-600",
      iconBg: "bg-rose-50",
      iconColor: "text-rose-600",
      bar: "bg-rose-500",
    },
  };

  const colors = accents[accent] || accents.blue;

  return (
    <motion.div whileHover={{ y: -2 }} transition={{ duration: 0.2 }}>
      <Card className={cn("relative overflow-hidden p-6 bg-white border border-slate-100 shadow-sm hover:shadow-lg transition-all duration-300", className)}>
        <div className={cn("absolute top-0 left-0 w-1 h-full rounded-l-xl", colors.bar)} />
        <div className="flex items-start justify-between pl-2">
          <div className="space-y-2 min-w-0 flex-1">
            <p className="text-xs font-semibold uppercase tracking-widest text-slate-400">{title}</p>
            <p className="text-3xl font-bold text-slate-900 tracking-tight leading-none">{value}</p>
            {subtitle && (
              <p className="text-xs text-slate-500 truncate">{subtitle}</p>
            )}
            {trend && (
              <div className={cn(
                "inline-flex items-center gap-1 text-xs font-medium px-2 py-1 rounded-full",
                trendUp ? "bg-emerald-50 text-emerald-600" : "bg-rose-50 text-rose-600"
              )}>
                {trend}
              </div>
            )}
          </div>
          {Icon && (
            <div className={cn("p-3 rounded-2xl flex-shrink-0 ml-3", colors.iconBg)}>
              <Icon className={cn("h-5 w-5", colors.iconColor)} />
            </div>
          )}
        </div>
      </Card>
    </motion.div>
  );
}