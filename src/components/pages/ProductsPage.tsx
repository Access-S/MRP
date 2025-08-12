// BLOCK 1: Imports
import React, { useState, useEffect, useMemo } from "react";
import {
  Card, Typography, CardBody, Spinner, Input, IconButton
} from "@material-tailwind/react";
import { Product } from "../../types/mrp.types";
import { fetchAllProducts } from "../../services/api.service";
import { useTheme } from "../../contexts/ThemeContext";
import { MagnifyingGlassIcon, ArrowTopRightOnSquareIcon } from "@heroicons/react/24/outline";
import { BomDetailModal } from "../modals/BomDetailModal"; // <-- Import the new modal
// BLOCK 2: Main ProductsPage Component
export function ProductsPage() {
  const { theme } = useTheme();
  const [products, setProducts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [productToView, setProductToView] = useState<any | null>(null);
  const [isBomModalOpen, setIsBomModalOpen] = useState(false);

  const TABLE_HEAD = ["View", "Product Code", "Description", "Hourly Run Rate"];

  useEffect(() => {
    setLoading(true);
    fetchAllProducts()
      .then(fetchedProducts => setProducts(fetchedProducts))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  const filteredProducts = useMemo(() => {
    if (!searchQuery) return products;
    const lowercasedQuery = searchQuery.toLowerCase();
    return products.filter(
      (product) =>
        product.product_code.toLowerCase().includes(lowercasedQuery) ||
        product.description.toLowerCase().includes(lowercasedQuery)
    );
  }, [products, searchQuery]);

  const handleOpenBomModal = (product: any | null) => {
    setProductToView(product);
    setIsBomModalOpen(!!product);
  };

  if (loading) {
    return (<div className="flex justify-center items-center h-64"><Spinner className="h-12 w-12" /></div>);
  }

  return (
    <>
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
        <CardBody className="overflow-x-auto p-0">
          <div className={`border-2 ${theme.borderColor} rounded-lg m-4`}>
            <table className="w-full min-w-max table-auto text-left">
              <thead className={`border-b-2 ${theme.borderColor}`}>
                <tr>
                  {TABLE_HEAD.map((head, index) => {
                    // --- HEADER CELLS HAVE SPACIOUS PADDING (p-4) ---
                    let thClasses = `${theme.tableHeaderBg} p-4 text-center`; 
                    if (index < TABLE_HEAD.length - 1) {
                      thClasses += ` border-r ${theme.borderColor}`;
                    }
                    if (head === "Description") {
                        thClasses = thClasses.replace('text-center', 'text-center');
                    }
                    return (
                      <th key={head} className={thClasses}>
                        <Typography variant="small" className={`font-semibold leading-none ${theme.text}`}>
                          {head}
                        </Typography>
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  // --- BODY CELLS HAVE TIGHT PADDING (p-2) ---
                  const getCellClasses = (isLast = false, align = 'center') => {
                    let classes = `p-1 border-b ${theme.borderColor} text-${align}`; // Use p-2 for tight rows
                    if (!isLast) {
                      classes += ` border-r`;
                    }
                    return classes;
                  };
                  return (
                    <tr key={product.id} className={theme.hoverBg}>
                      <td className={getCellClasses()}>
                        <IconButton variant="text" size="sm" onClick={() => handleOpenBomModal(product)}>
                          <ArrowTopRightOnSquareIcon className={`h-5 w-5 ${theme.text}`} />
                        </IconButton>
                      </td>
                      <td className={getCellClasses()}><Typography variant="small" className={`font-bold ${theme.text}`}>{product.product_code}</Typography></td>
                      <td className={getCellClasses(false, 'left')}><Typography variant="small" className={`font-normal ${theme.text}`}>{product.description}</Typography></td>
                      <td className={getCellClasses(true)}><Typography variant="small" className={`font-normal ${theme.text}`}>{product.hourly_run_rate ? Number(product.hourly_run_rate).toFixed(2) : "N/A"}</Typography></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          {filteredProducts.length === 0 && !loading && (
            <div className="text-center p-8">
              <Typography color="gray" className={theme.text}>
                No products found matching "{searchQuery}"
              </Typography>
            </div>
          )}
        </CardBody>
      </Card>
      
      <BomDetailModal
        open={isBomModalOpen}
        handleOpen={() => handleOpenBomModal(null)}
        product={productToView}
      />
    </>
  );
}