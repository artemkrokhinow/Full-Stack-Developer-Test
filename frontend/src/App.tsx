import { useState, useEffect } from 'react';
import Navbar from './components/Navbar';
import CatalogPage from './pages/CatalogPage';
import ProductPage from './pages/ProductPage';
import AuthPage from './pages/AuthPage';
import SuccessPage from './pages/SuccessPage';
import TestDropPage from './pages/TestDropPage';
import CartPage from './pages/CartPage';
import { api, clearAuthToken } from './services/api';
import type { Product, UserProfile } from './services/api';

type Page = 'catalog' | 'product-detail' | 'auth' | 'success' | 'test-drop' | 'cart';

export function App() {
  const [currentPage, setCurrentPage] = useState<Page>('catalog');
  const [selectedProductId, setSelectedProductId] = useState<string | null>(null);
  
  // Auth state
  const [user, setUser] = useState<UserProfile | null>(null);

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
            setUser(userProfile);
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

  const handleLogin = (authenticatedUser: UserProfile) => {
    setUser(authenticatedUser);
    // Refresh products catalog
    fetchProducts();
    // Redirect to catalog after login
    setCurrentPage('catalog');
  };

  const handleLogout = () => {
    setUser(null);
    clearAuthToken();
  };

  const handleCheckoutSuccess = async () => {
    fetchProducts();
    if (user?.id) {
      try {
        const userProfile = await api.getMe();
        setUser(userProfile);
      } catch (e) {
        console.error(e);
      }
    }
    setCurrentPage('success');
  };



  return (
    <div className="app-container">
      {/* Universal Navigation Header */}
      <Navbar
        currentPage={currentPage}
        setCurrentPage={(page: string) => setCurrentPage(page as Page)}
        cartCount={user?.reservations?.length || 0}
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
                onReserveSuccess={async () => {
                  if (user?.id) {
                    try {
                      const userProfile = await api.getMe();
                      setUser(userProfile);
                    } catch (e) {
                      console.error(e);
                    }
                  }
                }}
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

            {currentPage === 'cart' && (
              <CartPage
                reservations={user?.reservations || []}
                onBack={() => setCurrentPage('catalog')}
                onCheckoutSuccess={handleCheckoutSuccess}
              />
            )}

            {currentPage === 'test-drop' && (
              <TestDropPage
                products={products}
                onBack={() => {
                  fetchProducts();
                  setCurrentPage('catalog');
                }}
              />
            )}
          </>
        )}
      </main>
    </div>
  );
}

export default App;
