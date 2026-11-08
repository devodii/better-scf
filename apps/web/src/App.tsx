import { Demo } from "./components/Demo";
import { Features } from "./components/Features";
import { Footer } from "./components/Footer";
import { Gallery } from "./components/Gallery";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";

export function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Demo />
        <Features />
        <Gallery />
      </main>
      <Footer />
    </>
  );
}
