"use client";

import React, { useEffect, useState } from "react";
import type { StaticImageData } from "next/image";

/** Beer-game subset of Streamline Pixel icons (from classic /demo/beer-game). */

function useCaptureMode() {
  const [capture, setCapture] = useState(false);
  useEffect(() => {
    if (typeof window === "undefined") return;
    const params = new URLSearchParams(window.location.search);
    if (params.get("capture") === "1") setCapture(true);
  }, []);
  return capture;
}

import packageIcon from "./icons/shopping-shipping-loading-box--Streamline-Pixel.svg";
import truck from "./icons/shopping-shipping-delivery-truck--Streamline-Pixel.svg";
import users from "./icons/multiple-user--Streamline-Pixel.svg";
import alertCircle from "./icons/interface-essential-alert-circle-1--Streamline-Pixel.svg";
import wallet from "./icons/business-products-wallet-money--Streamline-Pixel.svg";
import clock from "./icons/interface-essential-clock--Streamline-Pixel.svg";
import trophy from "./icons/interface-essential-trophy--Streamline-Pixel.svg";
import info from "./icons/interface-essential-information-circle-1--Streamline-Pixel.svg";
import barChart from "./icons/business-products-data-file-bars--Streamline-Pixel.svg";
import trendingUp from "./icons/business-products-performance-money-increase--Streamline-Pixel.svg";
import box from "./icons/shopping-shipping-box--Streamline-Pixel.svg";
import shoppingCart from "./icons/shopping-shipping-cart--Streamline-Pixel.svg";
import dollar from "./icons/money-payments-cash-payment-coin--Streamline-Pixel.svg";
import openBook from "./icons/content-files-open-book--Streamline-Pixel.svg";
import star from "./icons/social-rewards-rating-star-1--Streamline-Pixel.svg";
import pieChart from "./icons/interface-essential-pie-chart-poll-report-1--Streamline-Pixel.svg";
import play from "./icons/video-movies-play--Streamline-Pixel.svg";
import target from "./icons/business-product-target--Streamline-Pixel.svg";
import zap from "./icons/interface-essential-flash--Streamline-Pixel.svg";
import check from "./icons/business-product-check--Streamline-Pixel.svg";

export type PixelIconProps = Omit<React.SVGProps<HTMLSpanElement>, "color"> & {
  size?: number;
  color?: string;
  title?: string;
};

type IconAsset = string | StaticImageData;

function assetUrl(asset: IconAsset) {
  return typeof asset === "string" ? asset : asset.src;
}

function makeIcon(asset: IconAsset, rotation = 0) {
  return function StreamlinePixelIcon({
    size = 20,
    color = "currentColor",
    className,
    title,
    style,
    ...props
  }: PixelIconProps) {
    const capture = useCaptureMode();
    const url = assetUrl(asset);

    if (capture) {
      return (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={url}
          alt={title || ""}
          aria-hidden={title ? undefined : true}
          className={className}
          style={{
            width: size,
            height: size,
            display: "inline-block",
            flexShrink: 0,
            objectFit: "contain",
            ...style,
            transform: rotation ? `rotate(${rotation}deg)` : style?.transform,
          }}
        />
      );
    }

    const maskUrl = `url("${url}")`;

    return (
      <span
        aria-hidden={title ? undefined : true}
        aria-label={title}
        className={className}
        role={title ? "img" : undefined}
        style={{
          width: size,
          height: size,
          display: "inline-block",
          flexShrink: 0,
          backgroundColor: color,
          maskImage: maskUrl,
          WebkitMaskImage: maskUrl,
          maskPosition: "center",
          WebkitMaskPosition: "center",
          maskRepeat: "no-repeat",
          WebkitMaskRepeat: "no-repeat",
          maskSize: "contain",
          WebkitMaskSize: "contain",
          ...style,
          transform: rotation ? `rotate(${rotation}deg)` : style?.transform,
        }}
        {...props}
      />
    );
  };
}

export const Package = makeIcon(packageIcon);
export const Truck = makeIcon(truck);
export const Users = makeIcon(users);
export const AlertCircle = makeIcon(alertCircle);
export const Wallet = makeIcon(wallet);
export const Clock = makeIcon(clock);
export const Trophy = makeIcon(trophy);
export const Info = makeIcon(info);
export const BarChart3 = makeIcon(barChart);
export const TrendingUp = makeIcon(trendingUp);
export const Box = makeIcon(box);
export const ShoppingCart = makeIcon(shoppingCart);
export const DollarSign = makeIcon(dollar);
export const BookOpen = makeIcon(openBook);
export const Star = makeIcon(star);
export const PieChart = makeIcon(pieChart);
export const Play = makeIcon(play);
export const Target = makeIcon(target);
export const Zap = makeIcon(zap);
export const CheckCircle = makeIcon(check);
export const CheckCircle2 = makeIcon(check);
