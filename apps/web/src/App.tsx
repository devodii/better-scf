import { Features } from "./components/Features";
import { Footer } from "./components/Footer";
import { Header } from "./components/Header";
import { Hero } from "./components/Hero";
import { Showcase } from "./components/Showcase";

export function App() {
  return (
    <>
      <Header />
      <main>
        <Hero />
        <Showcase />
        <Features />
      </main>
      <Footer />
    </>
  );
}
