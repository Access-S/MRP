// src/contexts/ThemeContext.tsx

import React, {
  createContext,
  useState,
  useContext,
  useMemo,
  useEffect,
} from "react";
import { themes, ThemeName, Theme } from "../styles/themes";

interface ThemeContextType {
  themeName: ThemeName;
  setThemeName: (name: ThemeName) => void;
  theme: Theme;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({
  children,
}) => {
  const [themeName, setThemeName] = useState<ThemeName>("classic");

  // Dynamically inject scrollbar styles into the document head
  useEffect(() => {
    const currentTheme = themes[themeName];
    if (!currentTheme || !currentTheme.scrollbar) {
      return;
    }
    const styleId = "dynamic-scrollbar-styles";
    let styleTag = document.getElementById(styleId);

    if (!styleTag) {
      styleTag = document.createElement("style");
      styleTag.id = styleId;
      document.head.appendChild(styleTag);
    }

    styleTag.innerHTML = `
      .drawer-content::-webkit-scrollbar {
        width: 6px;
      }
      .drawer-content::-webkit-scrollbar-track {
        background: ${currentTheme.scrollbar.track};
      }
      .drawer-content::-webkit-scrollbar-thumb {
        background: ${currentTheme.scrollbar.thumb};
        border-radius: 3px;
      }
      .drawer-content::-webkit-scrollbar-thumb:hover {
        background: ${currentTheme.scrollbar.thumbHover};
      }
      /* For Firefox */
      .drawer-content {
        scrollbar-width: thin;
        scrollbar-color: ${currentTheme.scrollbar.thumb} ${currentTheme.scrollbar.track};
      }
    `;
  }, [themeName]);

  const theme = useMemo(() => themes[themeName], [themeName]);

  const value = {
    themeName,
    setThemeName,
    theme,
  };

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
};

export const useTheme = () => {
  const context = useContext(ThemeContext);
  if (context === undefined) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};
