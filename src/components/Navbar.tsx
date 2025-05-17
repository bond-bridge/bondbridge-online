import { ModeToggle } from "./ModeToggle";

const Navbar: React.FC = () => {
    return (
        <nav className="bg-background border-b border-border">
            <div className="mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex justify-between h-16 items-center">
                    <div className="flex items-center">
                        <a href="/" className="flex items-center gap-2">
                            <div>
                                <img src="/logo.png" alt="Bond Bridge" className="h-8 w-8" />
                            </div>
                            <h2 className="text-2xl font-extrabold grad">BondBridge</h2>
                        </a>
                    </div>

                    <div className="flex items-center gap-2">
                        <ModeToggle />
                        {/* Mobile menu button
                        <div className="flex items-center md:hidden">
                            <button className="inline-flex items-center justify-center p-2 rounded-md text-muted-foreground hover:text-foreground hover:bg-secondary">
                                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
                                </svg>
                            </button>
                        </div> */}
                    </div>
                </div>
            </div>

            {/* Mobile menu panel */}
            <div className="hidden md:hidden">
                <div className="px-2 pt-2 pb-3 space-y-1">
                    <a href="/about" className="block px-3 py-2 text-gray-500 hover:text-gray-900">About</a>
                    <a href="/services" className="block px-3 py-2 text-gray-500 hover:text-gray-900">Services</a>
                    <a href="/contact" className="block px-3 py-2 text-gray-500 hover:text-gray-900">Contact</a>
                </div>
            </div>
        </nav>
    )
}

export default Navbar;
