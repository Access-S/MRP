// BLOCK 1: Type Definitions
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
  buttonText: string;
  chip: {
    blueGray: string;
    red: string;
    blue: string;
    green: string;
  };
  scrollbar: {
    track: string;
    thumb: string;
    thumbHover: string;
  };
}

// BLOCK 2: Theme Definitions
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
    borderColor: "border-gray-800", // <-- THIS WAS THE BORDER COLOR FIX
    hoverBg: "hover:bg-blue-50",
    activeRowBg: "bg-blue-50",
    buttonText: "text-gray-600",
    chip: {
      blueGray: "bg-blue-gray-100 text-blue-gray-800",
      red: "bg-red-100 text-red-800",
      blue: "bg-blue-100 text-blue-800",
      green: "bg-green-100 text-green-800",
    },
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
    borderColor: "border-orange-800",
    hoverBg: "hover:bg-orange-50",
    activeRowBg: "bg-orange-50",
    buttonText: "text-gray-600",
    chip: {
      blueGray: "bg-blue-gray-100 text-blue-gray-800",
      red: "bg-red-100 text-red-800",
      blue: "bg-orange-100 text-orange-800",
      green: "bg-green-100 text-green-800",
    },
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
    text: "text-gray-200",
    sidebarText: "text-white",
    tableHeaderBg: "bg-gray-700",
    borderColor: "border-gray-600",
    hoverBg: "hover:bg-gray-700",
    activeRowBg: "bg-gray-700",
    buttonText: "text-gray-300 hover:text-white",
    chip: {
      blueGray: "bg-gray-600 text-gray-100",
      red: "bg-red-800 text-red-100",
      blue: "bg-blue-800 text-blue-100",
      green: "bg-green-800 text-green-100",
    },
    scrollbar: {
      track: "#374151",
      thumb: "#6b7280",
      thumbHover: "#9ca3af",
    },
  },
};