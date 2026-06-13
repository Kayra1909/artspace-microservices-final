import { BrowserRouter, Routes, Route } from 'react-router-dom'
import Navbar from './components/Navbar'
import HomePage from './pages/HomePage'
import LoginPage from './pages/LoginPage'
import RegisterPage from './pages/RegisterPage'
import ArtworkDetailPage from './pages/ArtworkDetailPage'
import NotificationsPage from './pages/NotificationsPage'
import RequestsPage from './pages/RequestsPage'
import RequestDetailPage from './pages/RequestDetailPage'
import ReferenceDetailPage from './pages/ReferenceDetailPage'
import ProfilePage from './pages/ProfilePage'

export default function App() {
  return (
    <BrowserRouter>
      <Navbar />
      <main className="page-container">
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/register" element={<RegisterPage />} />
          <Route path="/artworks/:id" element={<ArtworkDetailPage />} />
          <Route path="/notifications" element={<NotificationsPage />} />
          <Route path="/requests" element={<RequestsPage />} />
          <Route path="/requests/:id" element={<RequestDetailPage />} />
          <Route path="/users/:username" element={<ProfilePage />} />
          <Route path="/artists/:username" element={<ProfilePage />} />
          <Route path="/artists/:username/references/:id" element={<ReferenceDetailPage />} />
        </Routes>
      </main>
    </BrowserRouter>
  )
}
