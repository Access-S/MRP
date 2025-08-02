// src/styles/themes.ts

export type ThemeName = "classic" | "sunset" | "dark";

export interface Theme {
  name: string;
  isDark: boolean;
  background: string;
  navbar: string;
  cards: string;
  text: string;
  sidebarText: string;
  tableHeaderBg: string;
  borderColor: string;
  hoverBg: string;
  activeRowBg: string;
  scrollbar: {
    track: string;
    thumb: string;
    thumbHover: string;
  };
}

export const themes: Record<ThemeName, Theme> = {
  classic: {
    name: "Classic Blue",
    isDark: false,
    background: "bg-gradient-to-br from-blue-50 to-indigo-100",
    navbar: "bg-white border-blue-200",
    cards: "bg-white",
    text: "text-gray-800",
    sidebarText: "text-gray-800",
    tableHeaderBg: "bg-blue-100",
    borderColor: "border-blue-gray-100",
    hoverBg: "hover:bg-blue-50",
    activeRowBg: "bg-blue-50",
    scrollbar: {
      track: "#e5e7eb",
      thumb: "#9ca3af",
      thumbHover: "#6b7280",
    },
  },
  sunset: {
    name: "Sunset Orange",
    isDark: false,
    background: "bg-gradient-to-br from-orange-50 to-red-100",
    navbar: "bg-white border-orange-200",
    cards: "bg-white",
    text: "text-gray-800",
    sidebarText: "text-gray-800",
    tableHeaderBg: "bg-orange-100",
    borderColor: "border-orange-200",
    hoverBg: "hover:bg-orange-50",
    activeRowBg: "bg-orange-50",
    scrollbar: {
      track: "#fed7aa",
      thumb: "#fb923c",
      thumbHover: "#ea580c",
    },
  },
  dark: {
    name: "Dark Mode",
    isDark: true,
    background: "bg-gradient-to-br from-gray-900 to-gray-800",
    navbar: "bg-gray-800 border-gray-700",
    cards: "bg-gray-800",
    text: "text-white",
    sidebarText: "text-white",
    tableHeaderBg: "bg-gray-700",
    borderColor: "border-gray-700",
    hoverBg: "hover:bg-gray-700",
    activeRowBg: "bg-gray-700",
    scrollbar: {
      track: "#374151",
      thumb: "#6b7280",
      thumbHover: "#9ca3af",
    },
  },
};
