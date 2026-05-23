export default function Footer() {
  return (
    <footer className="border-t border-white/10 bg-black/40 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-4 text-xs text-white/40">
        
        {/* Left side */}
        <p>
          © {new Date().getFullYear()} Dinakar Raju. All rights reserved.
        </p>

        {/* Right side */}
        <p className="text-white/30">
          Built with ❤️ using Next.js
        </p>
      </div>
    </footer>
  );
}