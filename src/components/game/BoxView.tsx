"use client";

import React from "react";
import {
  AlertCircle,
  BarChart3,
  BookOpen,
  Clock,
  DollarSign,
  Info,
  Package,
  PieChart,
  ShoppingCart,
  Star,
  TrendingUp,
  Truck,
  Users,
  Wallet,
} from "@/components/cyan/PixelIcons";
import { Stagger, StaggerItem } from "@/components/cyan/Stagger";

const FO = "var(--sv-font-ui)";

export interface StatItem {
  id: string;
  title: string;
  value: string;
  subtext?: string;
  subtextColor?: string;
  unit?: string;
  icon: string;
  multiValue?: { label: string; value: string }[];
  color?: string;
  imageUrl?: string;
}

interface BoxViewProps {
  data: StatItem[];
  gridCols?: number;
  /** Tighter cards for single-viewport play layout. */
  dense?: boolean;
}

/** KPI cards ported from classic Beer Game BoxView (/demo/beer-game). */
export default function BoxView({ data, gridCols = 2, dense = false }: BoxViewProps) {
  if (!data) return null;

  const getGridClass = () => {
    switch (gridCols) {
      case 3:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3";
      case 4:
        return "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4";
      case 6:
        return "grid-cols-2 sm:grid-cols-3 xl:grid-cols-6";
      default:
        return "grid-cols-1 sm:grid-cols-2";
    }
  };

  return (
    <Stagger className={`grid ${dense ? "gap-1.5" : "gap-3"} ${getGridClass()}`} delay={0.05}>
      {data.map((stat) => (
        <StaggerItem key={stat.id} className="h-full">
          <StatCard stat={stat} dense={dense} />
        </StaggerItem>
      ))}
    </Stagger>
  );
}

function StatCard({ stat, dense = false }: { stat: StatItem; dense?: boolean }) {
  const getIcon = (iconName: string) => {
    switch (iconName) {
      case "pie-chart":
        return <PieChart size={22} color="var(--sv-teal-mid)" />;
      case "book":
        return <BookOpen size={22} color="var(--sv-teal-mid)" />;
      case "dollar-sign":
        return <DollarSign size={22} color="var(--sv-positive)" />;
      case "trending-up":
        return <TrendingUp size={22} color="var(--sv-positive)" />;
      case "truck":
        return <Truck size={22} color="var(--sv-teal-mid)" />;
      case "clock":
        return <Clock size={22} color="var(--sv-teal-mid)" />;
      case "chart-board":
        return <BarChart3 size={22} color="var(--sv-teal-mid)" />;
      case "money-bag":
      case "wallet":
        return <Wallet size={22} color="var(--sv-teal-mid)" />;
      case "tag":
        return <Star size={22} color="var(--sv-teal-mid)" />;
      case "package":
        return <Package size={22} color="var(--sv-teal-mid)" />;
      case "box":
        return <ShoppingCart size={22} color="var(--sv-teal-mid)" />;
      case "alert":
        return <AlertCircle size={22} color="var(--sv-negative)" />;
      case "users":
        return <Users size={22} color="var(--sv-teal-mid)" />;
      case "info":
        return <Info size={22} color="var(--sv-text-muted)" />;
      default:
        return <Info size={22} color="var(--sv-text-muted)" />;
    }
  };

  return (
    <div
      style={{
        background: "var(--sv-card)",
        border: "1.4px solid white",
        borderRadius: dense ? 12 : "var(--sv-radius-2xl)",
        padding: dense ? 10 : 16,
        minHeight: dense ? 72 : 96,
        height: "100%",
      }}
      className={`flex justify-between items-start ${dense ? "gap-2" : "gap-3"}`}
    >
      <div className={`flex flex-col ${dense ? "gap-0.5" : "gap-1.5"} min-w-0 flex-1`}>
        <span
          style={{
            fontFamily: FO,
            fontSize: dense ? 10 : 11,
            fontWeight: 600,
            color: "var(--sv-text-secondary)",
          }}
        >
          {stat.title}
        </span>
        {stat.multiValue ? (
          <div className="space-y-1">
            {stat.multiValue.map((mv, idx) => (
              <div key={idx} className="flex justify-between items-center gap-3">
                <span
                  style={{
                    fontFamily: FO,
                    fontSize: 12,
                    fontWeight: 500,
                    color: "var(--sv-text-secondary)",
                  }}
                >
                  {mv.label}
                </span>
                <span
                  className="sv-tabular"
                  style={{
                    fontFamily: FO,
                    fontSize: 16,
                    fontWeight: 700,
                    color: "var(--sv-ink)",
                  }}
                >
                  {mv.value}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <div className="flex items-baseline gap-1.5">
            <span
              className="sv-tabular"
              style={{
                fontFamily: FO,
                fontSize: dense ? 18 : 22,
                fontWeight: 700,
                color: stat.color || "var(--sv-ink)",
                lineHeight: 1,
              }}
            >
              {stat.value}
            </span>
            {stat.unit && (
              <span
                style={{
                  fontFamily: FO,
                  fontSize: dense ? 11 : 12,
                  fontWeight: 500,
                  color: "var(--sv-text-muted)",
                }}
              >
                {stat.unit}
              </span>
            )}
          </div>
        )}
        {stat.subtext && (
          <p
            className={dense ? "hidden sm:block" : undefined}
            style={{
              fontFamily: FO,
              fontSize: dense ? 10 : 11,
              color: stat.subtextColor || "var(--sv-text-muted)",
              marginTop: 2,
              lineHeight: 1.25,
            }}
          >
            {stat.subtext}
          </p>
        )}
      </div>
      <div
        style={{
          width: dense ? 32 : 40,
          height: dense ? 32 : 40,
          borderRadius: dense ? 8 : 10,
          background:
            stat.icon === "alert" ? "rgba(198,82,82,0.12)" : "var(--sv-cyan-tint)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          flexShrink: 0,
        }}
      >
        {getIcon(stat.icon)}
      </div>
    </div>
  );
}
