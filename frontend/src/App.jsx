import { useAuth } from '@clerk/clerk-react'
import { Routes, Route, Navigate } from 'react-router-dom'
import PageLoader from './components/PageLoader.jsx'
import Layout from './components/Layout.jsx'
import HomePage from './pages/HomePage.jsx'
import CartPage from './pages/CartPage.jsx'
import OrdersPage from './pages/OrdersPage.jsx'
import OrderDetailPage from './pages/OrderDetailPage.jsx'
import OrderSummaryPage from './pages/OrderSummaryPage.jsx'
import OrderVideoPage from './pages/OrderVideoPage.jsx'
import OrderChatPage from './pages/OrderChatPage.jsx'
import ProductDetailPage from './pages/ProductDetailPage.jsx'
import CheckoutReturnPage from './pages/CheckoutReturnPage.jsx'
import AdminProductsPage from './pages/AdminProductsPage.jsx'
import { SentryDemoPage } from './pages/SentryDemoPage.jsx'
import './App.css'

function App() {
  const { isLoaded } = useAuth()
  if (!isLoaded) return <PageLoader />

  return (
    <Layout>
      <Routes>
        <Route path="/" element={<HomePage />} />
        <Route path="/cart" element={<CartPage />} />
        <Route path="/orders" element={<OrdersPage />} />
        <Route path="/orders/:id" element={<OrderDetailPage />}>
          <Route index element={<OrderSummaryPage />} />
          <Route path="summary" element={<OrderSummaryPage />} />
          <Route path="chat" element={<OrderChatPage />} />
          <Route path="video" element={<OrderVideoPage />} />
          <Route path="call" element={<Navigate to="video" replace />} />
        </Route>
        <Route path="/product/:slug" element={<ProductDetailPage />} />
        <Route path="/checkout-return" element={<CheckoutReturnPage />} />
        <Route path="/admin" element={<AdminProductsPage />} />
        <Route path="/sentry-demo" element={<SentryDemoPage />} />
      </Routes>
    </Layout>
  )
}

export default App
