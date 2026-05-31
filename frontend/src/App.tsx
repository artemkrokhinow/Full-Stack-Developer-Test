import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import AuthPage from './pages/AuthPage';
import SuccessPage from './pages/SuccessPage';
import { api } from './services/api';
import type { Product } from './services/api';

type Page = 'catalog' | 'product-detail' | 'auth' | 'success';

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Auth state
  const [user, setUser] = useState<{ id: string; email: string } | null>(null);

  // Products state
  const [products, setProducts] = useState<Product[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  // Refresh products list
  const fetchProducts = async () => {
    try {
      const data = await api.getProducts();
      setProducts(data);
    } catch (err) {
      console.error('Failed to fetch products:', err);
    } finally {
      setLoadingProducts(false);
    }
  };

  // Check auth and fetch products on mount
  useEffect(() => {
    let isMounted = true;
    const checkAuthAndLoad = async () => {
      const token = localStorage.getItem('token');
      if (token) {
        try {
          const userProfile = await api.getMe();
          if (isMounted) {
            setUser({ id: userProfile.id, email: userProfile.email });
          }
        } catch (e) {
          // Token expired or invalid
          localStorage.removeItem('token');
          if (isMounted) setUser(null);
        }
      }
      if (isMounted) await fetchProducts();
    };

    checkAuthAndLoad();
    return () => { isMounted = false; };
  }, []);

  const handleLogin = (authenticatedUser: { id: string; email: string }) => {
    setUser(authenticatedUser);
    // Refresh products catalog
    fetchProducts();
    // Redirect to catalog after login
    setCurrentPage('catalog');
  };

  const handleLogout = () => {
    setUser(null);
    localStorage.removeItem('token');
  };

  const handleCheckoutSuccess = () => {
    fetchProducts();
    setCurrentPage('success');
  };



  return (
    <div className="app-container">
      {/* Universal Navigation Header */}
      <Navbar
        currentPage={currentPage}
        setCurrentPage={(page: string) => setCurrentPage(page as Page)}
        cartCount={0}
        user={user}
        onLogout={handleLogout}
      />

      {/* State-based Page Router */}
      <main>
        {loadingProducts && currentPage === 'catalog' ? (
          <div className="glass-panel" style={{ textAlign: 'center', padding: '60px' }}>
            <div style={{ color: 'rgba(0,0,0,0.4)' }}>Loading product catalog...</div>
          </div>
        ) : (
          <>
            {currentPage === 'catalog' && (
              <CatalogPage
                products={products}
                onSelectProduct={(id) => {
                  setSelectedProductId(id);
                  setCurrentPage('product-detail');
                }}
              />
            )}

            {currentPage === 'product-detail' && selectedProductId && (
              <ProductPage
                productId={selectedProductId}
                products={products}
                onBack={() => setCurrentPage('catalog')}
                onCheckoutSuccess={handleCheckoutSuccess}
                isAuthenticated={!!user}
                onRedirectToLogin={() => setCurrentPage('auth')}
                userId={user?.id ?? null}
              />
            )}

            {currentPage === 'auth' && (
              <AuthPage onAuthSuccess={handleLogin} />
            )}

            {currentPage === 'success' && (
              <SuccessPage
                onGoToCatalog={() => {
                  fetchProducts();
                  setCurrentPage('catalog');
                }}
                userEmail={user?.email || ''}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
