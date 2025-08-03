// BLOCK 1: Imports
import React, { useState } from "react";
import {
  IconButton,
  Typography,
  List,
  ListItem,
  ListItemPrefix,
  Accordion,
  AccordionHeader,
  AccordionBody,
  Drawer,
  Card,
} from "@material-tailwind/react";
import {
  PresentationChartBarIcon,
  UserCircleIcon,
  Cog6ToothIcon,
  PowerIcon,
  PaintBrushIcon,
} from "@heroicons/react/24/solid";
import {
  ChevronRightIcon,
  ChevronDownIcon,
  Bars3Icon,
  XMarkIcon,
  ShoppingBagIcon,
  ArchiveBoxIcon,
  CubeIcon,
  ServerStackIcon,
  ChartBarSquareIcon,
  ClipboardDocumentListIcon,
  ChartPieIcon,
  DocumentTextIcon,
} from "@heroicons/react/24/outline";
import { useTheme } from "../contexts/ThemeContext";
import { themes } from "../styles/themes";
import { Page } from "../App";

// BLOCK 2: Component Definition and Props
export function Sidebar({
  activePage,
  setActivePage,
}: {
  activePage: Page;
  setActivePage: (page: Page) => void;
}) {
  // BLOCK 3: State Management and Handlers
  const [open, setOpen] = useState("");
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const { theme, themeName, setThemeName } = useTheme();

  const handleOpen = (value: string) => {
    setOpen(open === value ? "" : value);
  };

  const handleSettingsOpen = () => {
    setSettingsOpen((cur) => !cur);
  };

  const openDrawer = () => setIsDrawerOpen(true);
  const closeDrawer = () => setIsDrawerOpen(false);

  // BLOCK 4: Render Logic - Main Structure
  return (
    <>
      <IconButton
        variant="text"
        size="lg"
        onClick={openDrawer}
        className={theme.text}
        aria-label="Open sidebar"
      >
        {isDrawerOpen ? (
          <XMarkIcon className="h-8 w-8 stroke-2" />
        ) : (
          <Bars3Icon className="h-8 w-8 stroke-2" />
        )}
      </IconButton>
      <Drawer open={isDrawerOpen} onClose={closeDrawer}>
        <div className={`h-full w-full ${theme.cards} overflow-hidden`}>
          <Card
            color="transparent"
            shadow={false}
            className={`h-full w-full p-4 ${theme.cards} flex flex-col overflow-y-auto rounded-none drawer-content`}
          >
            <div className="mb-6 flex items-center gap-4 p-4">
              <img
                src="https://docs.material-tailwind.com/img/logo-ct-dark.png"
                alt="brand"
                className="h-8 w-8"
              />
              <Typography variant="h5" className={theme.sidebarText}>
                Dashboard
              </Typography>
            </div>

            {/* BLOCK 5: Main Menu Items */}
            <div className="flex-1">
              <List className={theme.sidebarText}>
                {/* Dashboard Link */}
                <ListItem
                  onClick={() => {
                    setActivePage("dashboard");
                    closeDrawer();
                  }}
                  selected={activePage === "dashboard"}
                >
                  <ListItemPrefix>
                    <PresentationChartBarIcon
                      className={`h-5 w-5 ${theme.sidebarText}`}
                    />
                  </ListItemPrefix>
                  <Typography
                    className={`mr-auto font-normal ${theme.sidebarText}`}
                  >
                    Dashboard
                  </Typography>
                </ListItem>

                {/* Operations Accordion */}
                <Accordion
                  open={open === "operations"}
                  icon={
                    <ChevronDownIcon
                      strokeWidth={2.5}
                      className={`mx-auto h-4 w-4 transition-transform ${
                        open === "operations" ? "rotate-180" : ""
                      }`}
                    />
                  }
                >
                  <ListItem className="p-0" selected={open === "operations"}>
                    <AccordionHeader
                      onClick={() => handleOpen("operations")}
                      className="border-b-0 p-3"
                    >
                      <ListItemPrefix>
                        <Cog6ToothIcon
                          className={`h-5 w-5 ${theme.sidebarText}`}
                        />
                      </ListItemPrefix>
                      <Typography
                        className={`mr-auto font-normal ${theme.sidebarText}`}
                      >
                        Operations
                      </Typography>
                    </AccordionHeader>
                  </ListItem>
                  <AccordionBody className="py-1">
                    <List className="p-0 pl-4">
                      <ListItem
                        onClick={() => {
                          setActivePage("purchase-orders");
                          closeDrawer();
                        }}
                        selected={activePage === "purchase-orders"}
                      >
                        <ListItemPrefix>
                          <ShoppingBagIcon
                            className={`h-4 w-4 ${theme.sidebarText}`}
                          />
                        </ListItemPrefix>
                        Purchase Orders
                      </ListItem>
                      <ListItem
                        onClick={() => {
                          setActivePage("inventory");
                          closeDrawer();
                        }}
                        selected={activePage === "inventory"}
                      >
                        <ListItemPrefix>
                          <ArchiveBoxIcon
                            className={`h-4 w-4 ${theme.sidebarText}`}
                          />
                        </ListItemPrefix>
                        Inventory
                      </ListItem>
                    </List>
                  </AccordionBody>
                </Accordion>

                {/* Insights & Reporting Accordion */}
                <Accordion
                  open={open === "insights"}
                  icon={
                    <ChevronDownIcon
                      strokeWidth={2.5}
                      className={`mx-auto h-4 w-4 transition-transform ${
                        open === "insights" ? "rotate-180" : ""
                      }`}
                    />
                  }
                >
                  <ListItem className="p-0" selected={open === "insights"}>
                    <AccordionHeader
                      onClick={() => handleOpen("insights")}
                      className="border-b-0 p-3"
                    >
                      <ListItemPrefix>
                        <ChartPieIcon
                          className={`h-5 w-5 ${theme.sidebarText}`}
                        />
                      </ListItemPrefix>
                      <Typography
                        className={`mr-auto font-normal ${theme.sidebarText}`}
                      >
                        Insights & Reporting
                      </Typography>
                    </AccordionHeader>
                  </ListItem>
                  <AccordionBody className="py-1">
                    <List className="p-0 pl-4">
                      <ListItem
                        onClick={() => {
                          setActivePage("analytics");
                          closeDrawer();
                        }}
                        selected={activePage === "analytics"}
                        disabled
                      >
                        <ListItemPrefix>
                          <ChartBarSquareIcon
                            className={`h-4 w-4 ${theme.sidebarText}`}
                          />
                        </ListItemPrefix>
                        Analytics
                      </ListItem>
                      <ListItem
                        onClick={() => {
                          setActivePage("reporting");
                          closeDrawer();
                        }}
                        selected={activePage === "reporting"}
                        disabled
                      >
                        <ListItemPrefix>
                          <DocumentTextIcon
                            className={`h-4 w-4 ${theme.sidebarText}`}
                          />
                        </ListItemPrefix>
                        Reporting
                      </ListItem>
                    </List>
                  </AccordionBody>
                </Accordion>

                {/* System Data Accordion */}
                <Accordion
                  open={open === "system-data"}
                  icon={
                    <ChevronDownIcon
                      strokeWidth={2.5}
                      className={`mx-auto h-4 w-4 transition-transform ${
                        open === "system-data" ? "rotate-180" : ""
                      }`}
                    />
                  }
                >
                  <ListItem className="p-0" selected={open === "system-data"}>
                    <AccordionHeader
                      onClick={() => handleOpen("system-data")}
                      className="border-b-0 p-3"
                    >
                      <ListItemPrefix>
                        <ServerStackIcon
                          className={`h-5 w-5 ${theme.sidebarText}`}
                        />
                      </ListItemPrefix>
                      <Typography
                        className={`mr-auto font-normal ${theme.sidebarText}`}
                      >
                        System Data
                      </Typography>
                    </AccordionHeader>
                  </ListItem>
                  <AccordionBody className="py-1">
                    <List className="p-0 pl-4">
                      <ListItem
                        onClick={() => {
                          setActivePage("products");
                          closeDrawer();
                        }}
                        selected={activePage === "products"}
                      >
                        <ListItemPrefix>
                          <CubeIcon
                            className={`h-4 w-4 ${theme.sidebarText}`}
                          />
                        </ListItemPrefix>
                        Products (BOM)
                      </ListItem>
                      <ListItem
                        onClick={() => {
                          setActivePage("forecasts");
                          closeDrawer();
                        }}
                        selected={activePage === "forecasts"}
                      >
                        <ListItemPrefix>
                          <ChartBarSquareIcon
                            className={`h-4 w-4 ${theme.sidebarText}`}
                          />
                        </ListItemPrefix>
                        Forecasts
                      </ListItem>
                      <ListItem
                        onClick={() => {
                          setActivePage("soh");
                          closeDrawer();
                        }}
                        selected={activePage === "soh"}
                      >
                        <ListItemPrefix>
                          <ClipboardDocumentListIcon
                            className={`h-4 w-4 ${theme.sidebarText}`}
                          />
                        </ListItemPrefix>
                        Stock on Hand
                      </ListItem>
                    </List>
                  </AccordionBody>
                </Accordion>
              </List>
            </div>

            {/* BLOCK 6: Bottom Menu Items (Profile, Settings, Logout) */}
            <div className="mt-auto">
              <hr className="my-4 border-gray-300" />
              <List className={theme.sidebarText}>
                <ListItem className={theme.sidebarText}>
                  <ListItemPrefix>
                    <UserCircleIcon
                      className={`h-5 w-5 ${theme.sidebarText}`}
                    />
                  </ListItemPrefix>
                  Profile
                </ListItem>

                <Accordion
                  open={open === "settings"}
                  icon={
                    <ChevronDownIcon
                      strokeWidth={2.5}
                      className={`mx-auto h-4 w-4 transition-transform ${
                        open === "settings" ? "rotate-180" : ""
                      }`}
                    />
                  }
                >
                  <ListItem className="p-0" selected={open === "settings"}>
                    <AccordionHeader
                      onClick={() => handleOpen("settings")}
                      className="border-b-0 p-3"
                    >
                      <ListItemPrefix>
                        <Cog6ToothIcon
                          className={`h-5 w-5 ${theme.sidebarText}`}
                        />
                      </ListItemPrefix>
                      <Typography
                        className={`mr-auto font-normal ${theme.sidebarText}`}
                      >
                        Settings
                      </Typography>
                    </AccordionHeader>
                  </ListItem>
                  <AccordionBody className="py-1">
                    <List className="p-0">
                      {["General", "Notifications"].map((item) => (
                        <ListItem key={item} className={theme.sidebarText}>
                          <ListItemPrefix>
                            <ChevronRightIcon
                              strokeWidth={3}
                              className={`h-3 w-5 ${theme.sidebarText}`}
                            />
                          </ListItemPrefix>
                          {item}
                        </ListItem>
                      ))}

                      <Accordion
                        open={settingsOpen}
                        icon={
                          <ChevronDownIcon
                            strokeWidth={2.5}
                            className={`mx-auto h-3 w-3 transition-transform ${
                              settingsOpen ? "rotate-180" : ""
                            }`}
                          />
                        }
                      >
                        <ListItem className="p-0 pl-4" selected={settingsOpen}>
                          <AccordionHeader
                            onClick={handleSettingsOpen}
                            className="border-b-0 p-2"
                          >
                            <ListItemPrefix>
                              <PaintBrushIcon
                                className={`h-4 w-4 ${theme.sidebarText}`}
                              />
                            </ListItemPrefix>
                            <Typography
                              className={`mr-auto font-normal text-sm ${theme.sidebarText}`}
                            >
                              Themes
                            </Typography>
                          </AccordionHeader>
                        </ListItem>
                        <AccordionBody className="py-1">
                          <List className="p-0 pl-4">
                            {Object.entries(themes).map(
                              ([key, themeOption]) => (
                                <ListItem
                                  key={key}
                                  className={`${theme.sidebarText} pl-8 py-2 ${
                                    themeName === key
                                      ? theme.isDark
                                        ? "bg-gray-700"
                                        : theme.activeRowBg
                                      : ""
                                  }`}
                                  onClick={() =>
                                    setThemeName(key as keyof typeof themes)
                                  }
                                >
                                  <ListItemPrefix>
                                    <div
                                      className={`w-4 h-4 rounded-full flex items-center justify-center mr-2 border-2 ${
                                        theme.isDark
                                          ? "border-gray-400"
                                          : "border-gray-700"
                                      }`}
                                    >
                                      <div
                                        className={`w-2 h-2 rounded-full transition-transform duration-200 ease-in-out ${
                                          theme.isDark
                                            ? "bg-gray-200"
                                            : "bg-gray-800"
                                        } ${
                                          themeName === key
                                            ? "scale-100"
                                            : "scale-0"
                                        }`}
                                      ></div>
                                    </div>
                                  </ListItemPrefix>
                                  <Typography
                                    className={`text-xs ${theme.sidebarText} ${
                                      themeName === key ? "font-medium" : ""
                                    }`}
                                  >
                                    {themeOption.name}
                                  </Typography>
                                </ListItem>
                              )
                            )}
                          </List>
                        </AccordionBody>
                      </Accordion>

                      <ListItem className={theme.sidebarText}>
                        <ListItemPrefix>
                          <ChevronRightIcon
                            strokeWidth={3}
                            className={`h-3 w-5 ${theme.sidebarText}`}
                          />
                        </ListItemPrefix>
                        Privacy
                      </ListItem>
                    </List>
                  </AccordionBody>
                </Accordion>

                <ListItem className={theme.sidebarText}>
                  <ListItemPrefix>
                    <PowerIcon className={`h-5 w-5 ${theme.sidebarText}`} />
                  </ListItemPrefix>
                  Log Out
                </ListItem>
              </List>
            </div>
          </Card>
        </div>
      </Drawer>
    </>
  );
}
