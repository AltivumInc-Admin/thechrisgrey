import { Routes, Route } from 'react-router-dom';
import Navigation from './components/Navigation';
import Footer from './components/Footer';
import ScrollToTop from './components/ScrollToTop';
import Home from './pages/Home';
import About from './pages/About';
import Altivum from './pages/Altivum';
import Podcast from './pages/Podcast';
import Blog from './pages/Blog';
import BlogPost from './pages/BlogPost';
import Links from './pages/Links';
import Contact from './pages/Contact';
import BeyondTheAssessment from './pages/BeyondTheAssessment';

function App() {
  return (
    <div className="min-h-screen bg-altivum-dark">
      <ScrollToTop />
      <Navigation />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/about" element={<About />} />
        <Route path="/altivum" element={<Altivum />} />
        <Route path="/podcast" element={<Podcast />} />
        <Route path="/beyond-the-assessment" element={<BeyondTheAssessment />} />
        <Route path="/blog" element={<Blog />} />
        <Route path="/blog/:slug" element={<BlogPost />} />
        <Route path="/links" element={<Links />} />
        <Route path="/contact" element={<Contact />} />
      </Routes>
      <Footer />
    </div>
  );
}

export default App;
