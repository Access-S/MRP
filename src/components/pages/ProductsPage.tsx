// BLOCK 1: Imports
import React, { useState, useEffect, useMemo } from "react";
import {
  Card,
  Typography,
  CardBody,
  Spinner,
  Collapse,
  Input,
} from "@material-tailwind/react";
import { Product, BomComponent } from "../../types/mrp.types";
import { getAllProducts } from "../../services/product.service";
import { useTheme } from "../../contexts/ThemeContext";
import { MagnifyingGlassIcon } from "@heroicons/react/24/outline";

// BLOCK 2: BomDetailsRow Component
const BomDetailsRow = ({
  components,
  isVisible,
  theme,
}: {
  components: BomComponent[];
  isVisible: boolean;
  theme: any;
}) => {
  const subRowClass = theme.isDark ? "bg-gray-800" : "bg-blue-gray-50/50";
  const TABLE_HEAD = ["Part Code", "Description", "Part Type", "Qty / Shipper"];

  return (
    <tr>
      {/* Adjusted colSpan to 4 to match the main table */}
      <td colSpan={4} className="p-0">
        <Collapse open={isVisible}>
          <div className={`p-4 ${subRowClass}`}>
            <Typography variant="h6" className={`mb-2 ${theme.text}`}>
              Bill of Materials
            </Typography>
            <div
              className={`border rounded-lg ${theme.borderColor} overflow-hidden`}
            >
              <table className="min-w-full">
                <thead className={theme.tableHeaderBg}>
                  <tr>
                    <th className="p-3 text-left uppercase tracking-wider rounded-tl-lg">
                      <Typography
                        variant="small"
                        className={`font-semibold text-sm ${theme.text}`}
                      >
                        Part Code
                      </Typography>
                    </th>
                    <th className="p-3 text-left uppercase tracking-wider">
                      <Typography
                        variant="small"
                        className={`font-semibold text-sm ${theme.text}`}
                      >
                        Description
                      </Typography>
                    </th>
                    <th className="p-3 text-left uppercase tracking-wider">
                      <Typography
                        variant="small"
                        className={`font-semibold text-sm ${theme.text}`}
                      >
                        Part Type
                      </Typography>
                    </th>
                    <th className="p-3 text-center uppercase tracking-wider rounded-tr-lg">
                      <Typography
                        variant="small"
                        className={`font-semibold text-sm ${theme.text}`}
                      >
                        Qty / Shipper
                      </Typography>
                    </th>
                  </tr>
                </thead>
                <tbody
                  className={
                    theme.isDark
                      ? "divide-y divide-gray-700"
                      : "divide-y divide-gray-200"
                  }
                >
                  {components.map((comp) => (
                    <tr key={comp.partCode}>
                      <td className="p-3 whitespace-nowrap">
                        <Typography
                          variant="small"
                          className={`font-mono ${theme.text}`}
                        >
                          {comp.partCode}
                        </Typography>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Typography variant="small" className={theme.text}>
                          {comp.partDescription}
                        </Typography>
                      </td>
                      <td className="p-3 whitespace-nowrap">
                        <Typography
                          variant="small"
                          className={`${theme.text} opacity-80`}
                        >
                          {comp.partType}
                        </Typography>
                      </td>
                      <td className="p-3 whitespace-nowrap text-center">
                        <Typography
                          variant="small"
                          className={`font-semibold ${theme.text}`}
                        >
                          {comp.perShipper}
                        </Typography>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </Collapse>
      </td>
    </tr>
  );
};

// BLOCK 3: Main ProductsPage Component
export function ProductsPage() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [openRow, setOpenRow] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const TABLE_HEAD = [
    "Product Code",
    "Description",
    "Hourly Run Rate",
    "Components",
  ];

  useEffect(() => {
    const fetchProducts = async () => {
      setLoading(true);
      const fetchedProducts = await getAllProducts();
      setProducts(fetchedProducts);
      setLoading(false);
    };
    fetchProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowercasedQuery = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.productCode.toLowerCase().includes(lowercasedQuery) ||
        product.description.toLowerCase().includes(lowercasedQuery)
    );
  }, [products, searchQuery]);

  const handleRowToggle = (productId: string) => {
    setOpenRow(openRow === productId ? null : productId);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-64">
        <Spinner className="h-12 w-12" color="blue" />
        <Typography className={`ml-4 ${theme.text}`}>
          Loading Products...
        </Typography>
      </div>
    );
  }

  return (
    <Card className={`h-full w-full ${theme.cards} shadow-sm`}>
      <div className={`p-4 border-b ${theme.borderColor}`}>
        <Input
          label="Search by Product Code or Description"
          icon={<MagnifyingGlassIcon className="h-5 w-5" />}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          color={theme.isDark ? "white" : "black"}
        />
      </div>

      <CardBody className="overflow-x-auto px-0">
        <table className="w-full min-w-max table-auto text-left">
          <thead>
            <tr>
              {TABLE_HEAD.map((head, index) => {
                const isLast = index === TABLE_HEAD.length - 1;
                const isFirst = index === 0;
                const cornerClasses = `${isFirst ? "rounded-tl-lg" : ""} ${
                  isLast ? "rounded-tr-lg" : ""
                }`;
                const borderClass = isLast
                  ? ""
                  : `border-r ${theme.borderColor}`;
                const alignmentClass =
                  head === "Hourly Run Rate" || head === "Components"
                    ? "text-center"
                    : "text-left";
                return (
                  <th
                    key={head}
                    className={`border-b-2 ${theme.borderColor} ${theme.tableHeaderBg} p-4 ${cornerClasses} ${borderClass} ${alignmentClass}`}
                  >
                    <Typography
                      variant="h6"
                      className={`uppercase tracking-wider font-semibold text-sm ${theme.text}`}
                    >
                      {head}
                    </Typography>
                  </th>
                );
              })}
            </tr>
          </thead>

          <tbody>
            {filteredProducts.map((product) => {
              const {
                id,
                productCode,
                description,
                components,
                hourlyRunRate,
              } = product;
              const isRowOpen = openRow === id;
              const openRowBgClass = theme.activeRowBg;
              const hoverBgClass = theme.hoverBg;

              return (
                <React.Fragment key={id}>
                  <tr
                    className={`cursor-pointer ${
                      isRowOpen ? openRowBgClass : hoverBgClass
                    }`}
                    onClick={() => handleRowToggle(id)}
                  >
                    <td
                      className={`p-4 border-b ${theme.borderColor} text-left rounded-l-lg`}
                    >
                      <Typography
                        variant="small"
                        className={`font-bold ${theme.text}`}
                      >
                        {productCode}
                      </Typography>
                    </td>
                    <td
                      className={`p-4 border-b ${theme.borderColor} text-left`}
                    >
                      <Typography
                        variant="small"
                        className={`font-normal ${theme.text}`}
                      >
                        {description}
                      </Typography>
                    </td>
                    <td
                      className={`p-4 border-b ${theme.borderColor} text-right`}
                    >
                      <Typography
                        variant="small"
                        className={`font-normal ${theme.text}`}
                      >
                        {hourlyRunRate ? hourlyRunRate.toFixed(2) : "N/A"}
                      </Typography>
                    </td>
                    <td
                      className={`p-4 border-b ${theme.borderColor} text-center rounded-r-lg`}
                    >
                      <div className="flex items-center justify-center gap-1">
                        <span
                          className={`inline-block w-2.5 h-2.5 ${
                            components.length > 2
                              ? "bg-blue-500"
                              : "bg-gray-400"
                          } rounded-full`}
                        ></span>
                        <Typography
                          variant="small"
                          className={`font-normal ${theme.text}`}
                        >
                          {components.length} Items
                        </Typography>
                      </div>
                    </td>
                  </tr>
                  <BomDetailsRow
                    components={components}
                    isVisible={isRowOpen}
                    theme={theme}
                  />
                </React.Fragment>
              );
            })}
          </tbody>
        </table>
        {filteredProducts.length === 0 && !loading && (
          <div className="text-center p-8">
            <Typography color="gray" className={theme.text}>
              No products found matching "{searchQuery}"
            </Typography>
          </div>
        )}
      </CardBody>
    </Card>
  );
}
