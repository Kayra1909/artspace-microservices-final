import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ArtworksPage from './pages/ArtworksPage'
import ArtworkDetailPage from './pages/ArtworkDetailPage'
import NotificationsPage from './pages/NotificationsPage'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/artworks" element={<ArtworksPage />} />
          <Route path="/artworks/:id" element={<ArtworkDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
